const MODES = [
  { id: 'single', label: 'Single', desc: 'One model builds, no review loop.' },
  { id: 'swarm', label: 'Swarm', desc: 'Multiple models build and review each other in parallel.' },
  { id: 'arbiter', label: 'Arbiter', desc: 'Swarm mode, then a judge model picks the winner.' },
]

export default function Header({ mode, onModeChange }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">&Omega;</span>
        <div>
          <h1>Omni-Loop Swarm Engine</h1>
          <p className="tagline">Builder &rarr; Reviewer &rarr; Remediation, across a swarm of models</p>
        </div>
      </div>

      <div className="mode-toggle" role="tablist" aria-label="Execution mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`mode-button ${mode === m.id ? 'active' : ''}`}
            onClick={() => onModeChange(m.id)}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>
    </header>
  )
}
