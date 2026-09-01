import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'zkvm CLI Reference',
  description: 'Every real zkvm CLI subcommand -- run, prove, verify, deploy, demo -- with exact usage strings and flags, verified against crates/zkvm-cli/src/main.rs.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/cli-reference',
};

function Code({ children }) {
  return <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">{children}</pre>;
}

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

const COMMANDS = [
  {
    name: 'run',
    usage: 'zkvm run <program.zkasm>',
    desc: 'Parses and executes a program in the interpreter, no proof involved. Prints the instruction count and the final accumulator value.',
    output: 'executed 4 instruction(s)\nresult = 12',
  },
  {
    name: 'prove',
    usage: 'zkvm prove <program.zkasm> <out.proof>',
    desc: 'Executes the program, then generates a real STARK proof over Winterfell and writes it to disk. Prints proof size and the public inputs (initial value, result) the verifier will check against.',
    output: 'proof written to out.proof (10998 bytes)\npublic inputs: initial=5, result=12',
  },
  {
    name: 'verify',
    usage: 'zkvm verify <program.zkasm> <in.proof>',
    desc: "Re-derives the program's public inputs itself (it never trusts the prover's claim) and checks the proof against them. Exits non-zero and prints the failure reason if the proof doesn't verify.",
    output: 'OK: proof verifies against examples/fibonacci_like.zkasm',
  },
  {
    name: 'deploy',
    usage: 'zkvm deploy <program.zkasm> [--server URL] [--out out.proof]',
    desc: 'Sends the program to a running zkvm-host-server instead of proving locally -- "push code, get a proof back." Verification still happens locally afterward, so you never have to trust the server\'s own claim that a proof is valid. Defaults to --server http://127.0.0.1:4477 and --out <program>.proof.',
    output: 'deploying examples/fibonacci_like.zkasm to http://127.0.0.1:4477/v1/proofs ...\nproof received: 10998 bytes -> examples/fibonacci_like.zkasm.proof\nresult = 12\nverify locally with: zkvm verify examples/fibonacci_like.zkasm examples/fibonacci_like.zkasm.proof',
  },
  {
    name: 'demo',
    usage: 'zkvm demo',
    desc: 'A fixed, self-contained walkthrough: builds ((5+3)*2)-4, executes it, proves it, verifies the real proof (accepted), then re-verifies the exact same proof against a tampered result and a tampered program (both rejected). No arguments -- it needs no input file because the program is hardcoded in the demo itself.',
    output: '=== zkVM Phase 1 demo ===\n\nprogram: initial=5, ADD 3, MUL 2, SUB 4   (=> ((5+3)*2)-4)\ninterpreter result: 12\n\ngenerating STARK proof...\nproof generated: 10998 bytes\n\nverifying against the correct public inputs...\n  -> accepted\n\nre-verifying the SAME proof against a tampered result (12 -> 13)...\n  -> rejected, as expected\n\nre-verifying the SAME proof against a tampered program (first op ADD -> SUB)...\n  -> rejected, as expected',
  },
];

export default function CliReference() {
  usePageMeta({
    title: 'CLI Reference',
    description: "Every zkvm CLI subcommand -- run, prove, verify, deploy, demo -- with exact usage strings, flags, and real sample output, verified against the actual source.",
    path: '/cli-reference',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Reference"
          title="CLI"
          accent="REFERENCE"
          dek="Five subcommands, one binary. This is the exact usage text and behavior in crates/zkvm-cli/src/main.rs, not a paraphrase."
        />

        <Section title="Usage">
          <Code>{`zkvm -- a minimal proven-execution virtual machine (Phase 1 MVP)

USAGE:
  zkvm run    <program.zkasm>              execute a program, print the result
  zkvm prove  <program.zkasm> <out.proof>  execute + generate a STARK proof
  zkvm verify <program.zkasm> <in.proof>   verify a proof against a program
  zkvm deploy <program.zkasm> [--server URL] [--out out.proof]
                                            push a program to a zkvm-host-server
                                            and save back the proof it returns
  zkvm demo                                execute/prove/verify + tamper checks`}</Code>
          <p>Running the binary with no arguments, or an unrecognized subcommand, prints exactly this and exits 0.</p>
        </Section>

        {COMMANDS.map((c) => (
          <Section key={c.name} title={<code className="text-[#00ff41]">{c.usage}</code>}>
            <p>{c.desc}</p>
            <Code>{c.output}</Code>
          </Section>
        ))}

        <Section title="Every command shares one error convention">
          <p>
            A failure prints <code className="text-[#00ff41]">error: &lt;message&gt;</code> to stderr and exits with a
            non-zero status. There is no separate verbose/quiet mode, and no global flags -- the entire CLI surface is the
            five subcommands above.
          </p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Source: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/crates/zkvm-cli/src/main.rs`}>crates/zkvm-cli/src/main.rs</a>.
          Related: <Link to="/getting-started" className="text-[#00ff41] underline">Getting Started</Link>, <Link to="/examples" className="text-[#00ff41] underline">Examples</Link>.
        </div>
      </div>
    </section>
  );
}
