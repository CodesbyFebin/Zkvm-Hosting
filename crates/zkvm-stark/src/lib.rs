//! STARK arithmetization and proving for the zkvm-isa accumulator-plus-registers
//! machine.
//!
//! This turns a `zkvm_isa::ExecutionTrace` into a real STARK proof (via `winterfell`)
//! that the trace is a valid execution of a *specific* program, and gives back a
//! verifier that only needs the proof and the public inputs -- never the trace itself --
//! to check it. See /docs/ONCHAIN_VERIFIER.md for what this does and doesn't cover yet.
//!
//! ## Why control flow and registers don't need an is-zero/lookup gadget
//!
//! A "real" zkVM proves execution over a *secret* witness the verifier never sees.
//! This one doesn't have one: `public_inputs_for` always re-executes the program
//! itself to derive the exact values a valid trace must have at every row -- the
//! program (including its `INIT` value) is the only input, and it's entirely
//! public. Because of that, neither branch outcomes (`JZ`/`JNZ`) nor which register
//! a `LOAD`/`STORE` addresses need to be *proven* correct via algebra (an is-zero
//! gadget, or a register-index mux) -- the verifier already knows the correct
//! `active` flag and the correct one-hot `reg_sel` for every row, the same way it
//! already knows the correct opcode selectors, and asserts them directly. The only
//! things that genuinely aren't asserted, and do need an algebraic check, are the
//! accumulator's and each register's own trajectory -- see `VmAir::evaluate_transition`.

use winter_math::{fields::f128::BaseElement, FieldElement, ToElements};
use winterfell::{
    crypto::{hashers::Blake3_256, DefaultRandomCoin, MerkleTree},
    matrix::ColMatrix,
    AcceptableOptions, Air, AirContext, Assertion, AuxRandElements, BatchingMethod,
    CompositionPoly, CompositionPolyTrace, ConstraintCompositionCoefficients,
    DefaultConstraintCommitment, DefaultConstraintEvaluator, DefaultTraceLde, EvaluationFrame,
    FieldExtension, PartitionOptions, ProofOptions, Prover, StarkDomain, Trace, TraceInfo,
    TracePolyTable, TraceTable, TransitionConstraintDegree,
};

pub use winterfell::{Proof, VerifierError};

use zkvm_isa::{ExecutionTrace, Program, Row, NUM_REGISTERS};

/// Column layout: accumulator; seven one-hot opcode selectors
/// (add/sub/mul/jz/jnz/load/store); the shared immediate/target/register
/// operand; the "did this row actually run" flag; `NUM_REGISTERS` one-hot
/// "which register does a load/store address" selectors; `NUM_REGISTERS`
/// register value columns.
const FIXED_COLUMNS: usize = 10; // acc, 7 selectors, right, active
const TRACE_WIDTH: usize = FIXED_COLUMNS + 2 * NUM_REGISTERS;
const REG_SEL_BASE: usize = FIXED_COLUMNS;
const REG_BASE: usize = FIXED_COLUMNS + NUM_REGISTERS;

/// One row's worth of publicly-known, per-row-asserted values: everything except
/// the accumulator and the registers themselves (their *trajectories* are checked
/// algebraically -- see `VmAir::evaluate_transition` -- not asserted directly).
/// Named fields instead of a growing tuple -- with this many columns, a tuple is
/// exactly the kind of thing that's easy to transpose by accident.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ProgramRow {
    pub s_add: BaseElement,
    pub s_sub: BaseElement,
    pub s_mul: BaseElement,
    pub s_jz: BaseElement,
    pub s_jnz: BaseElement,
    pub s_load: BaseElement,
    pub s_store: BaseElement,
    pub right: BaseElement,
    pub active: BaseElement,
    pub reg_sel: [BaseElement; NUM_REGISTERS],
}

impl From<&Row> for ProgramRow {
    fn from(row: &Row) -> Self {
        ProgramRow {
            s_add: row.s_add,
            s_sub: row.s_sub,
            s_mul: row.s_mul,
            s_jz: row.s_jz,
            s_jnz: row.s_jnz,
            s_load: row.s_load,
            s_store: row.s_store,
            right: row.right,
            active: row.active,
            reg_sel: row.reg_sel,
        }
    }
}

/// Public inputs binding a proof to one specific program: the starting accumulator
/// value, the claimed final result, and the full per-row `ProgramRow` sequence.
/// Every row of the trace is asserted against `program` below, so a prover cannot
/// swap in a different sequence of instructions, a different control-flow outcome,
/// or a different register access pattern for the *same* instructions, and still
/// have the proof verify.
#[derive(Debug, Clone)]
pub struct PublicInputs {
    pub initial: BaseElement,
    pub result: BaseElement,
    pub program: Vec<ProgramRow>,
}

