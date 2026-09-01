import React, { useState, useEffect } from 'react';

const REPO = 'https://github.com/CodesbyFebin/rust-stark-zkvm';

// A real CLI transcript, not a fictional boot sequence. Declared at module
// scope (a constant, not rebuilt per render/effect run) so the terminal's
// visible-line count can never index past the end of a *different* array.
const TERMINAL_LINES = [
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

// Isolated in its own component so its 10x/second state updates don't
// re-render the rest of the page.
function MatrixRain() {
  const [matrixChars, setMatrixChars] = useState([]);

  useEffect(() => {
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const initial = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      char: chars[Math.floor(Math.random() * chars.length)],
      speed: 0.3 + Math.random() * 0.7,
      opacity: 0.1 + Math.random() * 0.3,
    }));
    setMatrixChars(initial);

    const interval = setInterval(() => {
      setMatrixChars(prev => prev.map(c => ({
        ...c,
        y: (c.y + c.speed) % 100,
        char: chars[Math.floor(Math.random() * chars.length)],
      })));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {matrixChars.map(c => (
        <div
          key={c.id}
          className="absolute font-mono text-[10px]"
          style={{ left: `${c.x}%`, top: `${c.y}%`, color: '#00ff41', opacity: c.opacity }}
        >
          {c.char}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [terminalCount, setTerminalCount] = useState(0);
  const [playgroundCode, setPlaygroundCode] = useState('INIT 7\nMUL 6\nADD 1');
  const [playgroundOutput, setPlaygroundOutput] = useState(null);
  const [playgroundRunning, setPlaygroundRunning] = useState(false);
  const [playgroundStage, setPlaygroundStage] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Reveals TERMINAL_LINES one at a time. Written so a duplicate effect
  // invocation (StrictMode, HMR, or otherwise) can only ever converge the
  // count toward the same end state -- never index past the array's end.
  useEffect(() => {
    let intervalId;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setTerminalCount(c => {
          const next = Math.min(c + 1, TERMINAL_LINES.length);
          if (next >= TERMINAL_LINES.length) clearInterval(intervalId);
          return next;
        });
      }, 350);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  // Playground -- a real interpreter for the real opcodes (INIT/ADD/SUB/MUL), run
  // entirely in the browser. It does not generate or verify a real STARK proof;
  // the pipeline below and its numbers are illustrative, clearly labeled as such.
  const runPlayground = () => {
    setPlaygroundRunning(true);
    setPlaygroundOutput(null);
    setPlaygroundStage(0);

    const stages = [
      { name: 'Parsing', time: 300 },
      { name: 'Executing', time: 700 },
      { name: 'Building trace', time: 1100 },
      { name: 'Arithmetizing (AIR)', time: 1500 },
      { name: 'Generating STARK proof', time: 1900 },
      { name: 'Verifying', time: 2300 },
    ];

    stages.forEach((stage, idx) => {
      setTimeout(() => setPlaygroundStage(idx + 1), stage.time);
    });

    setTimeout(() => {
      const lines = playgroundCode.split('\n').filter(l => l.trim());
      let result = 0;
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const op = parts[0].toUpperCase();
        const val = parseInt(parts[1], 10) || 0;
        if (op === 'INIT') result = val;
        else if (op === 'MUL') result *= val;
        else if (op === 'ADD') result += val;
        else if (op === 'SUB') result -= val;
      });

      setPlaygroundOutput({ result, instructions: lines.length, status: 'VERIFIED' });
      setPlaygroundRunning(false);
      setPlaygroundStage(6);
    }, 2600);
  };

  const features = [
    {
      icon: '✓',
      title: 'Verifiable Computation',
      desc: 'Prove a specific program executed correctly. The verifier re-executes it itself, so there is no secret witness standing behind the proof.',
      status: 'implemented',
    },
    {
      icon: '◆',
      title: 'STARK Proofs',
      desc: 'Built with Winterfell. FRI-based, transparent -- no trusted setup ceremony.',
      status: 'implemented',
    },
    {
      icon: '⛭',
      title: 'No Secret Witness',
      desc: 'Program and inputs are fully public. Branch outcomes and register accesses are asserted directly, not derived through an algebraic gadget.',
      status: 'implemented',
    },
    {
      icon: '⛓',
      title: 'On-Chain Attestation',
      desc: 'A designated attester signs off on a proof verified off-chain. A documented trust bridge, not a cryptographic on-chain STARK check.',
      status: 'implemented',
    },
    {
      icon: '⚙',
      title: 'Hardened HTTP Service',
      desc: 'Body-size limits, request timeouts, concurrency caps, and a benchmarked 2,000-instruction ceiling -- proving time grows worse than linearly past that.',
      status: 'implemented',
    },
    {
      icon: '↻',
      title: 'Loops & Addressable Memory',
      desc: 'Backward jumps and dynamic memory addressing -- the next two items in the real engineering roadmap, not yet built.',
      status: 'roadmap',
    },
  ];

  const architectureSteps = [
    { label: 'PROGRAM', sub: '.zkasm source', icon: '</>' },
    { label: 'ZKVM-ISA', sub: 'Execute in VM', icon: 'Z' },
    { label: 'STARK PROVER', sub: 'Winterfell engine', icon: '✻' },
    { label: 'PROOF', sub: '~11 KB', icon: '◫' },
    { label: 'VERIFIER', sub: 'CLI · HTTP · MCP', icon: '✓' },
    { label: 'ON-CHAIN', sub: 'Attestation', icon: '◇' },
  ];

  const useCases = [
    { icon: '🔒', title: 'Private Computation', desc: 'Would need a secret-witness AIR this project does not implement -- today’s design is public-input only, on purpose.' },
    { icon: '◈', title: 'L2 & Rollups', desc: 'The general shape rollups use validity proofs for -- not integrated with any rollup stack here.' },
    { icon: '🧠', title: 'AI / ML Inference', desc: 'Proving a model ran correctly is the same problem shape as proving any program did -- no ML-specific tooling exists in this repo.' },
    { icon: '📈', title: 'Verifiable Backtests', desc: 'Proving an arithmetic pipeline executed as claimed, without a trading-specific AIR.' },
    { icon: '🗄', title: 'Data Integrity', desc: 'Proving a data-processing pipeline ran as claimed -- the same accumulator/register model, applied to a different program.' },
    { icon: '🏢', title: 'Auditable Compute', desc: 'A verifiable record that a specific computation happened, for contexts that need it checkable rather than just logged.' },
  ];

  const techStack = [
    { name: 'Rust', icon: 'R' },
    { name: 'Winterfell', icon: 'W' },
    { name: 'STARK', icon: '✻' },
    { name: 'CLI', icon: '>_' },
    { name: 'MCP Server', icon: 'M' },
    { name: 'HTTP API', icon: '⊞' },
    { name: 'Solidity', icon: 'S' },
    { name: 'Ethereum', icon: '◇' },
  ];

  const statusColors = {
    implemented: 'text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/10',
    experimental: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    roadmap: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
  };

  const statusLabels = {
    implemented: 'IMPLEMENTED',
    experimental: 'EXPERIMENTAL',
    roadmap: 'ROADMAP',
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans overflow-x-hidden">
      {/* Matrix background */}
      <MatrixRain />

      {/* Scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff41 2px, #00ff41 4px)' }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-[#00ff41]/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#00ff41] flex items-center justify-center relative">
              <span className="font-mono text-[#00ff41] font-bold text-lg">Z</span>
              <div className="absolute inset-0 bg-[#00ff41]/5" />
            </div>
            <div>
              <div className="font-mono font-bold text-white tracking-wider">zkVM<span className="text-[#00ff41]">.host</span></div>
              <div className="text-[9px] text-gray-500 font-mono tracking-widest">STARK PROVING INFRASTRUCTURE</div>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-8">
            {[['features', 'Features'], ['architecture', 'Architecture'], ['playground', 'Playground'], ['benchmarks', 'Benchmarks'], ['blog', 'Blog']].map(([id, label]) => (
              id === 'blog' ? (
                <a key={id} href="/blog/" className="font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-[#00ff41] transition-colors">{label}</a>
              ) : (
                <a key={id} href={`#${id}`} className="font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-[#00ff41] transition-colors">{label}</a>
              )
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a href={REPO} target="_blank" rel="noreferrer" className="hidden md:inline-flex px-4 py-2 border border-[#00ff41]/30 text-[#00ff41] font-mono text-xs hover:bg-[#00ff41]/10 transition-colors">
              $ git clone
            </a>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-[#00ff41] font-mono" aria-label="Toggle menu">
              [≡]
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#00ff41]/20 bg-black/95">
            {[['features', 'Features'], ['architecture', 'Architecture'], ['playground', 'Playground'], ['benchmarks', 'Benchmarks']].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-6 py-3 font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-[#00ff41] hover:bg-[#00ff41]/5">
                $ {label}
              </a>
            ))}
            <a href="/blog/" className="block w-full text-left px-6 py-3 font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-[#00ff41] hover:bg-[#00ff41]/5">$ blog</a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section id="top" className="relative min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeUp" style={{ animationDuration: '0.8s' }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-[#00ff41] animate-pulse" />
                <span className="font-mono text-xs text-[#00ff41] tracking-widest">RUST STARK ZKVM</span>
              </div>

              <h1 className="font-mono font-black text-5xl md:text-6xl lg:text-7xl text-white leading-[0.95] mb-6 tracking-tight">
                RUST STARK<br />
                <span className="text-[#00ff41]">ZKVM</span>
              </h1>

              <div className="font-mono text-lg md:text-xl text-gray-400 mb-4 tracking-wider">
                STARK-VERIFIABLE VIRTUAL MACHINE
              </div>
              <div className="font-mono text-2xl md:text-3xl text-[#00ff41] mb-8 tracking-wide">
                FOR PROVABLE COMPUTATION
              </div>

              <div className="flex flex-wrap gap-4 mb-10">
                <div className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                  <span className="text-[#00ff41]">◇</span>
                  <span className="font-mono text-xs text-gray-300">OPEN SOURCE</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                  <span className="text-[#00ff41]">&lt;/&gt;</span>
                  <span className="font-mono text-xs text-gray-300">MIT LICENSED</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/20 bg-[#00ff41]/5">
                  <span className="text-[#00ff41]">✓</span>
                  <span className="font-mono text-xs text-gray-300">NO SECRET WITNESS</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <a href="#playground" className="px-8 py-3 bg-[#00ff41] text-black font-mono font-bold text-sm hover:bg-[#00ff41]/80 transition-colors tracking-wider">
                  GET STARTED &gt;
                </a>
                <a href={REPO} target="_blank" rel="noreferrer" className="px-8 py-3 border border-[#00ff41]/40 text-[#00ff41] font-mono text-sm hover:bg-[#00ff41]/10 transition-colors tracking-wider">
                  VIEW GITHUB
                </a>
              </div>
            </div>

            <div className="relative animate-fadeUp" style={{ animationDuration: '0.8s', animationDelay: '0.15s' }}>
              <div className="absolute -inset-4 bg-[#00ff41]/5 blur-3xl" />
              <div className="relative border border-[#00ff41]/30 bg-black/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 font-mono text-[10px] text-gray-500">zkvm — real CLI transcript</span>
                </div>
                <div className="p-6 font-mono text-sm min-h-[320px]">
                  {TERMINAL_LINES.slice(0, terminalCount).map((line, idx) => (
                    <div
                      key={idx}
                      className={`mb-1 animate-fadeUp ${
                        line.type === 'command' ? 'text-white' :
                        line.type === 'success' ? 'text-[#00ff41]' :
                        line.type === 'info' ? 'text-gray-400' : 'text-[#00ff41]'
                      }`}
                      style={{ animationDuration: '0.25s' }}
                    >
                      {line.text}
                      {line.type === 'cursor' && <span className="inline-block w-2 h-4 bg-[#00ff41] ml-1 animate-pulse" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -top-8 -right-8 w-24 h-24 border-2 border-[#00ff41]/30 rotate-45 flex items-center justify-center">
                <div className="w-16 h-16 border border-[#00ff41]/50 rotate-45 flex items-center justify-center">
                  <span className="font-mono text-[#00ff41] font-bold text-2xl -rotate-45">Z</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status bar -- only things that are actually true */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4">
            {['STARK PROVER', 'VERIFIER', 'CLI + HTTP + MCP', 'OPEN SOURCE', 'MIT LICENSED', 'NO SECRET WITNESS'].map((label, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 border border-[#00ff41]/10 bg-[#00ff41]/5">
                <span className="text-[#00ff41]">✓</span>
                <span className="font-mono text-xs text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— FEATURES —</div>
            <h2 className="font-mono font-bold text-4xl md:text-5xl text-white mb-4">
              BUILT FOR <span className="text-[#00ff41]">VERIFIABLE</span> COMPUTE
            </h2>
            <p className="font-mono text-sm text-gray-500 max-w-2xl mx-auto">
              Every feature is explicitly marked with its implementation state. No marketing fiction.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="group border border-[#00ff41]/20 bg-black/50 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/5 transition-all p-6 animate-fadeUp"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 border border-[#00ff41]/30 flex items-center justify-center text-[#00ff41] text-xl font-mono">
                    {f.icon}
                  </div>
                  <span className={`font-mono text-[9px] px-2 py-1 border ${statusColors[f.status]}`}>
                    {statusLabels[f.status]}
                  </span>
                </div>
                <h3 className="font-mono font-bold text-white text-sm mb-2 tracking-wider">{f.title}</h3>
                <p className="font-mono text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— ARCHITECTURE OVERVIEW —</div>
            <h2 className="font-mono font-bold text-4xl md:text-5xl text-white">
              PROGRAM <span className="text-[#00ff41]">→</span> PROOF <span className="text-[#00ff41]">→</span> VERIFY
            </h2>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff41]/30 to-transparent -translate-y-1/2" />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {architectureSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="relative border border-[#00ff41]/20 bg-black/80 p-6 text-center hover:border-[#00ff41]/50 transition-all animate-fadeUp"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="font-mono text-3xl text-[#00ff41] mb-3">{step.icon}</div>
                  <div className="font-mono text-xs font-bold text-white tracking-wider mb-1">{step.label}</div>
                  <div className="font-mono text-[10px] text-gray-500">{step.sub}</div>
                  {idx < architectureSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-[#00ff41] font-mono text-lg">→</div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 border border-violet-400/30 bg-violet-400/5">
                <span className="font-mono text-xs text-violet-400 tracking-wider">ACCESS: CLI · HTTP API · MCP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built With */}
      <section className="relative py-16 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-8 text-center">— BUILT WITH —</div>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((t, idx) => (
              <div key={idx} className="flex items-center gap-3 px-5 py-3 border border-[#00ff41]/20 bg-black/50 hover:border-[#00ff41]/40 transition-all">
                <div className="w-8 h-8 border border-[#00ff41]/30 flex items-center justify-center font-mono text-[#00ff41] text-sm">
                  {t.icon}
                </div>
                <span className="font-mono text-sm text-gray-300">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Playground */}
      <section id="playground" className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— PROOF PLAYGROUND (SIMULATED) —</div>
            <h2 className="font-mono font-bold text-4xl md:text-5xl text-white mb-4">
              BUILD. <span className="text-[#00ff41]">PROVE.</span> VERIFY.
            </h2>
            <p className="font-mono text-sm text-gray-500 max-w-2xl mx-auto">
              Enter a tiny program using real opcodes (INIT/ADD/SUB/MUL). This runs the arithmetic in your browser and
              animates the real pipeline stages — it does not generate or verify an actual STARK proof. For a real one,
              see the <a className="text-[#00ff41] underline" href="#benchmarks">measured benchmarks</a> or run the CLI yourself.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="border border-[#00ff41]/30 bg-black/80">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
                <span className="font-mono text-xs text-gray-400">program.zkasm</span>
                <span className="font-mono text-[10px] text-[#00ff41]">EDITABLE</span>
              </div>
              <textarea
                value={playgroundCode}
                onChange={(e) => setPlaygroundCode(e.target.value)}
                disabled={playgroundRunning}
                className="w-full h-64 bg-black p-4 font-mono text-sm text-[#00ff41] resize-none focus:outline-none disabled:opacity-50"
                placeholder="INIT 7&#10;MUL 6&#10;ADD 1"
                spellCheck={false}
              />
              <div className="px-4 py-3 border-t border-[#00ff41]/20 flex items-center justify-between">
                <span className="font-mono text-[10px] text-gray-500">
                  {playgroundCode.split('\n').filter(l => l.trim()).length} instructions
                </span>
                <button
                  onClick={runPlayground}
                  disabled={playgroundRunning}
                  className="px-6 py-2 bg-[#00ff41] text-black font-mono font-bold text-xs hover:bg-[#00ff41]/80 transition-colors disabled:opacity-50"
                >
                  {playgroundRunning ? 'RUNNING...' : '▶ RUN (SIMULATED)'}
                </button>
              </div>
            </div>

            <div className="border border-[#00ff41]/30 bg-black/80">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
                <span className="font-mono text-xs text-gray-400">execution pipeline</span>
                <span className="font-mono text-[10px] text-[#00ff41]">
                  {playgroundRunning ? 'PROCESSING' : playgroundOutput ? 'COMPLETE' : 'IDLE'}
                </span>
              </div>

              <div className="p-4 space-y-2 font-mono text-xs">
                {['Parsing', 'Executing', 'Building trace', 'Arithmetizing (AIR)', 'Generating STARK proof', 'Verifying'].map((name, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-[#00ff41]/5">
                    <div className={`w-4 h-4 border flex items-center justify-center text-[10px] ${
                      playgroundStage >= idx + 1 ? 'border-[#00ff41] bg-[#00ff41]/20 text-[#00ff41]' : 'border-gray-700 text-gray-700'
                    }`}>
                      {playgroundStage >= idx + 1 ? '✓' : idx + 1}
                    </div>
                    <span className={`flex-1 ${playgroundStage >= idx + 1 ? 'text-[#00ff41]' : 'text-gray-600'}`}>{name}</span>
                    {playgroundStage >= idx + 1 && <span className="text-[#00ff41]">OK</span>}
                  </div>
                ))}
              </div>

              {playgroundOutput && (
                <div className="p-4 border-t border-[#00ff41]/20 bg-[#00ff41]/5 space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-2 text-[#00ff41] font-bold">
                    <span>✓</span>
                    <span>Status: {playgroundOutput.status} (simulated)</span>
                  </div>
                  <div className="text-gray-400">Public output: <span className="text-white">{playgroundOutput.result}</span></div>
                  <div className="text-gray-400">Instructions: <span className="text-white">{playgroundOutput.instructions}</span></div>
                  <div className="text-gray-400">Typical real proof size: <span className="text-white">~11 KB</span></div>
                  <div className="text-gray-400">Typical real verify time: <span className="text-white">~5.5ms</span></div>
                  <div className="text-gray-600 text-[10px] pt-1">These two are real measured values from the actual CLI, shown for reference — not re-measured by this in-browser demo.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— POTENTIAL APPLICATIONS —</div>
            <h2 className="font-mono font-bold text-4xl md:text-5xl text-white mb-4">
              WHAT THE PRIMITIVE <span className="text-[#00ff41]">ENABLES</span>
            </h2>
            <p className="font-mono text-sm text-gray-500 max-w-2xl mx-auto">
              None of these are built integrations. This is what "prove a program executed correctly" is useful for in general — not a product roadmap.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((uc, idx) => (
              <div
                key={idx}
                className="border border-[#00ff41]/20 bg-black/50 p-6 hover:border-[#00ff41]/50 transition-all animate-fadeUp"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="text-3xl mb-4">{uc.icon}</div>
                <h3 className="font-mono font-bold text-white text-sm mb-2 tracking-wider">{uc.title}</h3>
                <p className="font-mono text-xs text-gray-500 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benchmarks */}
      <section id="benchmarks" className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— PERFORMANCE —</div>
            <h2 className="font-mono font-bold text-4xl md:text-5xl text-white mb-4">
              MEASURED. <span className="text-[#00ff41]">REPRODUCIBLE.</span>
            </h2>
            <p className="font-mono text-sm text-gray-500">
              measured 2026-08-31 · full methodology in the linked posts below
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Proof Size', value: '~11 KB' },
              { label: 'Verify Time', value: '~5.5ms' },
              { label: 'Prove (1,000 instr.)', value: '~1.2s' },
              { label: 'Prove (2,000 instr.)', value: '~6.0s' },
            ].map((m, idx) => (
              <div key={idx} className="border border-[#00ff41]/20 bg-black/50 p-6 text-center">
                <div className="font-mono text-3xl font-bold text-[#00ff41] mb-2">{m.value}</div>
                <div className="font-mono text-xs text-gray-500 tracking-wider">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="border border-[#00ff41]/20 bg-black/50 p-6 font-mono text-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#00ff41] tracking-wider">METHODOLOGY</span>
              <span className="text-[#00ff41]">✓ REPRODUCIBLE</span>
            </div>
            <div className="space-y-1 text-gray-400">
              <div><span className="text-[#00ff41]">Verify time:</span> 10 back-to-back real CLI runs verifying examples/fibonacci_like.zkasm — see the <a className="underline text-[#00ff41]/80" href="/blog/sub-10ms-verify/">sub-10ms verify post</a> for every raw sample.</div>
              <div><span className="text-[#00ff41]">Prove time:</span> benchmarked at 1,000/2,000/4,000 synthetic instructions to size the HTTP service's instruction cap — see the <a className="underline text-[#00ff41]/80" href="/blog/hardening-a-prover-api/">hardening post</a>.</div>
              <div><span className="text-[#00ff41]">Not yet published:</span> exact hardware spec and a full instruction-count-vs-time curve — tracked as open work, not assumed.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="relative py-24 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-4">— OPEN SOURCE —</div>
              <h2 className="font-mono font-bold text-3xl md:text-4xl text-white mb-6">
                MIT LICENSED.<br />
                BUILT IN THE <span className="text-[#00ff41]">OPEN.</span>
              </h2>
              <p className="font-mono text-sm text-gray-400 leading-relaxed mb-8">
                Open source and MIT licensed. Bug reports, .zkasm programs that break something, and small honestly-scoped PRs are welcome.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '◇', label: '100%', sub: 'OPEN SOURCE' },
                  { icon: '<>', label: 'MIT', sub: 'LICENSE' },
                  { icon: '●', label: 'ACTIVELY', sub: 'DEVELOPED' },
                  { icon: '◆', label: 'SINGLE', sub: 'MAINTAINER' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border border-[#00ff41]/10 bg-[#00ff41]/5">
                    <span className="text-[#00ff41] text-lg">{item.icon}</span>
                    <div>
                      <div className="font-mono text-sm font-bold text-white">{item.label}</div>
                      <div className="font-mono text-[10px] text-gray-500 tracking-wider">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#00ff41]/30 bg-black/80">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00ff41]/20 bg-[#00ff41]/5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-2 font-mono text-[10px] text-gray-500">terminal</span>
              </div>
              <div className="p-6 font-mono text-xs space-y-1">
                <div className="text-[#00ff41]">$ git clone {REPO}</div>
                <div className="text-gray-400">Cloning into 'rust-stark-zkvm'...</div>
                <div className="text-gray-400">Receiving objects: 100% (351/351), done.</div>
                <div className="text-gray-500 text-[10px]">(.git ≈ 836 KB on disk, 22 commits — checked at publish time)</div>
                <div className="text-[#00ff41] mt-4">$ cargo build --release --workspace</div>
                <div className="text-gray-400">Compiling zkvm-isa, zkvm-stark, zkvm-cli, zkvm-host-server...</div>
                <div className="text-[#00ff41] mt-2">$ cargo run --release -p zkvm-host-server &amp;</div>
                <div className="text-[#00ff41]">✓ listening on :4477</div>
                <div className="text-[#00ff41] mt-2">$ _</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-6 border-t border-[#00ff41]/10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="font-mono text-xs text-[#00ff41] tracking-widest mb-6">— OPEN SOURCE · HONESTLY SCOPED —</div>
          <h2 className="font-mono font-black text-5xl md:text-7xl text-white mb-6 tracking-tight">
            BUILD. PROVE. <span className="text-[#00ff41]">VERIFY.</span>
          </h2>
          <p className="font-mono text-lg text-gray-400 mb-10">
            A real STARK-verifiable virtual machine, with every gap named in the open.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a href="#playground" className="px-10 py-4 bg-[#00ff41] text-black font-mono font-bold text-sm hover:bg-[#00ff41]/80 transition-colors tracking-widest">
              GET STARTED &gt;
            </a>
            <a href={`${REPO}/blob/main/docs/ROADMAP.md`} target="_blank" rel="noreferrer" className="px-10 py-4 border border-[#00ff41]/40 text-[#00ff41] font-mono text-sm hover:bg-[#00ff41]/10 transition-colors tracking-widest">
              READ THE ROADMAP
            </a>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-6 font-mono text-xs text-gray-500">
            <span>github.com/CodesbyFebin/rust-stark-zkvm</span>
            <span>·</span>
            <span>Open Source</span>
            <span>·</span>
            <span>MIT License</span>
            <span>·</span>
            <span>Single Maintainer</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#00ff41]/20 bg-black/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[#00ff41]/30 flex items-center justify-center">
              <span className="font-mono text-[#00ff41] font-bold text-sm">Z</span>
            </div>
            <div>
              <div className="font-mono text-xs text-white">zkVM<span className="text-[#00ff41]">.host</span></div>
              <div className="font-mono text-[9px] text-gray-600">STARK-VERIFIABLE COMPUTE</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-mono text-[10px] text-gray-500">
            <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-[#00ff41]">◇ GitHub</a>
            <a href="/blog/" className="hover:text-[#00ff41]">&lt;/&gt; Blog</a>
            <a href="/glossary/" className="hover:text-[#00ff41]">◉ Glossary</a>
            <a href="/dashboard/" className="hover:text-[#00ff41]">▤ Dashboard</a>
            <a href={`${REPO}/tree/main/funding`} target="_blank" rel="noreferrer" className="hover:text-[#00ff41]">♡ Funding</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
