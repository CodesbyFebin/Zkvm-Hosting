//! Instruction set and interpreter for zkVM's accumulator-plus-registers machine.
//!
//! This is the VM: an accumulator machine (`ADD`/`SUB`/`MUL` against a single
//! register) with real conditional control flow (`JZ`/`JNZ`) and a small fixed
//! register file (`LOAD`/`STORE`) for holding more than one live value across
//! arithmetic operations, over a fixed, statically-laid-out program. See
//! /docs/ROADMAP.md for what's implemented and what isn't yet (no memory, no
//! loops -- jumps must be forward-only, see `Program::parse` below).
//!
//! All arithmetic happens directly in the same finite field the STARK prover
//! uses, so the interpreter's notion of "correct execution" and the AIR's
//! notion of "correct execution" can never silently diverge.

pub use winter_math::fields::f128::BaseElement;
pub use winter_math::FieldElement;

use std::collections::HashMap;

/// Number of general-purpose registers (`r0`..`r{NUM_REGISTERS-1}`). Small and
/// fixed, deliberately -- this is scratch space for holding a second live
/// value across arithmetic ops, not a general-purpose register machine.
pub const NUM_REGISTERS: usize = 4;

/// A single instruction. The accumulator is always the left operand of an
/// arithmetic op; jump targets are absolute indices into the (unpadded)
/// instruction list; `Load`/`Store` address a register by index. All of it --
/// opcode, operand/target/register -- is embedded directly in the instruction
/// and bound into every proof (see `zkvm-stark::PublicInputs`), so a prover
/// cannot swap in a different program, or a different control-flow or
/// register outcome, and still have the proof verify.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Instruction {
    Add(u64),
    Sub(u64),
    Mul(u64),
    /// Jump to the given (absolute, forward-only) instruction index if the
    /// accumulator is currently zero.
    Jz(u64),
    /// Jump to the given (absolute, forward-only) instruction index if the
    /// accumulator is currently nonzero.
    Jnz(u64),
    /// `acc = registers[r]`. Register value is unchanged.
    Load(u64),
    /// `registers[r] = acc`. Accumulator is unchanged.
    Store(u64),
}

impl Instruction {
    fn immediate(self) -> u64 {
        match self {
            Instruction::Add(v)
            | Instruction::Sub(v)
            | Instruction::Mul(v)
            | Instruction::Jz(v)
            | Instruction::Jnz(v)
            | Instruction::Load(v)
            | Instruction::Store(v) => v,
        }
    }

    /// One-hot opcode selectors plus the immediate/target/register operand,
    /// all as field elements -- this is exactly the row shape the AIR
    /// constrains. `reg_sel` is one-hot over which register a `Load`/`Store`
    /// addresses; it's all-zero for every other opcode.
    fn selectors(self) -> Selectors {
        let (z, o) = (BaseElement::ZERO, BaseElement::ONE);
        let right = BaseElement::from(self.immediate());
        let (s_add, s_sub, s_mul, s_jz, s_jnz, s_load, s_store) = match self {
            Instruction::Add(_) => (o, z, z, z, z, z, z),
            Instruction::Sub(_) => (z, o, z, z, z, z, z),
            Instruction::Mul(_) => (z, z, o, z, z, z, z),
            Instruction::Jz(_) => (z, z, z, o, z, z, z),
            Instruction::Jnz(_) => (z, z, z, z, o, z, z),
            Instruction::Load(_) => (z, z, z, z, z, o, z),
            Instruction::Store(_) => (z, z, z, z, z, z, o),
        };
        let mut reg_sel = [z; NUM_REGISTERS];
        if let Instruction::Load(r) | Instruction::Store(r) = self {
            reg_sel[r as usize] = o;
        }
        Selectors { s_add, s_sub, s_mul, s_jz, s_jnz, s_load, s_store, right, reg_sel }
    }

    fn is_branch(self) -> bool {
        matches!(self, Instruction::Jz(_) | Instruction::Jnz(_))
    }
}

#[derive(Debug, Clone, Copy)]
struct Selectors {
    s_add: BaseElement,
    s_sub: BaseElement,
    s_mul: BaseElement,
    s_jz: BaseElement,
    s_jnz: BaseElement,
    s_load: BaseElement,
    s_store: BaseElement,
    right: BaseElement,
    reg_sel: [BaseElement; NUM_REGISTERS],
}

/// A straight-line-or-branching program: an initial accumulator value plus a
/// sequence of instructions, statically laid out (a jump skips over rows, it
/// never revisits one -- see `Program::parse` for the forward-only rule this
/// implies, and /docs/ROADMAP.md for why loops are future work). Registers
/// always start at zero.
#[derive(Debug, Clone)]
pub struct Program {
    pub initial: u64,
    pub instructions: Vec<Instruction>,
}