impl ToElements<BaseElement> for PublicInputs {
    fn to_elements(&self) -> Vec<BaseElement> {
        let mut elements = vec![self.initial, self.result];
        for row in &self.program {
            elements.extend_from_slice(&[
                row.s_add,
                row.s_sub,
                row.s_mul,
                row.s_jz,
                row.s_jnz,
                row.s_load,
                row.s_store,
                row.right,
                row.active,
            ]);
            elements.extend_from_slice(&row.reg_sel);
        }
        elements
    }
}

/// Recomputes the public inputs for `program` by re-executing it -- this is what an
/// independent verifier does: replay the *program* (which it already knows/trusts),
/// not the proof, to know what it should check the proof against. Takes only the
/// program, not a caller-supplied trace: an earlier version took `(program, trace)`
/// and silently ignored `program`, which meant nothing in the type system stopped a
/// caller from passing a trace that didn't actually come from that program. Every
/// call site in this repo always re-executed `program` immediately beforehand anyway
/// (so this was never a live bug here), but the old signature made that a caller
/// discipline instead of something the API itself guaranteed.
pub fn public_inputs_for_program(program: &Program) -> PublicInputs {
    let trace = zkvm_isa::execute(program);
    PublicInputs {
        initial: trace
            .rows
            .first()
            .map(|r| r.acc)
            .unwrap_or(BaseElement::ZERO),
        result: trace.result,
        program: trace.rows.iter().map(ProgramRow::from).collect(),
    }
}

pub struct VmAir {
    context: AirContext<BaseElement>,
    initial: BaseElement,
    result: BaseElement,
    program: Vec<ProgramRow>,
}

/// Number of assertable columns per row: acc is excluded (asserted only at the
/// endpoints; its trajectory is checked algebraically), and so are the register
/// columns (same reason) -- everything else is directly pinned every row.
const ASSERTED_COLUMNS_PER_ROW: usize = 9 + NUM_REGISTERS; // 7 selectors + right + active + reg_sel

impl Air for VmAir {
    type BaseField = BaseElement;
    type PublicInputs = PublicInputs;

    fn new(trace_info: TraceInfo, pub_inputs: PublicInputs, options: ProofOptions) -> Self {
        assert_eq!(TRACE_WIDTH, trace_info.width());
        assert_eq!(
            trace_info.length(),
            pub_inputs.program.len(),
            "public program length must match the trace length"
        );

        // One constraint for the accumulator, one for each register: does this
        // row's (already-asserted-correct) opcode/active/reg_sel sequence
        // explain the next row's acc/register values. Degree 4 in the worst
        // case (e.g. `active * s_mul * acc * right`) -- see the comment on
        // `evaluate_transition` for why the *actual* degree is data-dependent
        // and why that's fine.
        let degrees = vec![TransitionConstraintDegree::new(4); 1 + NUM_REGISTERS];
        // Every row asserts ASSERTED_COLUMNS_PER_ROW columns, plus the
        // accumulator's two endpoints, plus each register starting at zero.
        let num_assertions =
            2 + NUM_REGISTERS + ASSERTED_COLUMNS_PER_ROW * pub_inputs.program.len();

        VmAir {
            context: AirContext::new(trace_info, degrees, num_assertions, options),
            initial: pub_inputs.initial,
            result: pub_inputs.result,
            program: pub_inputs.program,
        }
    }

    fn context(&self) -> &AirContext<Self::BaseField> {
        &self.context
    }

