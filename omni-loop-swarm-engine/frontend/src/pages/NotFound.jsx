import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/seo.js'

export default function NotFound() {
  usePageMeta({
    title: '404 — Omni-Loop Swarm Engine',
    description: 'This page does not exist.',
  })

  return (
    <main className="docs-page">
      <h1>404</h1>
      <p>This route doesn&apos;t exist.</p>
      <Link to="/" className="back-link">
        &larr; Back to the tool
      </Link>
    </main>
  )
}
