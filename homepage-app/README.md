# zkvm.host homepage — source

This is the React/Vite source for `https://www.zkvm.host/`'s homepage. It builds to
static HTML/CSS/JS — there's no server-side React runtime in production, and
`../site/` (the actual deployed directory) stays a plain static site otherwise
(the blog, dashboard, funding, glossary, and depin pages are hand-authored HTML,
not part of this build).

## Why this exists

The homepage's design (matrix-rain background, IMPLEMENTED/EXPERIMENTAL/ROADMAP
feature badges, an interactive proof playground) was authored as a React component.
Rather than hand-port it to vanilla JS twice, this builds the real component with
Vite and outputs static files directly into `../site/`.

## Commands

```bash
npm install
npm run dev      # local dev server with HMR
npm run build    # outputs to ../site/index.html + ../site/app-assets/
```

`vite.config.js` sets `build.outDir: '../site'` with `emptyOutDir: false` (so it
never deletes `../site/blog/`, `../site/funding/`, etc.) and `build.assetsDir:
'app-assets'` (so it doesn't collide with the existing hand-authored `../site/assets/`
directory, which holds the repo banner and architecture diagrams).

## Content policy

Every claim in `src/App.jsx` must be checkable against the real repo — this is the
same rule the rest of `../site/` follows. See `../docs/ROADMAP.md` and
`../docs/HOST_SERVICE.md` for what's actually built vs. pitched before changing any
number or status badge here.
