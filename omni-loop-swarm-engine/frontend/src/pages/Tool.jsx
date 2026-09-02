import { useEffect, useRef, useState } from 'react'
import ModeToggle from '../components/ModeToggle.jsx'
import { usePageMeta } from '../lib/seo.js'
import { usePersistedSettings } from '../usePersistedSettings.js'

const STATUS_LABEL = {
  passed: 'PASSED',
  max_iterations: 'MAX ITERATIONS',
  failed: 'FAILED',
}

function CandidateCard({ candidate }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`candidate-card status-${candidate.status}`}>
      <div className="candidate-header">
        <span className="candidate-model">{candidate.model}</span>
        <span className={`status-badge status-${candidate.status}`}>
          {STATUS_LABEL[candidate.status] || candidate.status}
        </span>
      </div>
      <div className="candidate-meta">
        {candidate.iterations} iteration{candidate.iterations === 1 ? '' : 's'}
      </div>
      {candidate.error && <div className="candidate-error">{candidate.error}</div>}
      {candidate.history?.length > 0 && (
        <button type="button" className="link-button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Show'} review history ({candidate.history.length})
        </button>
      )}
      {expanded && (
        <ul className="history-list">
          {candidate.history.map((h, i) => (
            <li key={i}>
              <strong>#{h.iteration + 1}</strong> reviewed by <code>{h.reviewer}</code> &mdash;{' '}
              <span className={`verdict-${(h.verdict || '').toLowerCase()}`}>{h.verdict}</span>
              <p>{h.feedback}</p>
            </li>
          ))}
        </ul>
      )}
      {candidate.final_output && (
        <details className="output-details">
          <summary>Final output</summary>
          <pre>{candidate.final_output}</pre>
        </details>
      )}
    </div>
  )
}

export default function Tool() {
  usePageMeta({
    title: 'Omni-Loop Swarm Engine',
    description:
      "A Builder -> Reviewer -> Remediation loop for LLMs: run one model, or a swarm of models in parallel that build, review, and fix each other's work, with an optional Arbiter to pick the best result.",
  })

  const [settings, updateSettings] = usePersistedSettings()
  const [freeModels, setFreeModels] = useState([])
  const [task, setTask] = useState('')
  const [constraints, setConstraints] = useState('')
  const [arbiterModel, setArbiterModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const pollTimeoutRef = useRef(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setFreeModels(data.free_models || []))
      .catch(() => setError('Could not reach the backend at /api/health -- is Flask running?'))

    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [])

  const pollJob = (jobId) => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'done') {
          setResult(data.result)
          setLoading(false)
        } else if (data.status === 'error') {
          setError(data.error || 'The job failed.')
          setLoading(false)
        } else {
          pollTimeoutRef.current = setTimeout(() => pollJob(jobId), 1200)
        }
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  const toggleModel = (model) => {
    const set = new Set(settings.models)
    if (set.has(model)) {
      set.delete(model)
    } else {
      set.add(model)
    }
    updateSettings({ models: Array.from(set) })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!task.trim()) {
      setError('Task is required.')
      return
    }
    if (settings.mode !== 'single' && settings.models.length === 0) {
      setError('Select at least one model for swarm/arbiter mode.')
      return
    }

    setLoading(true)
    try {
      const body = {
        mode: settings.mode,
        task,
        constraints,
        models:
          settings.mode === 'single'
            ? settings.models[0]
              ? [settings.models[0]]
              : []
            : settings.models,
        api_key: settings.apiKey,
        max_iterations: settings.maxIterations,
      }
      if (settings.mode === 'arbiter' && arbiterModel) {
        body.arbiter_model = arbiterModel
      }

      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`)
      }
      // /api/execute returns {job_id, status} immediately -- the actual run
      // happens in a background thread, so poll for the result instead of
      // expecting it in this response.
      pollJob(data.job_id)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <div className="tool-toolbar">
        <span className="tool-toolbar-label">Mode</span>
        <ModeToggle mode={settings.mode} onModeChange={(mode) => updateSettings({ mode })} />
      </div>

      <main className="layout">
        <form className="control-panel" onSubmit={handleSubmit}>
          <label>
            Task
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe what you want built..."
              rows={4}
            />
          </label>

          <label>
            Constraints <span className="optional">optional</span>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Language, style, limits, anything the solution must respect..."
              rows={2}
            />
          </label>

          <fieldset>
            <legend>Models {settings.mode === 'single' ? '(pick one)' : '(pick any number)'}</legend>
            <div className="model-list">
              {freeModels.map((m) => (
                <label key={m} className="model-checkbox">
                  <input
                    type={settings.mode === 'single' ? 'radio' : 'checkbox'}
                    name="model"
                    checked={settings.models.includes(m)}
                    onChange={() =>
                      settings.mode === 'single' ? updateSettings({ models: [m] }) : toggleModel(m)
                    }
                  />
                  <code>{m}</code>
                </label>
              ))}
              {freeModels.length === 0 && !error && (
                <p className="hint">No models loaded yet -- checking /api/health...</p>
              )}
            </div>
          </fieldset>

          {settings.mode === 'arbiter' && (
            <label>
              Arbiter model
              <select value={arbiterModel} onChange={(e) => setArbiterModel(e.target.value)}>
                <option value="">Use first selected model</option>
                {settings.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="row">
            <label>
              Max iterations
              <input
                type="number"
                min={1}
                max={10}
                value={settings.maxIterations}
                onChange={(e) => updateSettings({ maxIterations: Number(e.target.value) })}
              />
            </label>

            <label>
              API key <span className="optional">for openai/anthropic models</span>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Running...' : 'Execute'}
          </button>

          {error && <p className="error-banner">{error}</p>}
        </form>

        <section className="results-panel">
          {!result && !loading && <p className="hint">Results will appear here.</p>}
          {loading && (
            <p className="hint">
              Running {settings.mode} mode against {settings.models.length || 1} model(s)...
            </p>
          )}

          {result && (
            <>
              <div className="summary-bar">
                <span>
                  {result.total_models} model{result.total_models === 1 ? '' : 's'}
                </span>
                <span className="pass-count">{result.passed} passed</span>
                <span className="fail-count">{result.failed} failed</span>
              </div>

              {result.arbiter && (
                <div className="arbiter-box">
                  <h3>Arbiter decision</h3>
                  <p>
                    <strong>Winner:</strong> {result.arbiter.winner_model || 'none'}
                  </p>
                  <p>{result.arbiter.reasoning}</p>
                </div>
              )}

              <div className="candidate-grid">
                {result.candidates.map((c) => (
                  <CandidateCard key={c.model} candidate={c} />
                ))}
              </div>

              {result.final_output && (
                <details className="output-details winner-output" open>
                  <summary>Winning output ({result.winner_model})</summary>
                  <pre>{result.final_output}</pre>
                </details>
              )}
            </>
          )}
        </section>
      </main>
    </>
  )
}