impl Program {
    pub fn new(initial: u64, instructions: Vec<Instruction>) -> Self {
        Self { initial, instructions }
    }

    /// Parses the tiny assembly format used by the CLI and examples:
    ///
    /// ```text
    /// INIT 5
    /// ADD 3
    /// STORE r0     # registers[0] = acc
    /// JZ done      # forward jump to a label
    /// MUL 2
    /// LOAD r0      # acc = registers[0]
    /// done:
    /// SUB 4
    /// ```
    ///
    /// A label is a line of the form `name:` with nothing else on it; it
    /// names the position of the instruction immediately following it (or
    /// the end of the program, if nothing follows). `JZ`/`JNZ` targets must
    /// be labels defined strictly after the jump itself -- backward jumps
    /// (loops) aren't supported yet, because this VM's trace has exactly one
    /// row per static instruction; a loop would need a dynamically-sized
    /// trace, which is a bigger change than adding control flow to a
    /// fixed-length one. `LOAD`/`STORE` take a register name `r0`..`r{N-1}`.
    pub fn parse(text: &str) -> Result<Program, String> {
        let mut lines = text
            .lines()
            .map(str::trim)
            .filter(|l| !l.is_empty() && !l.starts_with('#'));

        let first = lines.next().ok_or("empty program")?;
        let initial = parse_init_line(first)?;
        let body: Vec<&str> = lines.collect();

        let labels = collect_labels(&body)?;

        let mut instructions = Vec::new();
        for line in &body {
            if line.ends_with(':') && !line.contains(char::is_whitespace) {
                continue; // label definition, not an instruction
            }
            let mut parts = line.split_whitespace();
            let op = parts.next().ok_or("missing opcode")?;
            let arg_token = parts.next().ok_or_else(|| format!("missing operand for {op}"))?;
            let index = instructions.len() as u64;

            let instruction = match op.to_ascii_uppercase().as_str() {
                "ADD" => Instruction::Add(parse_u64(arg_token, op)?),
                "SUB" => Instruction::Sub(parse_u64(arg_token, op)?),
                "MUL" => Instruction::Mul(parse_u64(arg_token, op)?),
                "JZ" => Instruction::Jz(resolve_target(arg_token, &labels, index)?),
                "JNZ" => Instruction::Jnz(resolve_target(arg_token, &labels, index)?),
                "LOAD" => Instruction::Load(parse_register(arg_token)?),
                "STORE" => Instruction::Store(parse_register(arg_token)?),
                other => return Err(format!("unknown opcode: {other}")),
            };
            instructions.push(instruction);
        }

        if instructions.is_empty() {
            return Err("program has no instructions".into());
        }
        Ok(Program::new(initial, instructions))
    }

    /// Pads the instruction list to a power of two (STARK trace lengths must
    /// be one, and at least 8) using `Add(0)` no-ops -- a real, provable
    /// instruction, not a special case the AIR needs to know about. Jump
    /// targets are unaffected: they only ever point within the original,
    /// unpadded instructions.
    pub fn padded(&self) -> Program {
        let mut instructions = self.instructions.clone();
        let target = instructions.len().max(8).next_power_of_two();
        instructions.resize(target, Instruction::Add(0));
        Program { initial: self.initial, instructions }
    }
}

fn parse_u64(token: &str, op: &str) -> Result<u64, String> {
    token.parse().map_err(|e| format!("bad operand for {op}: {e}"))
}

fn parse_register(token: &str) -> Result<u64, String> {
    let rest = token
        .strip_prefix(['r', 'R'])
        .ok_or_else(|| format!("expected a register name like r0..r{}, found {token}", NUM_REGISTERS - 1))?;
    let index: u64 = rest.parse().map_err(|e| format!("bad register name {token}: {e}"))?;
    if index as usize >= NUM_REGISTERS {
        return Err(format!(
            "register {token} out of range: only r0..r{} exist",
            NUM_REGISTERS - 1
        ));
    }
    Ok(index)
}

fn collect_labels(body: &[&str]) -> Result<HashMap<String, u64>, String> {
    let mut labels = HashMap::new();
    let mut index = 0u64;
    for line in body {
        if line.ends_with(':') && !line.contains(char::is_whitespace) {
            let name = line[..line.len() - 1].to_string();
            if labels.insert(name.clone(), index).is_some() {
                return Err(format!("label defined twice: {name}"));
            }
        } else {
            index += 1;
        }
    }
    Ok(labels)
}

fn resolve_target(token: &str, labels: &HashMap<String, u64>, from: u64) -> Result<u64, String> {
    let target = *labels.get(token).ok_or_else(|| format!("undefined label: {token}"))?;
    if target <= from {
        return Err(format!(
            "backward or self jump to '{token}' (target {target} <= instruction {from}): only forward jumps are supported"
        ));
    }
    Ok(target)
}

