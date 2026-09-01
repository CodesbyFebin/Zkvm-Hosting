import { useEffect } from 'react';

const SITE = 'https://www.zkvm.host';

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

// Updates document.title, meta description, canonical link, and OpenGraph/
// Twitter tags on route change. A client-rendered SPA serves the same static
// HTML for every route, so without this every page reports the homepage's
// title/description/canonical to search engines and AI crawlers that execute
// JS (most do today). Crawlers that don't execute JS still see the static
// homepage-shaped defaults in index.html, which is why those stay accurate
// for "/" specifically.
export function usePageMeta({ title, description, path }) {
  useEffect(() => {
    const fullTitle = `${title} — zkvm.host`;
    const url = `${SITE}${path}`;

    document.title = fullTitle;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', description);
  }, [title, description, path]);
}

// Injects a page-specific JSON-LD block, replacing it on route change and
// clearing it on unmount so schema from one page never leaks onto another.
export function usePageJsonLd(data) {
  useEffect(() => {
    let script = document.getElementById('page-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'page-jsonld';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      if (script) script.textContent = '';
    };
  }, [data]);
}
