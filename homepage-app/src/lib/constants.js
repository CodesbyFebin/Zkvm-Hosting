export const REPO = 'https://github.com/CodesbyFebin/rust-stark-zkvm';

// A real CLI transcript, not a fictional boot sequence.
export const TERMINAL_LINES = [
  { text: '$ zkvm prove examples/fibonacci_like.zkasm out.proof', type: 'command' },
  { text: 'Parsing program... OK', type: 'success' },
  { text: 'Executing (zkvm-isa)... OK', type: 'success' },
  { text: 'Generating STARK proof (Winterfell)... OK', type: 'success' },
  { text: 'Proof size: ~11 KB', type: 'info' },
  { text: '✓ Proof written: out.proof', type: 'success' },
  { text: '$ zkvm verify examples/fibonacci_like.zkasm out.proof', type: 'command' },
  { text: '✓ Verified in ~5.5ms — no secret witness', type: 'success' },
  { text: '> _', type: 'cursor' },
];

export const FEATURES = [
  {
    icon: '✓',
    title: 'Verifiable Computation',
    desc: 'Prove a specific program executed correctly. The verifier re-executes it itself, so there is no secret witness standing behind the proof.',
    status: 'implemented',
    detail: 'Every column but the accumulator and registers is asserted directly (as a boundary constraint) against the specific program and its actual execution, for every row. The verifier already knows the correct value because it re-executed the program -- see the Architecture page for the full argument.',
  },
  {
    icon: '◆',
    title: 'STARK Proofs',
    desc: 'Built with Winterfell. FRI-based, transparent -- no trusted setup ceremony.',
    status: 'implemented',
    detail: 'zkvm-stark::prove_program and verify_program wrap Winterfell\'s prover/verifier. Real proof, ~11 KB, ~5.5ms to verify on the reference workload.',
  },
  {
    icon: '⛭',
    title: 'No Secret Witness',
    desc: 'Program and inputs are fully public. Branch outcomes and register accesses are asserted directly, not derived through an algebraic gadget.',
    status: 'implemented',
    detail: 'No lookup argument, no permutation check, no auxiliary trace segment. Nine boundary assertions per row plus two transition-constraint shapes (accumulator, register) is the entire AIR.',
  },
  {
    icon: '⛓',
    title: 'On-Chain Attestation',
    desc: 'A designated attester signs off on a proof verified off-chain. A documented trust bridge, not a cryptographic on-chain STARK check.',
    status: 'implemented',
    detail: 'AttestedVerifier.sol checks an ECDSA signature from one designated attester key over the claimed proof result -- not the STARK proof itself. 8 Foundry tests cover the access-control and state-machine surface.',
  },
  {
    icon: '⚙',
    title: 'Hardened HTTP Service',
    desc: 'Body-size limits, request timeouts, concurrency caps, and a benchmarked 2,000-instruction ceiling -- proving time grows worse than linearly past that.',
    status: 'implemented',
    detail: '1 MB body limit, 60s timeout, 4 concurrent requests, and a 2,000-instruction cap derived from real measurements (1,000 instr. ≈ 1.2s, 2,000 ≈ 6.0s, 4,000 ≈ 32.0s).',
  },
  {
    icon: '⌘',
    title: 'MCP Server',
    desc: 'prove and verify exposed as real MCP tools, verified with an actual initialize → tools/list → tools/call handshake.',
    status: 'implemented',
    detail: 'Runs on its own port (4478) rather than nested onto the HTTP API -- rmcp\'s StreamableHttpService response type doesn\'t line up with axum::Router::nest_service without an adapter layer.',
  },
  {
    icon: '↻',
    title: 'Loops & Addressable Memory',
    desc: 'Backward jumps and dynamic memory addressing -- the next two items in the real engineering roadmap, not yet built.',
    status: 'roadmap',
    detail: 'JZ/JNZ can only jump forward today, and LOAD/STORE address one of four fixed registers, not dynamic memory. Both are named, scoped gaps in docs/ROADMAP.md, not silent omissions.',
  },
  {
    icon: '⛰',
    title: 'RV32I Compatibility',
    desc: 'A standard RISC-V subset instead of the custom .zkasm ISA -- researched direction, not started.',
    status: 'roadmap',
    detail: 'Listed after loops and addressable memory in the real roadmap ordering.',
  },
  {
    icon: '∞',
    title: 'Recursive Proof Compression',
    desc: 'The only path to a trustless on-chain verifier for this specific AIR -- a literature-review scope, not an implementation.',
    status: 'research',
    detail: 'docs/RECURSION.md is a review of what recursive STARK compression would require for this AIR specifically. Nothing here is inherited for free from another prover\'s recursion pipeline.',
  },
];

export const ARCHITECTURE_STEPS = [
  { label: 'PROGRAM', sub: '.zkasm source', icon: '</>' },
  { label: 'ZKVM-ISA', sub: 'Execute in VM', icon: 'Z' },
  { label: 'STARK PROVER', sub: 'Winterfell engine', icon: '✻' },
  { label: 'PROOF', sub: '~11 KB', icon: '◫' },
  { label: 'VERIFIER', sub: 'CLI · HTTP · MCP', icon: '✓' },
  { label: 'ON-CHAIN', sub: 'Attestation', icon: '◇' },
];

export const USE_CASES = [
  { icon: '🔒', title: 'Private Computation', desc: 'Would need a secret-witness AIR this project does not implement -- today’s design is public-input only, on purpose.' },
  { icon: '◈', title: 'L2 & Rollups', desc: 'The general shape rollups use validity proofs for -- not integrated with any rollup stack here.' },
  { icon: '🧠', title: 'AI / ML Inference', desc: 'Proving a model ran correctly is the same problem shape as proving any program did -- no ML-specific tooling exists in this repo.' },
  { icon: '📈', title: 'Verifiable Backtests', desc: 'Proving an arithmetic pipeline executed as claimed, without a trading-specific AIR.' },
  { icon: '🗄', title: 'Data Integrity', desc: 'Proving a data-processing pipeline ran as claimed -- the same accumulator/register model, applied to a different program.' },
  { icon: '🏢', title: 'Auditable Compute', desc: 'A verifiable record that a specific computation happened, for contexts that need it checkable rather than just logged.' },
];

export const TECH_STACK = [
  { name: 'Rust', icon: 'R' },
  { name: 'Winterfell', icon: 'W' },
  { name: 'STARK', icon: '✻' },
  { name: 'CLI', icon: '>_' },
  { name: 'MCP Server', icon: 'M' },
  { name: 'HTTP API', icon: '⊞' },
  { name: 'Solidity', icon: 'S' },
  { name: 'Ethereum', icon: '◇' },
];

export const STATUS_COLORS = {
  implemented: 'text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/10',
  experimental: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  roadmap: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
  research: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
};

export const STATUS_LABELS = {
  implemented: 'IMPLEMENTED',
  experimental: 'EXPERIMENTAL',
  roadmap: 'ROADMAP',
  research: 'RESEARCH',
};

export const BENCHMARKS = [
  { label: 'Proof Size', value: '~11 KB' },
  { label: 'Verify Time', value: '~5.5ms' },
  { label: 'Prove (1,000 instr.)', value: '~1.2s' },
  { label: 'Prove (2,000 instr.)', value: '~6.0s' },
];

export const NAV_LINKS = [
  { to: '/architecture', label: 'Architecture' },
  { to: '/features', label: 'Features' },
  { to: '/playground', label: 'Playground' },
  { to: '/benchmarks', label: 'Benchmarks' },
  { to: '/faq', label: 'FAQ' },
];