fn parse_init_line(line: &str) -> Result<u64, String> {
    let mut parts = line.split_whitespace();
    let op = parts.next().ok_or("missing opcode")?;
    if !op.eq_ignore_ascii_case("INIT") {
        return Err(format!("expected INIT as the first line, found {op}"));
    }
    parts
        .next()
        .ok_or("missing operand for INIT")?
        .parse()
        .map_err(|e| format!("bad operand for INIT: {e}"))
}

/// One row of the execution trace, one per *static* instruction position
/// (not one per dynamic execution step -- a skipped instruction still gets a
/// row, just an inactive one). `acc` and `registers` are their values
/// *before* this row's instruction would apply.
#[derive(Debug, Clone, Copy)]
pub struct Row {
    pub acc: BaseElement,
    pub registers: [BaseElement; NUM_REGISTERS],
    pub s_add: BaseElement,
    pub s_sub: BaseElement,
    pub s_mul: BaseElement,
    pub s_jz: BaseElement,
    pub s_jnz: BaseElement,
    pub s_load: BaseElement,
    pub s_store: BaseElement,
    pub right: BaseElement,
    /// One-hot: which register this row's `LOAD`/`STORE` addresses. All-zero
    /// for every other opcode.
    pub reg_sel: [BaseElement; NUM_REGISTERS],
    /// 1 if this row's instruction actually executed (its static position
    /// was reached by the dynamic control flow), 0 if a jump skipped over
    /// it. Skipped rows leave `acc` and `registers` unchanged.
    pub active: BaseElement,
}

#[derive(Debug, Clone)]
pub struct ExecutionTrace {
    pub rows: Vec<Row>,
    pub result: BaseElement,
}

