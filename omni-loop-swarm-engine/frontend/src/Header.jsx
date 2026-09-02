import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="app-header">
      <NavLink to="/" className="brand">
        <span className="brand-mark">&Omega;</span>
        <div>
          <h1>Omni-Loop Swarm Engine</h1>
          <p className="tagline">Builder &rarr; Reviewer &rarr; Remediation, across a swarm of models</p>
        </div>
      </NavLink>

      <nav className="top-nav" aria-label="Site">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Tool
        </NavLink>
        <NavLink to="/docs" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Docs
        </NavLink>
      </nav>
    </header>
  )
}
