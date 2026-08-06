# React components

Source for the kit's React layer — for surfaces that hold real client state
(dashboards, tables, filters, forms). They render the same `.ui-*` classes and
tokens as the vanilla kit, so the two layers can't drift.

This directory is a **private workspace**, not a package. It builds to `react/dist/`
and ships as the `@apliteni/apliteni-ui/react` subpath of the kit — one package, one
version, one pin. There is no `@apliteni/apliteni-ui-react` on npm.

**Decision rule:** does this surface hold meaningful client state?
No → use the vanilla factories from `@apliteni/apliteni-ui`.
Yes → use these React components.

## Install (as a consumer)

```bash
npm install @apliteni/apliteni-ui react react-dom
```

`react` and `react-dom` are optional peers (`>=18`) of the kit — you bring your own.

## Use

```tsx
import '@apliteni/apliteni-ui/css';        // kit tokens + .ui-* classes
import '@apliteni/apliteni-ui/react/css';  // React components' shell styles (modal, pager)
import { DataTable, Modal, Button } from '@apliteni/apliteni-ui/react';
```

Components: `DataTable`, `Modal`, `Button`, `Badge`, `Card`, `Icon`.

## Work on them

From the repo root — one `npm install` covers the workspace:

```bash
npm test -w react            # vitest
npm run storybook -w react   # http://localhost:6007
npm run build                # tsup -> react/dist/
```

The bare `@apliteni/apliteni-ui` specifier in this source resolves to the kit itself
once installed. In the repo there is no copy to resolve to, so `kit-alias.ts` points
vitest and Storybook straight at `../src/` — which is why the class-name parity tests
now compare against the working tree rather than the last published release.
