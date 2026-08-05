# @apliteni/apliteni-ui-react

React components for apliteni-ui — for surfaces that hold real client state
(dashboards, tables, filters, forms). They render the same `.ui-*` classes and
tokens as the vanilla kit, so the two layers can't drift.

**Decision rule:** does this surface hold meaningful client state?
No → use the vanilla factories from `@apliteni/apliteni-ui`.
Yes → use these React components.

## Install

Not on npm yet — link it from this repo (workspace or `file:` dependency) alongside
the kit and React:

```bash
npm install @apliteni/apliteni-ui react react-dom
npm install file:../apliteni-ui/react            # until the package is published
```

## Use

```tsx
import '@apliteni/apliteni-ui/css';        // kit tokens + .ui-* classes
import '@apliteni/apliteni-ui-react/css';  // React components' shell styles (modal, pager)
import { DataTable, Modal, Button } from '@apliteni/apliteni-ui-react';
```

Components: `DataTable`, `Modal`, `Button`, `Badge`, `Card`, `Icon`.
