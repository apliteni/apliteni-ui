# The landing site (`ui.apli.tech`)

`site/` is the public site: a small static homepage, the [changelog](changelog.md), and
the hosted Storybook — all served by one zero-dependency Node server.

> Two things named “landing” are separate: the **live homepage** here
> (`site/index.html`) and the Storybook **`Apps/Landing Page`** story
> (`stories/apps/Landing.stories.js`), which is a component demo. This page is about the
> live homepage.

## Files

```
site/
  index.html        The homepage. Static HTML with {{PLACEHOLDER}} slots for shared chrome.
  changelog.html    The changelog page shell (see docs/changelog.md).
  chrome.mjs        The one shared topbar + footer + their CSS/JS.
  build.mjs         The build: emits site/public/ (HTML + kit.css + favicon).
  server.mjs        Zero-dependency static server (also mounts Storybook at /storybook).
  public/           Build output (git-ignored).
```

## Shared chrome (`chrome.mjs`)

Every page shares one topbar and footer so navigation never drifts. `chrome.mjs`
exports:

- `topbar(active)` — the site topbar; `active` marks the current nav link (e.g.
  `'changelog'`).
- `footer()` — the site footer.
- `CHROME_CSS` — the topbar/footer styles.
- `CHROME_JS` — the theme-toggle + menu behavior, inlined into each page.

Pages don't call these directly; they leave `{{TOPBAR}}`, `{{FOOTER}}`, `{{CHROME_CSS}}`,
`{{CHROME_JS}}` placeholders and `build.mjs` injects them.

## The build (`build.mjs`)

`node site/build.mjs` produces `site/public/`:

1. **Kit CSS** — imports `cssText` from the package's own `src/inline.js` and writes it
   to `public/assets/kit.css`. So the site always styles itself with the exact CSS the
   package ships — no separate copy to drift.
2. **Cache-busting hash** — a SHA-1 of `cssText`, sliced to 10 chars. Pages reference
   `/assets/kit.css?{{CSSHASH}}`; the hash changes only when the CSS actually changes, so
   a deploy can never serve stale kit CSS while HTML is served `no-cache`.
3. **Placeholder substitution** — for each page it injects the shared chrome
   (`{{TOPBAR}}`/`{{FOOTER}}`/`{{CHROME_CSS}}`/`{{CHROME_JS}}`), then resolves
   `{{VERSION}}` (from `package.json`) and `{{CSSHASH}}`.
4. **Page-specific main** — the changelog page's `{{MAIN}}` is filled by
   `changelogMain(contributorsByVersion)` (see [changelog.md](changelog.md)); the
   homepage is otherwise static.
5. **Favicon** — writes the brand “prism” SVG to `public/favicon.svg`.

Output: `public/index.html`, `public/changelog/index.html`, `public/assets/kit.css`,
`public/favicon.svg`.

Adding a page: create `site/<page>.html` with the chrome placeholders, then have
`build.mjs` read it, run it through `chrome()` + `ver()`, and write it into `public/`.

## The server (`server.mjs`)

A dependency-free `node:http` server (`node site/server.mjs`, `PORT` env, default 8080):

- Serves `site/public/*`; `/` → `index.html`, directories → their `index.html`.
- Mounts the built Storybook (`storybook-static/`, overridable via `STORYBOOK_DIR`) at
  `/storybook` — which is why changelog component chips deeplink to
  `/storybook/?path=/story/<id>`.
- `/healthz` → `ok`.
- HTML is served `no-cache`; hashed assets get `max-age=3600`.
- Path-traversal guard: a normalized request path must stay within the served root.

## Local preview

```bash
node site/build.mjs        # → site/public/
npm run build-storybook    # → storybook-static/  (only needed to preview /storybook)
node site/server.mjs       # http://localhost:8080  (and /storybook)
```

## Deploy

`build.mjs` + `build-storybook` produce fully static output (`site/public/` +
`storybook-static/`), served as a static site on **Lessly**. The `Dockerfile` (which
runs both builds and serves them via `server.mjs`) remains as a self-contained
alternative. Keep deploy specifics out of committed docs — the repo is public.
