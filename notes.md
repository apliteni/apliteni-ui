# builder-ui-r8-components (#768)

The branch starts from origin/builder-ui-r6-chartspage at 7d450129. It holds the component fixes of the round 8 owner notes.

## File drop

- Failed row: Retry is the main act. It is a small secondary button with the refresh glyph. Remove is a small ghost button. Both are kit button kinds.
- The React `<FileDrop>` and the guideline specimens draw the same pair.
- Upload row under the statement list: the gap is `--space-3`, the step that the panel and the list already use.
- The guideline Do caption for "Fail in place" now says that Retry is on the name line. file-drop.md went from 488 to 487 words.

## Tabs

Root cause:

- `.ui-nav--tabs` set `--ui-tabs-ground: var(--bg)` on itself. So a ground from an ancestor never reached the row.
- The covers that hide the edge shades painted that page grey. On a white stage or any surface that is not a `.ui-card`, the row showed grey bands at both ends, also when every tab fits.

Variant b, in the source:

- `observeNavFit()` sets `data-nav-before` and `data-nav-after` only while the row scrolls, and updates them on scroll.
- A CSS mask fades the marked edge over `--space-6`. A mask paints no colour, so it needs no ground to match.
- A row that fits gets `data-nav-fit` and no fade.

Variant a, in the prototype only: the earlier radial shade, at about half its strength, on a marked edge only.

Limits:

- An unwired or server-rendered row gets no fade. It keeps its scroll containment.
- The fade is measured on left-to-right rows only.

## Busy button

No variant has a spinner glyph. Each keeps the label and the glyph, so the width does not change. Each has a `motion: ambient` note and a reduced-motion state.

- a, in the source: a sheen crosses the face in 1.6 s. It is a tint of the accent on a quiet face and of the label ink on a primary face. With reduced motion, the sheen stays still on the middle of the label.
- b, in the prototype only: three dots after the label pulse in turn. The content moves left by half the dots' run, so the width stays. An icon-only button shows no dots.
- c, in the prototype only: a thin line at the bottom edge runs back and forth.
- A bug in the first reduced-motion rule: its selector was weaker than the animated rule, so the sheen still moved. The selector now matches the animated rule.
- component-button-loading.html keeps the busy-options state. It shows a, b and c side by side.

## The prototypes

- component-file-drop.html: every state of the file drop. The first two states are the failed row and the Upload row.
- component-tabs-look-a.html and component-tabs-look-b.html: the tab rows at start, middle, end and fit, on the page, on a card and on a white stage.
- component-button-loading.html, -a.html, -b.html and -c.html: the busy states for each variant.
- guideline-file-drop.html and guideline-colour-and-theming.html: rebuilt from this branch.
- The names, the data-rule ids, the hash rule and the lowercase state ids are those of review-captures/builder-ui-r6-chartspage.

## How the files are built

- Each file is one bundle of the story module, from this branch's source, made with the repository's Vite and the kit alias.
- The Markdown of each guideline is put into the bundle, so a file reads nothing from disk or network.
- Every file embeds the IBM Plex @font-face block.

## What was inspected

- Every state of each file, in light and dark, at 390, 720 and 1280 px, after `document.fonts.ready` and after the theme transitions finished.
- Hover and keyboard focus on the failed row's Retry, and on the first tab.
- The busy variants with normal and reduced motion.
- The tab rows show no grey band on a card, an accent card, a live card or a white stage.
