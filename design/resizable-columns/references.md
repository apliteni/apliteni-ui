# Reference record

Checked on 27 November 2026. Public documentation supplies the facts below.
“Unknown” means that the cited page does not establish the behaviour.
It does not mean that the product lacks the feature.
No product artwork is included in the prototypes.

| Reference | Rest | Hover | Drag | Focus | Keyboard | Limits | Double-click | Persistence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [VS Code layout](https://code.visualstudio.com/docs/configure/custom-layout) | Transparent resize strip over the divider | Coloured strip and resize cursor | The strip keeps the hover colour | Unknown | Resize keys unknown | Unknown | The documented double-click option concerns editor tabs, not dividers | Layout survives sessions |
| [Finder column view](https://sindresorhus.com/guides/finder-column-width-mac) | Small handle at the bottom of the right divider | Unknown | Manual sizing is discussed, but drag paint is unknown | Unknown | The article's shortcut uses Supercharge, not native Finder | Fit uses the longest filename | Fits one column | Automatic fitting is a setting, manual width persistence is unknown |
| [Thunderbird layout](https://support.mozilla.org/en-US/kb/how-change-thunderbird-layout) | Three adjacent panes in Vertical view | Unknown | Unknown | Unknown | Resize keys unknown | Unknown | Unknown | Unknown |
| [Atlassian side navigation](https://atlassian.design/components/navigation-system/layout/examples) | Drag handle on the side navigation boundary | Resize cursor | Width changes, open menus close | Unknown | The [API](https://atlassian.design/components/navigation-system/layout/code) supports keyboard bounds, exact keys unknown | 240px minimum, 50% viewport maximum | Collapses the side navigation | Width survives collapse, the app supplies `defaultWidth` across reloads |
| [PrimeVue Splitter](https://primevue.org/splitter/) | Thin divider with a short centre handle | Resize cursor | Resize events carry the current sizes | Focusable gutter, exact focus paint unknown | Tab and directional arrows | App supplies percentage minimum and maximum | Unknown | `stateKey` and `stateStorage`, or app-controlled sizes |
| [shadcn/ui Resizable](https://ui.shadcn.com/docs/components/resizable) | Thin line, optional centre handle | State paint unknown | Resizable panel groups, exact drag paint unknown | Published example uses a one-pixel focus ring | Keyboard support is documented, exact keys delegated to the underlying library | App configuration, exact defaults unknown | Unknown | Not established by this page |
| [WAI-ARIA Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) | No prescribed paint | No prescribed paint | Primary pane size changes | Named, focusable separator | Directional arrows, optional Home/End, Enter for collapse/restore | Exposed through minimum and maximum values | Not prescribed | Not prescribed |

The [VS Code sash stylesheet](https://github.com/microsoft/vscode/blob/main/src/vs/base/browser/ui/sash/sash.css) defines a 4px default target.
Its hover and active states use `--vscode-sash-hoverBorder`.

PrimeVue and shadcn/ui were also opened in the Orca browser.
Their rendered separators confirm the thin divider and optional handle structures.
The source documentation does not establish every visual state, so those cells remain unknown.
The Thunderbird reference supplies the three-pane arrangement only.
The Finder author documents the observed native handle and fitting actions.
Apple Support returned HTTP 429, so it was not used for claims about resizing.

The WAI-ARIA page states that its pattern review is incomplete.
The prototypes use its naming, orientation, values, arrows, Home and End model.
They omit collapse to keep all content available.
The prototype's Escape cancellation and double-click reset are proposals, not WAI-ARIA requirements.

## Current kit

Base commit: `86f406090a96dccedc54bc02dd13e193c2f8670a`.

- `react/src/ThreeColumnPage.tsx` has no width or resize prop.
- `react/src/ThreeColumnPage.css` defines 240px, a bounded 26%, and the remaining width.
- `react/src/ThreeColumnPage.stories.tsx` uses `showcases/Library.tsx` for the folders example.
- `react/src/SplitLayout.tsx` has zoom controls, but no pane resize prop.
- `react/src/SplitLayout.css` defines a 60/40 split above 860px.
- `react/src/SplitLayout.stories.tsx` supplies the fabricated service agreement used here.
- `react/src/showcases/SplitLayout.stories.tsx` also shows the document review arrangement.

The prototypes retain the existing narrow layouts.
The header grip is a proposed control, not a restyled kit button.
The two parallel grip marks are CSS geometry that identifies a drag handle.
They are not copied artwork or replacement Lucide paths.

## Choice criteria

Compare discovery, pointer reach, keyboard operation, content limits, phone behaviour and visual fit with the kit.
The same data, limits and reset behaviour make the three handle designs comparable.
Persistence is absent because the viewer gives the document an opaque origin.
The prototype never requests storage access or reads the viewer's dimensions.
