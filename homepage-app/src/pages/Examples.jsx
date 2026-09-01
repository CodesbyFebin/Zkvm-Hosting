import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'Real .zkasm Example Programs',
  description: 'The three real example programs shipped in examples/ -- branching, register/memory state, and straight-line arithmetic -- with their exact source and the CI loop that proves and verifies each one.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/examples',
};

function Code({ children }) {
  return <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs whitespace-pre">{children}</pre>;
}

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

const EXAMPLES = [
  {
    file: 'fibonacci_like.zkasm',
    what: 'The simplest case: straight-line accumulator arithmetic, no branches, no registers.',
    source: `# ((5 + 3) * 2) - 4 = 12
INIT 5
ADD 3
MUL 2
SUB 4`,
    note: 'This is the exact program cmd_demo hardcodes to walk through prove/verify/tamper -- see the CLI Reference.',
  },
  {
    file: 'branching.zkasm',
    what: 'Exercises JZ -- a forward-only conditional jump -- with two genuinely different control-flow paths depending on the initial value.',
    source: `# If (initial - 5) == 0, skip the multiply and just add 1.
# Otherwise, multiply by 100 before adding 1.
#
# initial=5  => ((5-5)=0, jump taken)     => 0 + 1        = 1
# initial=8  => ((8-5)=3, jump not taken) => (3 * 100) + 1 = 301
INIT 5
SUB 5
JZ skip
MUL 100
skip:
ADD 1`,
    note: 'The AIR has to prove which branch actually ran, not just that some valid branch exists -- see the transition constraints on the Architecture page.',
  },
  {
    file: 'counter.zkasm',
    what: 'Exercises STORE and LOAD -- proves the register file holds state across other instructions, not just "the last computed value."',
    source: `# Stash the starting value in r0, add 100 to the accumulator, then bring the
# original value back to prove the register file actually holds state across
# other instructions (not just "the last thing computed").
#
# initial=7 => STORE r0 (r0=7), ADD 100 (acc=107), LOAD r0 (acc=7) => 7
INIT 7
STORE r0
ADD 100
LOAD r0`,
    note: 'r0 is one of four fixed registers -- LOAD/STORE address a literal register number, not a computed memory address. See the .zkasm Spec for the full register model.',
  },
];

export default function Examples() {
  usePageMeta({
    title: 'Example Programs',
    description: 'The three real .zkasm example programs in examples/ -- exact source, what each one exercises, and how CI proves and verifies all of them on every PR.',
    path: '/examples',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Examples"
          title="REAL"
          accent="PROGRAMS"
          dek="Three .zkasm files, verbatim from examples/. Every one of them is deployed to a live server and proved plus verified on every pull request -- see CI."
        />

        {EXAMPLES.map((ex) => (
          <Section key={ex.file} title={<code className="text-[#00ff41]">examples/{ex.file}</code>}>
            <p>{ex.what}</p>
            <Code>{ex.source}</Code>
            <p className="text-xs text-gray-500">{ex.note}</p>
          </Section>
        ))}

        <Section title="Running any of these yourself">
          <Code>{`zkvm run examples/branching.zkasm
zkvm prove examples/branching.zkasm out.proof
zkvm verify examples/branching.zkasm out.proof`}</Code>
          <p>Or skip local proving entirely with <code className="text-[#00ff41]">zkvm deploy examples/branching.zkasm</code> against a running <code className="text-[#00ff41]">zkvm-host-server</code> -- see the CLI Reference for every subcommand.</p>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Source: <a className="text-[#00ff41] underline" href={`${REPO}/tree/main/examples`}>examples/</a>.
          Related: <Link to="/cli-reference" className="text-[#00ff41] underline">CLI Reference</Link>, <Link to="/zkasm-spec" className="text-[#00ff41] underline">.zkasm Spec</Link>, <Link to="/ci" className="text-[#00ff41] underline">CI</Link>.
        </div>
      </div>
    </section>
  );
}