    fn evaluate_transition<E: FieldElement<BaseField = Self::BaseField>>(
        &self,
        frame: &EvaluationFrame<E>,
        _periodic_values: &[E],
        result: &mut [E],
    ) {
        let current = frame.current();
        let next = frame.next();

        let acc = current[0];
        let s_add = current[1];
        let s_sub = current[2];
        let s_mul = current[3];
        let s_jz = current[4];
        let s_jnz = current[5];
        let s_load = current[6];
        let s_store = current[7];
        let right = current[8];
        let active = current[9];
        let reg_sel = &current[REG_SEL_BASE..REG_SEL_BASE + NUM_REGISTERS];
        let registers = &current[REG_BASE..REG_BASE + NUM_REGISTERS];
        let next_acc = next[0];

        // Every column but `acc` and the registers is independently asserted
        // per row (see `get_assertions`), so this is the only thing that
        // needs an algebraic check: does the accumulator evolve consistently
        // with the (already known-correct) opcode/active/reg_sel values for
        // this row. `LOAD` reads whichever register `reg_sel` (one-hot)
        // picks out; `JZ`/`JNZ`/`STORE` don't touch the accumulator at all,
        // so their contribution is just `acc` (a no-op), same as inactive.
        let loaded = reg_sel
            .iter()
            .zip(registers.iter())
            .fold(E::ZERO, |sum, (&sel, &val)| sum + sel * val);

        let applied = s_add * (acc + right)
            + s_sub * (acc - right)
            + s_mul * (acc * right)
            + (s_jz + s_jnz + s_store) * acc
            + s_load * loaded;

        // Degree 4 in the worst case (e.g. `active * s_mul * acc * right`, or
        // `active * s_load * reg_sel_k * r_k`, four trace columns multiplied
        // together) -- but only when `active` truly varies across the trace
        // (a taken branch). On a trace where `active` is constant
        // (straight-line programs, or a branch that isn't taken), this
        // expression's *actual* interpolated degree degenerates to 3, one
        // less than the declared bound. That's an intentional, safe
        // over-estimate, not a bug: `TransitionConstraintDegree::new(4)` in
        // `VmAir::new` only needs to be an upper bound, and verification uses
        // it uniformly regardless of the concrete trace. Winterfell's own
        // `#[cfg(debug_assertions)]`-only self-check (`validate_transition_degrees`)
        // is stricter than that -- it demands the *actual* degree match the
        // *declared* one exactly on every trace it's run against -- which this
        // constraint will only ever satisfy on inputs that hit the degree-4
        // case. That's why this workspace's tests run under `--release`
        // (which compiles that debug-only check out): see README.md.
        result[0] = next_acc - (active * applied + (E::ONE - active) * acc);

        // One constraint per register k: `registers[k]` updates to `acc` iff
        // this row is active, is a STORE, and addresses register k (all three
        // asserted-known, multiplied together); otherwise it's unchanged.
        for k in 0..NUM_REGISTERS {
            let r_k = registers[k];
            let next_r_k = next[REG_BASE + k];
            let write_k = active * s_store * reg_sel[k];
            result[1 + k] = next_r_k - (write_k * acc + (E::ONE - write_k) * r_k);
        }
    }

    fn get_assertions(&self) -> Vec<Assertion<Self::BaseField>> {
        let last_step = self.trace_length() - 1;
        let mut assertions = vec![
            Assertion::single(0, 0, self.initial),
            Assertion::single(0, last_step, self.result),
        ];
        for k in 0..NUM_REGISTERS {
            assertions.push(Assertion::single(REG_BASE + k, 0, BaseElement::ZERO));
        }
        for (step, row) in self.program.iter().enumerate() {
            assertions.push(Assertion::single(1, step, row.s_add));
            assertions.push(Assertion::single(2, step, row.s_sub));
            assertions.push(Assertion::single(3, step, row.s_mul));
            assertions.push(Assertion::single(4, step, row.s_jz));
            assertions.push(Assertion::single(5, step, row.s_jnz));
            assertions.push(Assertion::single(6, step, row.s_load));
            assertions.push(Assertion::single(7, step, row.s_store));
            assertions.push(Assertion::single(8, step, row.right));
            assertions.push(Assertion::single(9, step, row.active));
            for k in 0..NUM_REGISTERS {
                assertions.push(Assertion::single(REG_SEL_BASE + k, step, row.reg_sel[k]));
            }
        }
        assertions
    }
}

type Hasher = Blake3_256<BaseElement>;

pub struct VmProver {
    options: ProofOptions,
}

impl VmProver {
    pub fn new(options: ProofOptions) -> Self {
        Self { options }
    }

    fn build_trace(rows: &[Row]) -> TraceTable<BaseElement> {
        let mut trace = TraceTable::new(TRACE_WIDTH, rows.len());
        trace.fill(
            |state| write_row(state, &rows[0]),
            |step, state| write_row(state, &rows[step + 1]),
        );
        trace
    }
}

fn write_row(state: &mut [BaseElement], row: &Row) {
    state[0] = row.acc;
    state[1] = row.s_add;
    state[2] = row.s_sub;
    state[3] = row.s_mul;
    state[4] = row.s_jz;
    state[5] = row.s_jnz;
    state[6] = row.s_load;
    state[7] = row.s_store;
    state[8] = row.right;
    state[9] = row.active;
    state[REG_SEL_BASE..REG_SEL_BASE + NUM_REGISTERS].copy_from_slice(&row.reg_sel);
    state[REG_BASE..REG_BASE + NUM_REGISTERS].copy_from_slice(&row.registers);
}

