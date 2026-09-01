import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero';

const STAGES = ['Parsing', 'Executing', 'Building trace', 'Arithmetizing (AIR)', 'Generating STARK proof', 'Verifying'];

export default function Playground() {
  const [playgroundCode, setPlaygroundCode] = useState('INIT 7\nMUL 6\nADD 1');
  const [playgroundOutput, setPlaygroundOutput] = useState(null);
  const [playgroundRunning, setPlaygroundRunning] = useState(false);
  const [playgroundStage, setPlaygroundStage] = useState(0);

  // A real interpreter for the real opcodes (INIT/ADD/SUB/MUL), run entirely
  // in the browser. It does not generate or verify a real STARK proof; the
  // pipeline below and its numbers are illustrative, clearly labeled as such.
  const runPlayground = () => {
    setPlaygroundRunning(true);
    setPlaygroundOutput(null);
    setPlaygroundStage(0);

    const stageTimes = [300, 700, 1100, 1500, 1900, 2300];
    stageTimes.forEach((time, idx) => {
      setTimeout(() => setPlaygroundStage(idx + 1), time);
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

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <PageHero
          eyebrow="Proof Playground (Simulated)"
          title="BUILD."
          accent="PROVE. VERIFY."
          dek="Enter a tiny program using real opcodes (INIT/ADD/SUB/MUL). This runs the arithmetic in your browser and animates the real pipeline stages -- it does not generate or verify an actual STARK proof."
        />

        <div className="border border-yellow-400/30 bg-yellow-400/5 text-yellow-200 font-mono text-xs px-4 py-3 mb-8">
          ⚠ Simulated. For a real proof, run the CLI yourself (<code className="text-yellow-100">cargo run --release -p zkvm-cli -- prove ...</code>) or see the <Link to="/benchmarks" className="underline">measured benchmarks</Link>.
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
              {STAGES.map((name, idx) => (
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

        <div className="mt-12 border-t border-[#00ff41]/10 pt-8">
          <h2 className="font-mono text-sm text-white mb-3">Real opcodes supported here</h2>
          <div className="grid sm:grid-cols-2 gap-3 font-mono text-xs text-gray-500">
            <div><span className="text-[#00ff41]">INIT n</span> — set the accumulator to n</div>
            <div><span className="text-[#00ff41]">ADD n</span> — acc = acc + n</div>
            <div><span className="text-[#00ff41]">SUB n</span> — acc = acc − n</div>
            <div><span className="text-[#00ff41]">MUL n</span> — acc = acc × n</div>
          </div>
          <p className="font-mono text-xs text-gray-600 mt-4">
            The real ISA also has <span className="text-gray-400">JZ</span>/<span className="text-gray-400">JNZ</span> (forward-only conditional jumps)
            and <span className="text-gray-400">LOAD</span>/<span className="text-gray-400">STORE</span> (4 fixed registers) — not simulated in this
            in-browser demo, but fully real in the actual VM. See <Link to="/architecture" className="text-[#00ff41] underline">the architecture page</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
