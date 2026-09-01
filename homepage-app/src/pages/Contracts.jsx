import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { REPO } from '../lib/constants';
import { usePageMeta, usePageJsonLd } from '../lib/seo';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'The Foundry Contracts: ProofOrchestrator and Its Pluggable Verifiers',
  description: 'The real Solidity contracts -- IProofVerifier, AttestedVerifier, UnimplementedStarkVerifier, and the ProofOrchestrator that pays provers -- plus what each of the 8 real Foundry tests actually checks.',
  author: { '@type': 'Organization', name: 'zkvm.host' },
  mainEntityOfPage: 'https://www.zkvm.host/contracts',
};

const TESTS = [
  { name: 'test_submitProof_alwaysRevertsWithoutARealVerifier', prevents: 'Payment without a real verifier configured -- the default state is "pays nothing," not "pays on faith."' },
  { name: 'test_paysOutOnlyAfterAttestation', prevents: 'A prover collecting a reward before the attester has actually attested.' },
  { name: 'test_rejectsProofBytesThatDontMatchTheAttestation', prevents: 'Submitting different proof bytes than the ones the attester actually attested to.' },
  { name: 'test_onlyAttesterCanAttest', prevents: 'Anyone other than the configured attester address calling attest().' },
  { name: 'test_cannotDoubleFulfill', prevents: 'Claiming the same reward twice for one task.' },
  { name: 'test_onlyTheClaimingProverCanSubmit', prevents: 'A different address than the one that claimed the task submitting a proof for it.' },
  { name: 'test_cannotClaimAnAlreadyClaimedTask', prevents: 'Two provers racing to claim the same task and both succeeding.' },
  { name: 'test_cannotClaimOrSubmitForAnUnknownTask', prevents: 'Referencing a task ID that was never created.' },
];

function Section({ title, children }) {
  return (
    <div className="border-t border-[#00ff41]/10 pt-10 mt-10">
      <h2 className="font-mono text-lg text-white mb-4 tracking-wide">{title}</h2>
      <div className="font-mono text-sm text-gray-400 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

export default function Contracts() {
  usePageMeta({
    title: 'Contracts',
    description: 'The real Solidity contracts -- IProofVerifier, AttestedVerifier, UnimplementedStarkVerifier, ProofOrchestrator -- and what each of the 8 real Foundry tests actually checks.',
    path: '/contracts',
  });
  usePageJsonLd(JSON_LD);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <PageHero
          eyebrow="Contracts"
          title="FOUR CONTRACTS,"
          accent="ONE INTERFACE"
          dek="An on-chain task/reward orchestrator that delegates every accept/reject decision to a pluggable verifier -- so 'how do we know a proof is valid' stays fully swappable."
        />

        <Section title="IProofVerifier">
          <p>The interface every verifier implements. One function:</p>
          <pre className="bg-black border border-[#00ff41]/20 p-4 overflow-x-auto text-[#00ff41] text-xs">{`function verify(bytes calldata proof, bytes32 publicInputsHash)
    external view returns (bool);`}</pre>
          <p><code className="text-[#00ff41]">publicInputsHash</code> is <code className="text-[#00ff41]">keccak256</code> of the exact <code className="text-[#00ff41]">.zkasm</code> program text -- the program fully determines (initial value, instructions, result), so hashing it is enough to pin down what's being claimed.</p>
        </Section>

        <Section title="UnimplementedStarkVerifier">
          <p>Every call reverts. Exists so <code className="text-[#00ff41]">ProofOrchestrator</code> has a default verifier that fails closed rather than silently accepting anything — "no real on-chain STARK verifier exists yet" is a compileable, testable fact, not just a line in documentation.</p>
        </Section>

        <Section title="AttestedVerifier">
          <p>Checks an ECDSA signature from one designated attester key over the claimed proof result — not the STARK proof itself. See <Link to="/threat-model" className="text-[#00ff41] underline">the Threat Model page</Link> for the exact trust assumption this creates, and <Link to="/onchain-verifier" className="text-[#00ff41] underline">what a real verifier would require</Link> instead.</p>
        </Section>

        <Section title="ProofOrchestrator: the 8 real tests">
          <p>Access-control and state-machine coverage for "who can trigger a payment, and when" — not the cryptography, which is <code className="text-[#00ff41]">zkvm-stark</code>'s job and is tested separately in Rust.</p>
          <div className="space-y-2 mt-4">
            {TESTS.map((t, i) => (
              <div key={i} className="border border-[#00ff41]/20 bg-black/50 p-4">
                <code className="text-[#00ff41] text-xs break-all">{t.name}</code>
                <p className="text-gray-400 text-xs mt-2">{t.prevents}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="mt-10 text-center font-mono text-xs text-gray-500">
          Source: <a className="text-[#00ff41] underline" href={`${REPO}/tree/main/contracts/src`}>contracts/src/</a>,{' '}
          tests: <a className="text-[#00ff41] underline" href={`${REPO}/blob/main/contracts/test/ProofOrchestrator.t.sol`}>contracts/test/ProofOrchestrator.t.sol</a>.
          Run them: <code className="text-[#00ff41]">cd contracts && forge test</code>. Checked in CI: <Link to="/ci" className="text-[#00ff41] underline">the CI page</Link>.
        </div>
      </div>
    </section>
  );
}
