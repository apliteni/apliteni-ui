# Split layout

Recommend one variant: saved values first, preview second. Both remain visible when the columns stack.
The kit requires this order. A source-first variant would break “Follow the consequence”.

Proposed interface:

```tsx
<SplitLayout
  primary={{ title, children }}
  preview={{ title, children, page, state, onRetry }}
  actions={actions}
  zoom={zoom}
  onZoomChange={setZoom}
/>
```

`page` optionally holds `current` and `total` for the page label.
`state` is `ready`, `loading`, or `unavailable`.
`zoom` is `fit`, `50`, `100`, `150`, or `200`.
The slots contain app data. The layout contains no document or approval rules.

Reuse `Card`, `KeyValueList`, the table, buttons, and document sheet.
The layout owns value emphasis, zoom, stacking, and the phone action bar.
The preview toolbar keeps Fit available.

Open `index.html`. Today renders main `65549fbf` unchanged.
Pictures show both themes. `review.md` records rules, checks, and limits.
