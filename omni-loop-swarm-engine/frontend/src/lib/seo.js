import { useEffect } from 'react'

/**
 * Keeps the tab title and meta tags in sync during client-side navigation
 * (React Router Link clicks, which don't trigger a full page load).
 *
 * On a hard reload or a crawler's first fetch, Flask already serves the
 * right title/description/JSON-LD for the requested path server-side (see
 * app.py's ROUTE_META / render_index) -- this hook only matters for the
 * in-session SPA experience after that.
 */
export function usePageMeta({ title, description }) {
  useEffect(() => {
    document.title = title

    const setMeta = (selector, value) => {
      const el = document.querySelector(selector)
      if (el) el.setAttribute('content', value)
    }

    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[name="twitter:title"]', title)
    setMeta('meta[name="twitter:description"]', description)

    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      const url = new URL(canonical.href)
      canonical.href = `${url.origin}${window.location.pathname}`
    }
  }, [title, description])
}
