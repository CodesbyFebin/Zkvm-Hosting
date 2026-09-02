const MODES = [
  { id: 'single', label: 'Single', desc: 'One model builds, no review loop.' },
  { id: 'swarm', label: 'Swarm', desc: 'Multiple models build and review each other in parallel.' },
  { id: 'arbiter', label: 'Arbiter', desc: 'Swarm mode, then a judge model picks the winner.' },
]

export default function ModeToggle({ mode, onModeChange }) {
  return (
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
  )
}
