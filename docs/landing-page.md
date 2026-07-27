# The landing site (`ui.apli.tech`)

`site/` is the public site: a static homepage, the [changelog](changelog.md), and the
hosted Storybook — served by one zero-dependency Node server.

> Two things named “landing” are separate: the live homepage here (`site/index.html`)
> and the Storybook `Apps/Landing Page` story (a component demo). This page is about the
> homepage.

```
site/
  index.html        Homepage. Static HTML with {{PLACEHOLDER}} slots for shared chrome.
  changelog.html    Changelog page shell (see changelog.md).
  chrome.mjs        The one shared topbar + footer + their CSS/JS.
  build.mjs         Emits site/public/ (HTML + kit.css + favicon).
  server.mjs        Zero-dependency static server; mounts Storybook at /storybook.
  public/           Build output (git-ignored).
```

## Shared chrome

`chrome.mjs` exports `topbar(active)`, `footer()`, `CHROME_CSS`, `CHROME_JS`. Pages
don't call these — they leave `{{TOPBAR}}` / `{{FOOTER}}` / `{{CHROME_CSS}}` /
`{{CHROME_JS}}` placeholders and `build.mjs` injects them, so navigation never drifts.

## The build (`build.mjs`)

`node site/build.mjs` produces `site/public/`:

1. Imports `cssText` from the package's own `src/inline.js` → `public/assets/kit.css`, so
   the site always styles itself with the exact CSS the package ships.
2. Hashes that CSS (SHA-1, 10 chars) and references `kit.css?{{CSSHASH}}`, so a deploy
   can't serve stale kit CSS while HTML is `no-cache`.
3. Injects the shared chrome and resolves `{{VERSION}}` (from `package.json`) +
   `{{CSSHASH}}`. The changelog's `{{MAIN}}` is filled by
   `changelogMain(contributorsByVersion)` (see [changelog.md](changelog.md)).

To add a page: create `site/<page>.html` with the chrome placeholders, then have
`build.mjs` run it through `chrome()` + `ver()` into `public/`.

## The server (`server.mjs`)

Dependency-free `node:http` (`PORT` env, default 8080). Serves `site/public/*`; mounts
`storybook-static/` at `/storybook` (why changelog chips deeplink to
`/storybook/?path=/story/<id>`); `/healthz` → `ok`; HTML `no-cache`, hashed assets
`max-age=3600`; path-traversal guarded.

## Local preview

```bash
node site/build.mjs        # → site/public/
npm run build-storybook    # → storybook-static/  (only to preview /storybook)
node site/server.mjs       # http://localhost:8080
```

## Deploy

`build.mjs` + `build-storybook` produce fully static output, served as a static site on
**Lessly**. The `Dockerfile` remains a self-contained alternative. (Deploy specifics
stay out of committed docs — the repo is public.)
