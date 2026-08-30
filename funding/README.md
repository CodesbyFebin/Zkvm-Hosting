# funding/

A static funding page for the project: GitHub Sponsors, a crypto donation
widget (multi-chain, MetaMask-based), and a grants section pointing at real
programs. Meant to be published with [Distributed Press](https://distributed.press)
for censorship-resistant hosting, but it's plain static HTML/JS — any static
host works.

The crypto donation widget (`script.js`, `config.js`, and the vendored
libraries in `static/js/`) is adapted from
[hyphacoop/distributed-uncensorable-frontend](https://github.com/hyphacoop/distributed-uncensorable-frontend)
(MIT License, © Hypha Worker Co-operative) — real, tested wallet-connect code,
not hand-rolled. `script.js` is used unmodified.

## Before deploying

1. **Wallet addresses.** [`config.js`](config.js) has a real, checksum-verified
   EVM address wired up for ETH/USDT/OP/ARB/FIL (wallet-connect), plus
   checksum/format-verified BTC and Solana addresses for direct-send (shown
   as address + QR, not wallet-connect — neither chain speaks Ethereum
   JSON-RPC). Swap in your own before publishing if these aren't yours.
2. **GitHub Sponsors.** [`index.html`](index.html) links to
   `github.com/sponsors/CodesbyFebin`. If Sponsors isn't enabled on that
   account yet, that link 404s — enable it at
   [github.com/sponsors](https://github.com/sponsors) first, or change the
   link.
3. **Open Collective / Ko-fi.** Marked "coming soon" in the page — there's no
   real link yet. Add one in `index.html` under the "Give one-time" section
   once you have an account.
4. **Grants section.** Links to real external programs (Ethereum Foundation
   ESP, Protocol Labs Research, Gitcoin Grants) as places this project could
   apply — not a claim that any of them have funded it.

## Deploying with Distributed Press

This repo does not do the publish step for you — that requires your own
Distributed Press account/token. See
[docs.distributed.press](https://docs.distributed.press) for the current
publish flow (web dashboard or `dpp` CLI). Point it at this `funding/`
directory as the site root.

## Local preview

Any static file server works, e.g.:

```bash
cd funding && python3 -m http.server 8090
```

Then open `http://localhost:8090`. Wallet connect requires MetaMask (or
another injected `window.ethereum` provider) in the browser you test with.
