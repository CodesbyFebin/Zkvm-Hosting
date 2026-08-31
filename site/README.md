# site/

The static landing page deployed to [zkvm.host](https://zkvm.host) (Vercel
project `projects555/zkvm-decentralized-cloud-hosting`).

- `index.html` — the landing page itself. Self-contained; content is pulled
  directly from this repo's own docs (see the "in its own words" section's
  citations), not separately written marketing copy.
- `assets/architecture.svg` — a copy of [`docs/assets/architecture.svg`](../docs/assets/architecture.svg).
  Keep these in sync if you edit the diagram.
- `funding/` — a copy of the top-level [`funding/`](../funding) directory, so
  it serves at `zkvm.host/funding` in the same deployment. This is a real
  duplication, not a symlink (Vercel's static deploy doesn't follow symlinks
  outside the project root) — keep it in sync with `../funding/` when you
  change one, or diff them before deploying:

  ```bash
  diff -rq funding ../funding
  ```
- `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` —
  generated from the same brand mark as `docs/assets/architecture.svg` (see
  the script in this project's session history if you need to regenerate
  them at a different size).

## Deploying

```bash
cd site
vercel --prod
```

Requires the Vercel CLI already authenticated and linked to
`projects555/zkvm-decentralized-cloud-hosting` (`vercel link`).

## Local preview

```bash
cd site && python3 -m http.server 8091
```
