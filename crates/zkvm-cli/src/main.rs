use std::env;
use std::fs;
use std::process::ExitCode;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Deserialize;
use winter_utils::Deserializable;
use zkvm_isa::{execute, FieldElement, Instruction, Program};
use zkvm_stark::{prove_program, public_inputs_for_program, verify_program, Proof};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    let result = match args.get(1).map(String::as_str) {
        Some("run") => cmd_run(&args[2..]),
        Some("prove") => cmd_prove(&args[2..]),
        Some("verify") => cmd_verify(&args[2..]),
        Some("deploy") => cmd_deploy(&args[2..]),
        Some("demo") => cmd_demo(),
        _ => {
            print_usage();
            return ExitCode::SUCCESS;
        }
    };

    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}

fn print_usage() {
    println!(
        "zkvm -- a minimal proven-execution virtual machine (Phase 1 MVP)\n\n\
         USAGE:\n\
         \x20 zkvm run    <program.zkasm>              execute a program, print the result\n\
         \x20 zkvm prove  <program.zkasm> <out.proof>  execute + generate a STARK proof\n\
         \x20 zkvm verify <program.zkasm> <in.proof>   verify a proof against a program\n\
         \x20 zkvm deploy <program.zkasm> [--server URL] [--out out.proof]\n\
         \x20                                          push a program to a zkvm-host-server\n\
         \x20                                          and save back the proof it returns\n\
         \x20 zkvm demo                                execute/prove/verify + tamper checks\n"
    );
}

fn read_program(path: &str) -> Result<Program, String> {
    let text = fs::read_to_string(path).map_err(|e| format!("reading {path}: {e}"))?;
    Program::parse(&text)
}

fn cmd_run(args: &[String]) -> Result<(), String> {
    let path = args.first().ok_or("usage: zkvm run <program.zkasm>")?;
    let program = read_program(path)?;
    let trace = execute(&program);
    println!("executed {} instruction(s)", program.instructions.len());
    println!("result = {}", trace.result);
    Ok(())
}

fn cmd_prove(args: &[String]) -> Result<(), String> {
    let path = args
        .first()
        .ok_or("usage: zkvm prove <program.zkasm> <out.proof>")?;
    let out = args
        .get(1)
        .ok_or("usage: zkvm prove <program.zkasm> <out.proof>")?;
    let program = read_program(path)?;

    let (proof, pub_inputs) =
        prove_program(&program).map_err(|e| format!("proving failed: {e}"))?;
    let bytes = proof.to_bytes();
    fs::write(out, &bytes).map_err(|e| format!("writing {out}: {e}"))?;

    println!("proof written to {out} ({} bytes)", bytes.len());
    println!(
        "public inputs: initial={}, result={}",
        pub_inputs.initial, pub_inputs.result
    );
    Ok(())
}

fn cmd_verify(args: &[String]) -> Result<(), String> {
    let path = args
        .first()
        .ok_or("usage: zkvm verify <program.zkasm> <in.proof>")?;
    let proof_path = args
        .get(1)
        .ok_or("usage: zkvm verify <program.zkasm> <in.proof>")?;
    let program = read_program(path)?;

    let bytes = fs::read(proof_path).map_err(|e| format!("reading {proof_path}: {e}"))?;
    let proof = Proof::read_from_bytes(&bytes).map_err(|e| format!("bad proof file: {e}"))?;

    // The verifier only needs the program (which it already trusts) to recompute the
    // public inputs to check the proof against -- it never sees the accumulator trace.
    let padded = program.padded();
    let pub_inputs = public_inputs_for_program(&padded);

    verify_program(proof, pub_inputs).map_err(|e| format!("verification failed: {e}"))?;
    println!("OK: proof verifies against {path}");
    Ok(())
}

#[derive(Debug, Deserialize)]
struct DeployResponse {
    result: String,
    proof_bytes: usize,
    proof_base64: String,
}

/// "Push code, get a proof": POSTs the program to a running `zkvm-host-server`
/// (default `http://127.0.0.1:4477`) instead of proving locally. Verification stays
/// local -- it's cheap, and it means you never have to trust the server's own claim
/// that a proof is valid.
fn cmd_deploy(args: &[String]) -> Result<(), String> {
    let path = args
        .first()
        .ok_or("usage: zkvm deploy <program.zkasm> [--server URL] [--out out.proof]")?;

    let mut server = "http://127.0.0.1:4477".to_string();
    let mut out = format!("{path}.proof");
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--server" => {
                server = args.get(i + 1).ok_or("--server requires a value")?.clone();
                i += 2;
            }
            "--out" => {
                out = args.get(i + 1).ok_or("--out requires a value")?.clone();
                i += 2;
            }
            other => return Err(format!("unknown flag: {other}")),
        }
    }

    let text = fs::read_to_string(path).map_err(|e| format!("reading {path}: {e}"))?;
    // Fail fast locally on an obviously bad program before paying for a round-trip.
    Program::parse(&text)?;

    let url = format!("{}/v1/proofs", server.trim_end_matches('/'));
    println!("deploying {path} to {url} ...");

    let response: DeployResponse = ureq::post(&url)
        .send_json(serde_json::json!({ "program": text }))
        .map_err(|e| format!("request to {url} failed: {e}"))?
        .body_mut()
        .read_json()
        .map_err(|e| format!("bad response from {url}: {e}"))?;

    let bytes = STANDARD
        .decode(&response.proof_base64)
        .map_err(|e| format!("server sent bad base64: {e}"))?;
    fs::write(&out, &bytes).map_err(|e| format!("writing {out}: {e}"))?;

    println!("proof received: {} bytes -> {out}", response.proof_bytes);
    println!("result = {}", response.result);
    println!("verify locally with: zkvm verify {path} {out}");
    Ok(())
}

fn cmd_demo() -> Result<(), String> {
    println!("=== zkVM Phase 1 demo ===\n");

    let program = Program::new(
        5,
        vec![
            Instruction::Add(3),
            Instruction::Mul(2),
            Instruction::Sub(4),
        ],
    );
    println!("program: initial=5, ADD 3, MUL 2, SUB 4   (=> ((5+3)*2)-4)");

    let trace = execute(&program);
    println!("interpreter result: {}\n", trace.result);

    println!("generating STARK proof...");
    let (proof, pub_inputs) =
        prove_program(&program).map_err(|e| format!("proving failed: {e}"))?;
    println!("proof generated: {} bytes\n", proof.to_bytes().len());

    println!("verifying against the correct public inputs...");
    verify_program(proof.clone(), pub_inputs.clone())
        .map_err(|e| format!("expected this to verify: {e}"))?;
    println!("  -> accepted\n");

    println!("re-verifying the SAME proof against a tampered result (12 -> 13)...");
    let mut bad_inputs = pub_inputs.clone();
    bad_inputs.result += zkvm_isa::BaseElement::ONE;
    match verify_program(proof.clone(), bad_inputs) {
        Ok(()) => return Err("a tampered result was accepted -- soundness bug!".into()),
        Err(e) => println!("  -> rejected, as expected ({e})\n"),
    }

    println!("re-verifying the SAME proof against a tampered program (first op ADD -> SUB)...");
    let mut bad_program = pub_inputs;
    bad_program.program[0].s_add = zkvm_isa::BaseElement::ZERO;
    bad_program.program[0].s_sub = zkvm_isa::BaseElement::ONE;
    match verify_program(proof, bad_program) {
        Ok(()) => Err("a tampered program was accepted -- soundness bug!".into()),
        Err(e) => {
            println!("  -> rejected, as expected ({e})");
            Ok(())
        }
    }
}
