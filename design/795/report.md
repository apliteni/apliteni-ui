**Why?** Keep context and thumb access.

**Frequency?** One request in #795, 8–9 November 2026. Usage unknown.

**Simpler?** Inset the window. Move its tabs.

`asabirov/apliteni-ui-795-design`.

| Layout | Gap | Height | Reader / close | Tabs |
| --- | --- | --- | --- | --- |
| Top | `--space-3`, 12px | Content | Top / top | Underline |
| Bottom | `--space-4`, 16px | Content, capped | Top / top | Pill |
| Centre | `--space-6`, 24px | `--panel-lg`, 560px | Bottom / top | Underline |

Each follows Foundations spacing, focus and taps, plus Components modal and navigation rules.
Content scrolls. Kit scrim. Bottom clearance: max(gap, safe-area inset).

Account and settings conflicts:

> On a phone the sections become tabs under the reader, where a column beside the pane would leave it narrower than its rows.

> Stand the entries beside the pane — above it on a phone — and mark the one on screen.

Foundations also says “a floating panel goes edge to edge”. Components says “the window fills the screen”.

Proposed `modal`:

**Except:** On a phone, float the window with gaps around it and put icon tabs below the pane.

Proposed `nav`:

**Do:** Place entries beside the pane on desktop and below it on a phone, and mark the open section.

React suite failed.


- `design/795/top.html`
- `design/795/top-profile.png`
- `design/795/top-long.png`
- `design/795/bottom.html`
- `design/795/bottom-profile.png`
- `design/795/bottom-long.png`
- `design/795/center.html`
- `design/795/center-profile.png`
- `design/795/center-long.png`
- `design/795/tabs.html`
- `design/795/tabs.png`
- `design/795/checks.json`
- `design/795/report.md`