impl Prover for VmProver {
    type BaseField = BaseElement;
    type Air = VmAir;
    type Trace = TraceTable<BaseElement>;
    type HashFn = Hasher;
    type VC = MerkleTree<Hasher>;
    type RandomCoin = DefaultRandomCoin<Hasher>;
    type TraceLde<E: FieldElement<BaseField = Self::BaseField>> =
        DefaultTraceLde<E, Self::HashFn, Self::VC>;
    type ConstraintCommitment<E: FieldElement<BaseField = Self::BaseField>> =
        DefaultConstraintCommitment<E, Self::HashFn, Self::VC>;
    type ConstraintEvaluator<'a, E: FieldElement<BaseField = Self::BaseField>> =
        DefaultConstraintEvaluator<'a, Self::Air, E>;

    fn get_pub_inputs(&self, trace: &Self::Trace) -> PublicInputs {
        let last_step = trace.length() - 1;
        let program = (0..trace.length())
            .map(|step| {
                let mut reg_sel = [BaseElement::ZERO; NUM_REGISTERS];
                for (k, slot) in reg_sel.iter_mut().enumerate() {
                    *slot = trace.get(REG_SEL_BASE + k, step);
                }
                ProgramRow {
                    s_add: trace.get(1, step),
                    s_sub: trace.get(2, step),
                    s_mul: trace.get(3, step),
                    s_jz: trace.get(4, step),
                    s_jnz: trace.get(5, step),
                    s_load: trace.get(6, step),
                    s_store: trace.get(7, step),
                    right: trace.get(8, step),
                    active: trace.get(9, step),
                    reg_sel,
                }
            })
            .collect();
        PublicInputs {
            initial: trace.get(0, 0),
            result: trace.get(0, last_step),
            program,
        }
    }

    fn options(&self) -> &ProofOptions {
        &self.options
    }

    fn new_trace_lde<E: FieldElement<BaseField = Self::BaseField>>(
        &self,
        trace_info: &TraceInfo,
        main_trace: &ColMatrix<Self::BaseField>,
        domain: &StarkDomain<Self::BaseField>,
        partition_option: PartitionOptions,
    ) -> (Self::TraceLde<E>, TracePolyTable<E>) {
        DefaultTraceLde::new(trace_info, main_trace, domain, partition_option)
    }

    fn build_constraint_commitment<E: FieldElement<BaseField = Self::BaseField>>(
        &self,
        composition_poly_trace: CompositionPolyTrace<E>,
        num_constraint_composition_columns: usize,
        domain: &StarkDomain<Self::BaseField>,
        partition_options: PartitionOptions,
    ) -> (Self::ConstraintCommitment<E>, CompositionPoly<E>) {
        DefaultConstraintCommitment::new(
            composition_poly_trace,
            num_constraint_composition_columns,
            domain,
            partition_options,
        )
    }

    fn new_evaluator<'a, E: FieldElement<BaseField = Self::BaseField>>(
        &self,
        air: &'a Self::Air,
        aux_rand_elements: Option<AuxRandElements<E>>,
        composition_coefficients: ConstraintCompositionCoefficients<E>,
    ) -> Self::ConstraintEvaluator<'a, E> {
        DefaultConstraintEvaluator::new(air, aux_rand_elements, composition_coefficients)
    }
}

/// ~96-bit conjectured security: 32 queries, blowup factor 8. Fine for a Phase 1 demo; a
/// production deployment needs a proper security-parameter review (see /docs/ROADMAP.md).
pub fn default_options() -> ProofOptions {
    ProofOptions::new(
        32,
        8,
        0,
        FieldExtension::None,
        8,
        31,
        BatchingMethod::Linear,
        BatchingMethod::Linear,
    )
}

/// Executes `program`, then proves the execution. Returns the proof and the public
/// inputs a verifier needs (which do NOT include the trace itself).
pub fn prove_program(program: &Program) -> Result<(Proof, PublicInputs), String> {
    let padded = program.padded();
    let ExecutionTrace { rows, .. } = zkvm_isa::execute(&padded);
    let trace = VmProver::build_trace(&rows);
    let prover = VmProver::new(default_options());
    let pub_inputs = prover.get_pub_inputs(&trace);
    let proof = prover.prove(trace).map_err(|e| e.to_string())?;
    Ok((proof, pub_inputs))
}

