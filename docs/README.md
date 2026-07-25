# apliteni-ui docs

Deep reference for the Apliteni design system. The top-level [`README.md`](../README.md)
is the quick start (install, use, publish, deploy); these pages specify how each part
actually works.

The project is one npm package plus two surfaces that showcase it:

```
@apliteni/apliteni-ui        the kit — tokens + component CSS + HTML-string factories   (src/)
      │
      ├── Storybook           the workbench where every component is built and reviewed  (stories/, .storybook/)
      └── ui.apli.tech        the public landing site + hosted Storybook + changelog     (site/)
```

## Pages

- **[library.md](library.md)** — the package itself: the HTML-string-factory
  architecture, `src/` layout, the token + theming system, the component catalog, and
  how a product consumes it.
- **[landing-page.md](landing-page.md)** — the `ui.apli.tech` site: pages, shared
  chrome, the `build.mjs` static pipeline, the `server.mjs`, and deploy.
- **[changelog.md](changelog.md)** — the changelog system: data model, the Storybook
  deeplink registry, breaking flags, git-derived contributors, and how to add a release.
- **[storybook.md](storybook.md)** — the workbench: config, the Theme/Accent toolbar,
  story organization and conventions, running and building.

## One idea to hold first

Every component is a **function that returns an HTML string** — not a React/Vue
component. The kit ships token CSS + per-component CSS + tiny factories like
`button()`, `card()`, `topbar()`. This mirrors the strategy portal's server-render
idiom (`.mjs` modules that emit HTML), so products adopt the kit with no framework and
Storybook renders exactly what ships. Keep that model in mind and the rest follows.