/// Runs `program` and records the full execution trace, including which
/// static positions were actually reached. This is the VM's actual
/// interpreter -- the thing that would run untrusted guest code -- and has no
/// dependency on proving; `zkvm-stark` consumes this same trace to build a
/// STARK proof.
///
/// Because forward-only jumps mean no instruction is ever visited twice, the
/// trace has exactly `program.instructions.len()` rows: one per static
/// position, active or not. That's what keeps trace length statically known
/// (no dynamically-sized execution here) while still supporting real,
/// input-dependent control flow.
pub fn execute(program: &Program) -> ExecutionTrace {
    let len = program.instructions.len() as u64;
    let mut acc = BaseElement::from(program.initial);
    let mut registers = [BaseElement::ZERO; NUM_REGISTERS];
    let mut pc: u64 = 0;
    let mut rows = Vec::with_capacity(program.instructions.len());

    for (i, instr) in program.instructions.iter().enumerate() {
        let i = i as u64;
        let active = pc == i;
        let sel = instr.selectors();
        rows.push(Row {
            acc,
            registers,
            s_add: sel.s_add,
            s_sub: sel.s_sub,
            s_mul: sel.s_mul,
            s_jz: sel.s_jz,
            s_jnz: sel.s_jnz,
            s_load: sel.s_load,
            s_store: sel.s_store,
            right: sel.right,
            reg_sel: sel.reg_sel,
            active: if active { BaseElement::ONE } else { BaseElement::ZERO },
        });

        if active {
            let is_zero = acc == BaseElement::ZERO;
            let branch_taken = match instr {
                Instruction::Jz(_) => is_zero,
                Instruction::Jnz(_) => !is_zero,
                _ => false,
            };
            if instr.is_branch() {
                pc = if branch_taken { instr.immediate() } else { i + 1 };
            } else {
                match instr {
                    Instruction::Add(_) => acc += sel.right,
                    Instruction::Sub(_) => acc -= sel.right,
                    Instruction::Mul(_) => acc *= sel.right,
                    Instruction::Load(r) => acc = registers[*r as usize],
                    Instruction::Store(r) => registers[*r as usize] = acc,
                    Instruction::Jz(_) | Instruction::Jnz(_) => unreachable!(),
                };
                pc = i + 1;
            }
        }
        debug_assert!(pc <= len, "jump target must stay within the program");
    }

    ExecutionTrace { rows, result: acc }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn straight_line_arithmetic() {
        // ((5 + 3) * 2) - 4 == 12
        let program = Program::new(
            5,
            vec![Instruction::Add(3), Instruction::Mul(2), Instruction::Sub(4)],
        );
        let trace = execute(&program);
        assert_eq!(trace.result, BaseElement::from(12u64));
        assert_eq!(trace.rows.len(), 3);
        assert_eq!(trace.rows[0].acc, BaseElement::from(5u64));
        assert!(trace.rows.iter().all(|r| r.active == BaseElement::ONE));
    }

    #[test]
    fn parses_assembly_format() {
        let program = Program::parse("INIT 5\nADD 3\nMUL 2\nSUB 4\n").unwrap();
        let trace = execute(&program);
        assert_eq!(trace.result, BaseElement::from(12u64));
    }

    #[test]
    fn padding_preserves_result() {
        let program = Program::new(1, vec![Instruction::Add(1), Instruction::Add(1)]);
        let padded = program.padded();
        assert_eq!(padded.instructions.len(), 8); // Winterfell's minimum trace length
        let trace = execute(&padded);
        assert_eq!(trace.result, BaseElement::from(3u64)); // no-op padding doesn't change the result
    }

    #[test]
    fn rejects_unknown_opcode() {
        assert!(Program::parse("INIT 1\nFOO 2\n").is_err());
    }

    #[test]
    fn rejects_missing_init() {
        assert!(Program::parse("ADD 1\n").is_err());
    }

    #[test]
    fn jz_skips_the_multiply_when_accumulator_is_zero() {
        // INIT 0; JZ skip; MUL 100 (skipped since acc==0); skip: ADD 7 => 7
        let program = Program::parse("INIT 0\nJZ skip\nMUL 100\nskip:\nADD 7\n").unwrap();
        let trace = execute(&program);
        assert_eq!(trace.result, BaseElement::from(7u64));
        // the MUL row (index 1) must be inactive -- it was jumped over
        assert_eq!(trace.rows[1].active, BaseElement::ZERO);
    }

    #[test]
    fn jz_falls_through_when_accumulator_is_nonzero() {
        // INIT 5; JZ skip; MUL 100; skip: ADD 7 => 507
        let program = Program::parse("INIT 5\nJZ skip\nMUL 100\nskip:\nADD 7\n").unwrap();
        let trace = execute(&program);
        assert_eq!(trace.result, BaseElement::from(507u64));
        assert_eq!(trace.rows[1].active, BaseElement::ONE);
    }

    #[test]
    fn jnz_is_the_mirror_image_of_jz() {
        // INIT 5; JNZ skip; MUL 100 (skipped, since acc!=0); skip: ADD 1 => 6
        let program = Program::parse("INIT 5\nJNZ skip\nMUL 100\nskip:\nADD 1\n").unwrap();
        let trace = execute(&program);
        assert_eq!(trace.result, BaseElement::from(6u64));

        // INIT 0; JNZ skip; MUL 100 (NOT skipped, since acc==0); skip: ADD 1 => 1
        let program2 = Program::parse("INIT 0\nJNZ skip\nMUL 100\nskip:\nADD 1\n").unwrap();
        let trace2 = execute(&program2);
        assert_eq!(trace2.result, BaseElement::from(1u64));
    }

    #[test]
    fn rejects_undefined_label() {
        assert!(Program::parse("INIT 0\nJZ nowhere\nADD 1\n").is_err());
    }

    #[test]
    fn rejects_backward_jump() {
        // "back:" is defined before the JZ that targets it -- not allowed.
        let err = Program::parse("INIT 0\nback:\nADD 1\nJZ back\n").unwrap_err();
        assert!(err.contains("forward"), "unexpected error: {err}");
    }

    #[test]
    fn rejects_duplicate_label() {
        assert!(Program::parse("INIT 0\ndone:\nADD 1\ndone:\nADD 2\n").is_err());
    }

    #[test]
    fn store_then_load_round_trips_through_a_register() {
        // INIT 5; STORE r0; ADD 100; LOAD r0 => back to 5, ignoring the ADD 100
        let program = Program::parse("INIT 5\nSTORE r0\nADD 100\nLOAD r0\n").unwrap();
        let trace = execute(&program);
        assert_eq!(trace.result, BaseElement::from(5u64));
    }

    #[test]
    fn registers_start_at_zero_and_are_independent() {
        // STORE r1 without ever writing r0; LOAD r0 must read the untouched zero.
        let program = Program::parse("INIT 9\nSTORE r1\nLOAD r0\n").unwrap();
        let trace = execute(&program);
        assert_eq!(trace.result, BaseElement::ZERO);
    }

    #[test]
    fn a_register_survives_a_skipped_branch() {
        // Stash 42 in r0, then a branch that's NOT taken still leaves r0 intact.
        let program =
            Program::parse("INIT 42\nSTORE r0\nADD 1\nJZ skip\nADD 1000\nskip:\nLOAD r0\n").unwrap();
        let trace = execute(&program);
        // acc after STORE/ADD1 = 43 (nonzero) -> JZ not taken -> ADD 1000 -> 1043 -> LOAD r0 -> 42
        assert_eq!(trace.result, BaseElement::from(42u64));
    }

    #[test]
    fn rejects_out_of_range_register() {
        assert!(Program::parse(&format!("INIT 0\nLOAD r{NUM_REGISTERS}\n")).is_err());
    }

    #[test]
    fn rejects_malformed_register_name() {
        assert!(Program::parse("INIT 0\nLOAD x0\n").is_err());
    }
}
