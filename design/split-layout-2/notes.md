# Full-height split

Recommend one variant: 60% saved values, 40% preview, below the shared top bar.
The sidebar stays outside both panes.
The preview background reaches every edge of its pane.
It uses `--ui-document-ground`, an alias of `--surface-2`: light `#e9ecf3`, dark `#161520`.

Desktop panes scroll separately. The action stays below the values.
At 860px and below, values precede the preview in one scroll area.
The action bar stays at the bottom. Preview tools stay visible while the preview scrolls.
Fit shows the whole sheet. Zoom scrolls inside the preview.

Proposed interface:

```tsx
<SplitLayout
  primary={content}
  preview={{ title, children, state, onRetry }}
  actions={actions}
  zoom={zoom}
  onZoomChange={setZoom}
/>
```

`state`: `ready`, `loading`, `unavailable`.
`zoom`: `fit`, `50`, `100`, `150`, `200`.

Open `index.html`. Today renders main `65549fbf`.
The prototype contains no frames and saves nothing.
All data is fabricated. Follow the consequence: saved values first.
