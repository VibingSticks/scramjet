# Scramjet Proxy (deployable)

A single-port, Render-ready Scramjet web proxy built on
[`@mercuryworkshop/proxy-bootstrap`](https://www.npmjs.com/package/@mercuryworkshop/proxy-bootstrap).

`bootstrap()` downloads the Scramjet client, controller, utils, and the Wisp
transport (libcurl.js) from npm at startup, and serves them alongside the Wisp
backend on one port. Nothing from the parent monorepo (or the Rust toolchain)
is needed — this folder is a standalone npm project.

## Run locally
```bash
npm install
npm start            # http://localhost:3030  (set PORT to override)
```

## Deploy to Render (free)
Push this repo to GitHub, then either:

- **Blueprint:** the repo-root `render.yaml` builds this folder automatically
  (`rootDir: app`).
- **Manual Web Service:** set
  - **Root Directory:** `app`
  - **Build Command:** `npm install`
  - **Start Command:** `node server.js`
  - **Instance Type:** Free

The server reads Render's injected `PORT`. Wisp is served on the same port at
`/wisp/` — no second port needed. HTTPS is automatic on the `*.onrender.com`
subdomain.

## Notes
- On each cold start, `bootstrap()` fetches packages from npm — needs outbound
  network (Render has it) and adds a few seconds to startup.
- Free tier sleeps after ~15 min idle (~50 s cold start on next visit).
- Customize the UI by editing `public/index.html`.
