import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: '.zkasm Language Specification',
  description: 'The complete, real instruction set: INIT, ADD, SUB, MUL, JZ, JNZ, LOAD, STORE -- exact syntax, semantics, and the forward-only jump constraint, verified against the actual parser source.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/zkasm-spec',
};

const OPCODES = [
  { op: 'INIT n', desc: 'Sets the accumulator to n. Must be the first line of every program -- the parser rejects anything else.' },
  { op: 'ADD n', desc: 'acc = acc + n' },
  { op: 'SUB n', desc: 'acc = acc − n' },
  { op: 'MUL n', desc: 'acc = acc × n' },
  { op: 'JZ label', desc: 'Jump to label if acc == 0. Forward-only: the target must be a strictly later instruction, or parsing fails.' },
  { op: 'JNZ label', desc: 'Jump to label if acc != 0. Same forward-only constraint as JZ.' },
  { op: 'LOAD rN', desc: 'acc = registers[N]' },
  { op: 'STORE rN', desc: 'registers[N] = acc' },
];

function Code({ children }) {
  return <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">{children}</pre>;
}

export default function ZkasmSpec() {
  usePageMeta({
    title: '.zkasm Language Spec',
    description: 'The complete real instruction set (INIT/ADD/SUB/MUL/JZ/JNZ/LOAD/STORE), exact syntax, and the forward-only jump constraint -- verified against the actual parser.',
    path: '/zkasm-spec',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Language Spec"
          title=".ZKASM"
          accent="INSTRUCTION SET"
          dek="Everything below is verified against crates/zkvm-isa/src/lib.rs directly -- including the exact error messages the parser produces."
        />

        <div className="border-t border-[#00ff41]/10 pt-10 mb-10">
          <h2 className="font-mono text-lg text-white mb-4">The machine model</h2>
          <p className="font-mono text-sm text-gray-400 leading-relaxed mb-4">
            One accumulator (<code className="text-[#00ff41]">acc</code>), and 4 fixed registers (<code className="text-[#00ff41]">r0</code>–<code className="text-[#00ff41]">r3</code>) --
            not general-purpose memory, scratch space for holding a second live value across arithmetic. No dynamic addressing, no stack, no heap.
          </p>
        </div>

        <div className="border-t border-[#00ff41]/10 pt-10 mb-10">
          <h2 className="font-mono text-lg text-white mb-4">Opcodes</h2>
          <div className="space-y-3">
            {OPCODES.map((o, i) => (
              <div key={i} className="border border-[#00ff41]/20 bg-black/50 p-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <code className="text-[#00ff41] font-mono text-sm sm:w-32 shrink-0">{o.op}</code>
                <span className="font-mono text-xs text-gray-400">{o.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#00ff41]/10 pt-10 mb-10">
          <h2 className="font-mono text-lg text-white mb-4">Example program</h2>
          <Code>{`INIT 5      # starting accumulator value
ADD 3       # acc = acc + 3
STORE r0    # registers[0] = acc
JZ done     # forward jump to a label, taken if acc == 0
MUL 2       # acc = acc * 2
LOAD r0     # acc = registers[0]
done:
SUB 4       # acc = acc - 4`}</Code>
        </div>

        <div className="border-t border-[#00ff41]/10 pt-10 mb-10">
          <h2 className="font-mono text-lg text-white mb-4">The forward-only jump rule</h2>
          <p className="font-mono text-sm text-gray-400 leading-relaxed mb-4">
            <code className="text-[#00ff41]">JZ</code>/<code className="text-[#00ff41]">JNZ</code> targets are labels, resolved at parse
            time, and must point to a strictly later instruction. This isn't a style preference -- it's why loops aren't supported
            yet: forward-only jumps guarantee no instruction is ever visited twice, so the trace has exactly one row per static
            instruction, known at parse time. A real loop would make trace length depend on runtime behavior, which the current AIR
            doesn't handle. See <Link to="/faq" className="text-[#00ff41] underline">the FAQ</Link> and
            {' '}<a className="text-[#00ff41] underline" href={`${REPO}/blob/main/docs/ROADMAP.md`}>the real roadmap</a> for what changes when that's added.
          </p>
          <p className="font-mono text-xs text-gray-500">The actual parser error for a backward jump: <code className="text-gray-400">"backward or self jump to '&lt;label&gt;' (target &lt;=n&gt; &lt;= instruction &lt;n&gt;): only forward jumps are supported"</code></p>
        </div>

        <div className="border-t border-[#00ff41]/10 pt-10">
          <h2 className="font-mono text-lg text-white mb-4">Source</h2>
          <p className="font-mono text-xs text-gray-500">
            Parser, execution, and every rule above: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/crates/zkvm-isa/src/lib.rs`}>crates/zkvm-isa/src/lib.rs</a>.
            More real example programs: <a className="text-[#00ff41] underline" href={`${REPO}/tree/main/examples`}>examples/</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