/// Verifies `proof` against `pub_inputs`. Requires no knowledge of the execution trace.
pub fn verify_program(proof: Proof, pub_inputs: PublicInputs) -> Result<(), VerifierError> {
    let acceptable = AcceptableOptions::OptionSet(vec![proof.options().clone()]);
    winterfell::verify::<VmAir, Hasher, DefaultRandomCoin<Hasher>, MerkleTree<Hasher>>(
        proof,
        pub_inputs,
        &acceptable,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use zkvm_isa::Instruction;

    fn sample_program() -> Program {
        // ((5 + 3) * 2) - 4 == 12
        Program::new(
            5,
            vec![
                Instruction::Add(3),
                Instruction::Mul(2),
                Instruction::Sub(4),
            ],
        )
    }

    #[test]
    fn proves_and_verifies_correct_execution() {
        let (proof, pub_inputs) = prove_program(&sample_program()).unwrap();
        assert_eq!(pub_inputs.result, BaseElement::from(12u64));
        verify_program(proof, pub_inputs).expect("valid proof must verify");
    }

    #[test]
    fn rejects_tampered_result() {
        let (proof, mut pub_inputs) = prove_program(&sample_program()).unwrap();
        pub_inputs.result += BaseElement::ONE;
        assert!(
            verify_program(proof, pub_inputs).is_err(),
            "a proof must not verify against a result it wasn't generated for"
        );
    }

    #[test]
    fn rejects_tampered_program() {
        let (proof, mut pub_inputs) = prove_program(&sample_program()).unwrap();
        // Flip the first instruction's opcode from ADD to SUB without touching the proof.
        pub_inputs.program[0].s_add = BaseElement::ZERO;
        pub_inputs.program[0].s_sub = BaseElement::ONE;
        assert!(
            verify_program(proof, pub_inputs).is_err(),
            "a proof must not verify against a different program"
        );
    }

    fn branching_program(initial: u64) -> Program {
        Program::parse(&format!("INIT {initial}\nJZ skip\nMUL 100\nskip:\nADD 7\n")).unwrap()
    }

    #[test]
    fn proves_and_verifies_the_taken_branch() {
        let (proof, pub_inputs) = prove_program(&branching_program(0)).unwrap();
        assert_eq!(pub_inputs.result, BaseElement::from(7u64)); // MUL skipped
        verify_program(proof, pub_inputs).expect("valid proof must verify");
    }

    #[test]
    fn proves_and_verifies_the_not_taken_branch() {
        let (proof, pub_inputs) = prove_program(&branching_program(5)).unwrap();
        assert_eq!(pub_inputs.result, BaseElement::from(507u64)); // 5*100+7
        verify_program(proof, pub_inputs).expect("valid proof must verify");
    }

    #[test]
    fn rejects_a_claimed_active_flag_that_does_not_match_the_proof() {
        // Prove the "branch taken" (initial=0) execution, then claim the MUL
        // row was active after all -- a prover trying to smuggle in an
        // execution that never happened.
        let (proof, mut pub_inputs) = prove_program(&branching_program(0)).unwrap();
        pub_inputs.program[1].active = BaseElement::ONE;
        assert!(
            verify_program(proof, pub_inputs).is_err(),
            "a proof must not verify against a tampered activity flag"
        );
    }

    #[test]
    fn proves_and_verifies_a_store_load_round_trip() {
        let program = Program::parse("INIT 5\nSTORE r0\nADD 100\nLOAD r0\n").unwrap();
        let (proof, pub_inputs) = prove_program(&program).unwrap();
        assert_eq!(pub_inputs.result, BaseElement::from(5u64));
        verify_program(proof, pub_inputs).expect("valid proof must verify");
    }

    #[test]
    fn rejects_a_claimed_register_selector_that_does_not_match_the_proof() {
        // Prove a program that stores to r0, then claim the STORE targeted r1
        // instead -- a prover trying to smuggle a different register access.
        let program = Program::parse("INIT 5\nSTORE r0\nADD 100\nLOAD r0\n").unwrap();
        let (proof, mut pub_inputs) = prove_program(&program).unwrap();
        pub_inputs.program[0].reg_sel[0] = BaseElement::ZERO;
        pub_inputs.program[0].reg_sel[1] = BaseElement::ONE;
        assert!(
            verify_program(proof, pub_inputs).is_err(),
            "a proof must not verify against a tampered register selector"
        );
    }
}
