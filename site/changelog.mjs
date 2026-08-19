// Changelog data + renderer for ui.apli.tech/changelog.
// One entry per published release; grouped changes with typed tags.

export const RELEASES = [
  {
    v: '0.23.3', date: '2026-08-19', tag: 'latest',
    changes: [
      ['changed', 'Five published files stopped carrying a second copy of an argument the documentation already held. This is the tail of the same sweep as 0.23.1 and 0.23.2, and it reads differently: nothing new was written into `docs/specification.md` or `CONTRIBUTING.md`, because every argument cut was already there behind a `why:` pointer the file was carrying. `src/tokens/tokens.css` loses 54 lines of prose — the spacing scale, the ring and the signal ramps each restated a measurement the specification records and the gates assert. `src/components/shell.js` loses 33, `src/components/overlay.js` 13, `src/tokens/accents.css` 10, and `src/styles/table.css` 10, where the argument that `--dense` rounds its spacing tie downward was a second, unproven copy of what `stories/table-rhythm.test.js` already holds under a section reading "The tie-break, held rather than argued for". Each file keeps its `why:` pointers, and `scripts/doc-refs.test.js` resolves every one. No behaviour changed: every edit under `src/` is a comment.'],
    ],
  },
  {
    v: '0.23.2', date: '2026-08-14', tag: 'latest',
    changes: [
      ['changed', 'The published stylesheets and components stopped carrying arguments in their headers. `src/tokens/tokens.css` explained why a signal colour that becomes a fill takes its own ink — one near-black clears all five signals in dark, while light needs a token of its own because its signals are deepened to read on white — and `src/styles/callout.css` explained why a toast\'s accent, its solid fill and its trailing action are three colours rather than one. Both are now **Colour and contrast** in `docs/specification.md`, with the measurements that decided them. `src/styles/base.css` argued for the `:where()` in the icon reset, which holds the whole filter at zero specificity so every component rule out-ranks it; written bare it weighs (0,2,1) and beats every `.ui-btn svg` in the kit, which it once did. That is now **The reset is a floor** in `CONTRIBUTING.md`. `src/styles/motion.css`, `reduced-motion.css`, `confirm.css` and `loading.css` keep a short note and a `why:` pointer each. No behaviour changed: every edit under `src/` is a comment.'],
    ],
  },
  {
    v: '0.23.1', date: '2026-08-14', tag: 'latest',
    changes: [
      ['changed', 'Two published files stopped carrying their own design document. `src/assets/icons.js` had a 31-line header whose second half was the contributor rules for adding a glyph — naming, grouping, provenance — and those are now **Add a glyph** in `CONTRIBUTING.md`, with the incident behind the one-group rule (`card`, `chart` and `doc` each filed under two headings until #199) written out rather than alluded to. `src/components/loading.js` had a 43-line header stating what the busy region guarantees, and that is a guarantee a consumer relies on, so it is now **Pending and denied states** in `docs/specification.md`: one live region that outlives its content, a skeleton that is `aria-hidden`, a `deniedState()` with no role of its own, and no spinner factory. Each file keeps a short note and a `why:` pointer the doc-refs gate resolves. No behaviour changed.'],
    ],
  },
  {
    v: '0.23.0', date: '2026-08-14',
    changes: [
      ['changed', 'Every transition in the kit reads a **duration token and an easing token**. Twenty-six declarations across six stylesheets wrote their own number instead, at five speeds — `0.15s`, `0.16s`, `0.18s`, `0.2s`, `0.35s` — and thirty-six named a bare `ease`, which is `cubic-bezier(0.25, 0.1, 0.25, 1)` and not the kit\'s `cubic-bezier(0.4, 0, 0.2, 1)`: a second motion vocabulary that looked like the first. The scale they moved onto is the drawer\'s, because the drawer is the one transition whose reasoning was written down — a surface arriving or leaving takes `--dur-med`, a control changing state takes `--dur-fast`, an entrance takes `--dur-slow`. Listed with what each times under **Motion** in `docs/specification.md`.'],
      ['fixed', 'Two menus in the topbar and the dropdown panel transitioned **`all`**, which includes `visibility` — a discrete property held at its OLD value for the whole duration, so the menu was still `hidden` in the frame it opened. `transition: 0.18s ease` and `transition: 0.16s ease` name no property at all; all three now name theirs, and every `visibility` in the kit is timed `linear`, which until now only the drawer and the confirm were held to.'],
      ['added', 'Four easing tokens beside `--ease`: `--ease-out`, `--ease-in`, `--ease-sharp` and `--ease-spring`, each aliasing a brand `--easing-*` primitive. `cubic-bezier(0, 0, 0.2, 1)` was written out by hand four times in `motion.css` as a fallback; the fallback is now written once, in `tokens.css`. `--dur-instant` (80ms) joins the duration scale for the same reason.'],
      ['added', 'The reduced-motion net moved to **`src/styles/reduced-motion.css`**, one copy, and `apliteni-ui/react/css` now ships it too. The React package publishes its own stylesheet, and a consumer who imported only that one got no net — a latent hole rather than a live one, since `react/src` declares no motion today, but the first transition to land there would have shipped unprotected.'],
      ['added', 'A gate over all of it. `stories/motion-tokens.test.js` reads the duration table out of the specification at run time, resolves each token through `tokens.css` into the brand primitive it aliases and checks the milliseconds agree, then sweeps every stylesheet under `src/` and `react/src/` for a transition carrying a literal time or a bare curve, a `visibility` that is eased, or a published entry that ships motion without the net. Ambient loops and choreographed sequences keep their own numbers — a spinner turns until the request answers, and the success check\'s disc, tick and ring are timed against each other — and each says which kind it is and why, at the declaration, in a note the gate parses.'],
    ],
  },
  {
    v: '0.22.0', date: '2026-08-14',
    changes: [
      ['changed', 'A disabled control is now **painted, not faded**. `opacity` is a group property: it pulls a label and the box under it toward the ground together, so what a reader is left with is wherever that composite lands — a disabled `.ui-btn--primary` measured **1.48:1**, white on a washed-out accent, and no disabled control in the light theme reached 3:1. Every disabled rule with a label under it now takes `--disabled-ink` on `--disabled-surface` at full opacity, which composites predictably. Every disabled label in the kit now measures between **5.56:1 and 6.11:1**, in both themes.', ['Button', 'Input', 'Nav', 'Dropdown']],
      ['added', '`--disabled-ink`, `--disabled-surface` and `--disabled-border` — aliases onto `--muted`, `--surface-2` and `--border`, so the ramp gains nothing to keep in sync. They are neutral, so a disabled control does not move with the accent and drops the accent by construction, which is most of what makes it read as inert.'],
      ['added', '**The floor is 3:1, and it has a second half.** `docs/specification.md#colour-and-contrast` records both. It is not higher because the counter-pressure turns out not to live on this axis: the disabled primary reads 5.56:1 and the enabled one reads 5.70:1, and nobody confuses white on purple with grey on grey. Contrast carries legibility; the paint carries the state. So the guarantee also says a disabled control never shows the pair it shows enabled — the half a control cannot satisfy by looking available.'],
      ['changed', 'The floor gate takes its subjects from every **disabled selector** in the sheet rather than from every rule that sets `opacity` — a gate keyed on one technique goes silent the moment the technique changes. It measures each subject twice, once as a story renders it and once with the disabled state taken off the element and the cascade read again, and it refuses an `opacity` under a disabled selector that has a label beneath it. The one rule still fading is the switch track, which has nothing written inside it.'],
      ['changed', 'The accessibility floor page\'s disabled gap is retired: the ledger is gone and the ratchet states a real number.'],
    ],
  },
  {
    v: '0.21.0', date: '2026-08-14',
    changes: [
      ['changed', 'The kit has **three breakpoints**, not six. `860px` is where the page stops holding three tracks, `720px` is where the shell folds, and `560px` is one column — each a viewport class with what changes at it, listed under **Breakpoints** in `docs/specification.md`. The three values that belonged to a single surface each moved to the step above the one they wrote: the footer\'s second collapse from 460 to 560, the version switcher\'s label from 600 to 720, and the site\'s split hero from 760 to 860. Folding **up** rather than to the nearest step is the point — a layout that reflows at a wider viewport has more room than it had, never less, so nothing lost space to the tidy-up.'],
      ['added', 'A gate over the convention. `stories/breakpoints.test.js` reads the three steps out of the specification\'s own table at run time — not a second copy of the list — and fails any `@media` prelude in `src/styles/` or `site/` whose px value is not one of them. It holds the list from both ends: a step nothing queries fails too, so the table cannot grow a row to legalise a stray. Subjects are swept rather than listed, from raw text, which is what reaches the stylesheet inside `site/chrome.mjs`\'s template literal; `site/public/` is build output and is never read.'],
      ['changed', 'The Layout and density guideline states the position on the two coincidences: `560` is also `--panel-lg` and `860` is also `--measure`, and nothing marks it at the query. A breakpoint asks about the viewport and a token bounds a box — the numbers match today and neither follows the other.'],
    ],
  },
  {
    v: '0.20.0', date: '2026-08-14',
    changes: [
      ['fixed', 'The three controls that sat under the kit\'s **24 × 24 CSS px** target floor now reach it, and two of them did it **without being redrawn**. WCAG 2.5.8 measures the target, not the ink: a pointer landing on a control\'s `::before` hits the control, so `.ui-toast__close` and the `.ui-check` input keep the 19 × 19 boxes they are drawn at and each carries a centred 24 × 24 overlay — 2.5px of overhang on every side, against 12px of gap to the toast\'s action and 11px to the checkbox\'s own label. `.ui-snippet__copy` took a real box instead: it was **0.56px** short, and a `min-height` nobody can see beat an overlay nobody can measure.', ['Targets']],
      ['changed', 'The target gate measures **what a pointer can land on**, not what the stylesheet draws. Every `sel::before` / `sel::after` rule is probed onto `sel`, and a control\'s box is the union of its border box and the pseudo-elements it generates — sized from a declared width and height, or from insets against the padding box, which is where the checkbox\'s 1.5px border is the difference between a 24px overlay and a 21px one. Without it a hit-area fix would have failed every test in that file and passed none.'],
      ['added', 'Three tests that keep the new path honest: one fails if no control in the kit reaches the floor through an overlay (so the machinery cannot rot untested), one refuses an out-of-flow pseudo-element whose size the gate cannot read (so nothing hides behind an unmeasurable target), and one derives the floor page\'s gap badge from the exemption list rather than letting the two be written separately. The gate now also states two blind spots it did not have: where an overlay sits, and whether an `overflow: hidden` ancestor clips it.'],
      ['changed', 'The accessibility floor page\'s target-size gap is retired — the exemption list is down to one entry, and that one is a story\'s own demo topbar rather than kit code.'],
    ],
  },
  {
    v: '0.19.1', date: '2026-08-14',
    changes: [
      ['added', '`docs/specification.md` — what the kit ships, what it guarantees, what a consumer may rely on, and what it deliberately does not do. Every statement in it is held by a gate that already runs on `npm test`, so a guarantee that stops being true turns a build red rather than becoming a lie in a document.'],
      ['changed', '`docs/adr/` is gone, and its reasoning was split by who needs it. What the kit guarantees went to the specification; how the repo works — how a gate finds its subjects, how a number gets pinned, how a rule is proven by the mutation that kills its case — went to `CONTRIBUTING.md`, because it never reaches a consumer at all. Why a shape is the way it is stays in the issue that settled it. **No code behaviour changed:** every edit under `src/` is a comment pointing somewhere new.'],
      ['added', 'A gate over documentation references. `scripts/doc-refs.test.js` sweeps every file git tracks, finds anything written as a citation, and resolves it — the file has to exist and an anchor has to be a heading in it. A broken `why:` is worse than no `why:`, because it reads as though the reason exists. Subjects are discovered rather than listed, so a citation joins by being written.'],
    ],
  },
  {
    v: '0.19.0', date: '2026-08-14',
    changes: [
      ['changed', 'Every stroked glyph in the kit is drawn at **1.5 CSS px or wider**. The stroke-width rule drew that line and ruled on the two glyphs that carry a status; ten of the other thirteen were under it, `.ui-snippet__copy` at 0.98 and `.ui-nav__crumb .ui-nav__ic` at 1.06. Eighteen rules were widened or given a stroke they had been borrowing, all landing between 1.51 and 1.60 — the band the status glyphs already sat in, so a glyph\'s weight no longer depends on which slot it fell into. **No token moved:** widening a stroke changes how much of a colour reaches the eye, not which colour it is.'],
      ['added', 'A gate that renders the kit rather than reading it. Two shapes hide from a stylesheet scan — a box override that inherits its stroke from a rule seventy lines up, and a stroke that comes from `icons.js` rather than any stylesheet — so the subjects are elements: every story is built into a DOM and every glyph measured with the cascade resolved. It also refuses a sizing rule no story renders, which is how `.ui-feature__icon` turned out to be shipping with no specimen anywhere. `docs/specification.md#icons-and-glyphs` records the rule and why a second bar for a control\'s glyph was rejected.'],
      ['added', '`.ui-field__error` sizes its glyph. The error row rendered an icon and left it at the reset\'s `1.1em`, so its box followed whatever font-size it landed in.'],
    ],
  },
  {
    v: '0.18.0', date: '2026-08-14', tag: 'latest',
    changes: [
      ['fixed', 'The focus ring is the accent at **full opacity**, and it is declared once. Every ring in the kit was a hand-written `rgba()` at 0.25–0.38 alpha — one per theme in `tokens.css` and six more in `accents.css` — and measured against the grounds it actually lands on, **not one of the eight theme × accent cells cleared 3:1**. The spread ran **1.35:1** (light Emerald) to **2.21:1** (dark Emerald), against the 3:1 WCAG 1.4.11 asks of a focus indicator. Alpha was the whole gap: `--ring: 0 0 0 3px var(--accent)` clears everywhere, worst cell 4.22:1. Re-pointing `--accent` now re-points the ring, so a sub-theme cannot forget one.', ['Focus']],
      ['changed', 'Seven `--ring` declarations are gone — the light one in `tokens.css` and all six in `accents.css`. A sub-theme re-points the accent family and inherits the ring, which is the shape the rest of that file already had. `docs/specification.md#the-focus-ring` records the decision and the eight measurements behind it.'],
      ['added', 'The accessibility floor page states a **ring floor of 4.22:1** rather than a gap. `stories/guidelines/accessibility-floor.test.js` sweeps all eight theme × accent cells with the accents discovered from `accents.css`, holds the ring to a hard 3:1, and fails if `--ring` is ever declared more than once anywhere under `src/` — so the seven that were deleted cannot come back one file at a time.'],
    ],
  },
  {
    v: '0.17.0', date: '2026-08-14', tag: 'latest',
    changes: [
      ['changed', 'The table\'s row rhythm reads the **spacing scale** — the base rhythm as much as `--dense`, because the base was as off-scale as the modifier it was being compared against. Six numbers move: the header\'s under-padding 11px → `--space-3`, the body cell 15px → `--space-4`, the dense header and cell 14px → `--space-3` across and 10px → `--space-2` down, and the hover row inset 6px → `--space-2`. A base row is 2px taller and a dense row 4px shorter, which makes the modifier **more** distinct rather than less: a dense row was 77% of a base row and is now 67%, saving 369px over a twenty-row ledger where it saved 249px.', ['Table']],
      ['changed', 'Three of those numbers sat exactly between two steps — 14 between 12 and 16, 10 between 8 and 12, 6 between 4 and 8 — and where they did **the tie goes to what the value is for**. `--dense` rounds down, because a modifier that exists to fit more rows spends its own distinction by rounding up; the hover inset rounds up, because what it buys is clearance from a container\'s edge and clearance rounds away. `docs/specification.md#spacing-and-rhythm` records the rule, and why no `--row-*` scale was invented for it.'],
      ['added', 'A gate over the table\'s box spacing. It reads the steps out of the token file rather than repeating them, discovers every padding, margin and gap in the sheet rather than listing them, and holds the tie-break itself: `--dense` has to stay tighter than the rhythm it modifies, which a tie rounded the other way would have quietly ended with every other check still green. The Layout and density page stops recording a gap it no longer has — its `except` says what the modifier\'s steps are.'],
    ],
  },
  {
    v: '0.16.0', date: '2026-08-14', tag: 'latest',
    changes: [
      ['added', 'Two scales for everything under the reading column, and **the unit picks which one you are on**. A box that holds a component takes `--panel-sm|md|lg` (320/420/560px); a box that holds a line takes `--prose-caption|lede|body|dense` (44/54/62/72ch), plus `--prose-display` (14ch), which is not a measure but where a display headline rags. Neither scale is new: the drawer has shipped sm/md/lg at exactly those three values since it was written, and `--confirm-w`, `.ui-auth__card` and the toast each wrote one of them out again — so the two 420s the kit was asked about were three. Prose steps are named for what is being read rather than sized s/m/l, because a writer knows which of those they are writing.'],
      ['changed', 'Five widths moved, none by much: the toast and its stack **400px → 420px** (`--panel-md`), `.ui-section-head` **620px → 560px** (`--panel-lg`), the feedback confirmation line **38ch → 44ch**, the hero subtitle **52ch → 54ch** and the shell subtitle **60ch → 62ch**. Two more were prose bounded in px and are now bounded in characters: `.ui-empty__sub` (340px) and `.ui-denied__sub` (380px) are both `--prose-caption`, which is what they measured to at `--text-sm` — the same sentence, in the same shape of component, previously written two ways. Thirteen of the eighteen declarations reconciled did not move at all.', ['Toast', 'Empty', 'Denied', 'Feedback', 'Hero', 'Shell']],
      ['changed', 'The measure gate\'s floor is the **smallest panel step** rather than `--measure`, and it is still read out of the token file rather than written into the test — add a step below 320px and the floor follows it down. A bare `Nch` in a `max-width` now fails the same way a bare `Npx` at or above the floor does, and both failures name the nearest step. The paragraph that explained why the floor sat at the reading column is deleted rather than corrected: it argued for a state of affairs this release ends.'],
      ['fixed', 'The gate reads `style="…"` attributes as CSS. `site/index.html` carried a reading column as an inline `max-width` of 840px on a plain div — a page-scale literal the sweep could not see, because it opened `<style>` blocks and nothing else. It is `--measure` now, as is the changelog page\'s own 820px wrapper. Finding the hole also cost a regex fix: a declaration value allowed to cross a quote ran out of one attribute and swallowed the twenty lines of markup after it, `max-width` included.'],
      ['added', 'A written position on breakpoints, which is the one width a token cannot express — a media query cannot read a custom property. The kit takes **a convention over a build step**: the six literals stay literal under a documented list with a gate over it, rather than putting a compiler between the source and the stylesheet a consumer reads. `docs/specification.md#boxes-below-the-page` records why, and what `@custom-media` would have settled.'],
    ],
  },
  {
    v: '0.15.0', date: '2026-08-14', tag: 'latest',
    changes: [
      ['changed', 'The two glyphs that carry a status are **stroked heavier**: the callout icon goes 1.8 → 2.1, the toast check 2 → 2.8. A stroke-width is stated in the glyph\'s own 24-unit box, so what a reader sees is `stroke-width × box ÷ 24` — the callout icon was drawing at 1.35 CSS px and the toast check at 1.08, and under 1.5 CSS px a stroke cannot put three quarters of its colour into any device pixel row at 1×. WCAG 1.4.11 asks 3:1 of a *graphic*, which is the right bar for a graphic; the ruling is that a stroke has to be wide enough to be one, and below that width the mark is optically a text stem and takes the 4.5:1 text bar instead. Both are now over the line, so 3:1 means what it says.', ['Callout', 'Toast']],
      ['fixed', 'The callout icons take the text-grade `--chip-*-ink` rather than the raw signal token. In the light theme the raw signal is a graphic colour and not one a stroke can be read in — the warn icon measured 3.10:1 on its own wash — and the chip inks are the same five statuses at text grade, which is the reasoning the toast\'s trailing action has carried since 0.9. In the dark theme the two are the same value by construction, so only the light theme moves. No token value changed.', ['Callout']],
      ['fixed', 'A neutral toast\'s check is legible. `--toast-on` for neutral was `--strong`, which put white on a `--muted` circle in dark (3.11:1) and near-black on it in light (3.16:1) — the two worst pairs in the kit. It is `--signal-solid-ink` now, because the neutral circle **is** `--signal-solid-neutral`: one fill, so one ink, and the same pair the solid toast already chose. 6.29:1 and 6.11:1.', ['Toast']],
      ['added', 'A gate over twenty pairs — two glyph families × five statuses × both themes — each held to the bar its own stroke earns. It discovers its subjects from the stylesheet rather than from a list: the families by scanning for a stroked `__icon`, the statuses by the tokens their rules declare. The five-status list the solid-toast gate used to carry is discovered now too, and a status that declares only some of its five paint tokens fails instead of falling through to whatever is in scope. `docs/specification.md#icons-and-glyphs` records why 1.5 CSS px, and why 4.5:1 could not simply be declared instead.'],
    ],
  },
  {
    v: '0.14.0', date: '2026-08-14', tag: 'latest',
    changes: [
      ['added', '`busyRegion({ label, readyLabel, busy, body, lines })` and `setBusy(root, { busy, message, body })` — a screen\'s pending state, and the first thing in the kit that announces one. The shape is the point: the region is rendered **once** and outlives the fetch, and `setBusy()` swaps its body and rewrites the visually-hidden line already inside it. A `role="status"` inserted into the document *together with* its text announces nothing on several screen readers, so the obvious version of this — render the loading markup, then replace it with the loaded markup — is silent in exactly the case it was written for. It reuses the `role="status" aria-live="polite"` pair `toast()` and `success()` already carry, and a gate now fails any `aria-live` in the kit that is not polite, and any `role="alert"` at all.', ['Loading']],
      ['added', '`skeleton({ lines, width, height, radius })` and `skeletonTable({ rows, cols, head })` — placeholder shapes that reserve the layout that is coming, so the page does not jump when the rows land. `lines` takes a count or an array of widths. Both are `aria-hidden` throughout, because a shimmer is a picture of content rather than content, and both reuse `.m-skeleton` from the motion library — so there is one shimmer in the kit and reduced motion is already handled. There is deliberately no spinner factory: `.ui-btn__bars` and `.ui-fbspin` already spin, each owning its context, and at screen scale a skeleton says more anyway — it says what shape is coming.', ['Loading']],
      ['added', '`deniedState({ title, sub, need, actions, icon })` — the 403, drawn in `emptyState()`\'s layout language, because to a reader the two are the same event: what you came for is not here. The lock says which one. `need` names the missing scope verbatim (`reports.read`), since a reader who can name what they lack can ask for it, where "insufficient permissions" sends them to a ticket to find out what to ask for. It carries no live region of its own — dropped inside a `busyRegion()` it is announced as how the fetch resolved, and two regions racing one event is how a screen says things twice.', ['Denied']],
      ['added', '`.ui-sr`, the visually-hidden utility the kit did not have. Its message is for assistive tech only; the sighted reader is already looking at the skeleton.'],
      ['added', 'React takes `busy`. `<Button busy>` sets `aria-busy`, disables, and draws the kit\'s bars — the same ruling `button()` has made since day one, which no React component could express until now. New `Skeleton`, `SkeletonTable`, `BusyRegion` and `Denied` alongside it. `<BusyRegion>` announces by staying **mounted** across the transition; unmounting it and mounting the loaded view in its place is the same silent bug in JSX clothing, and the tests on both sides assert the region element survives.', ['Button', 'Loading', 'Denied']],
      ['fixed', 'The **Guidelines / The full state set** page stops declaring this a gap. Its `loading` rule carried an `unmet` marker — rendered as a *Gap #128* badge on the guidelines overview — saying the kit had no screen-scale pending state to photograph. It now carries the do/don\'t pair it said could not be drawn, and the do side is a real live region, so a screen reader on that page hears the thing the rule is about.'],
    ],
  },
  {
    v: '0.13.0', date: '2026-08-13', tag: 'latest',
    changes: [
      ['changed', 'The kit\'s page container is **1120px**, down from 1180px. `.ui-container`, `.topbar__in` and `.ui-footer__in` all read one token now, and every page built from them is 60px narrower. The number is not new — it is what ui.apli.tech has always been, and the site got there by overriding the kit\'s own topbar back down, a line of CSS it paid to disagree with the component it borrows. Because nothing in the kit argued for 1180, that override was the only recorded intent there was. If you want the old width, set `--container: 1180px` on `:root` and every one of those surfaces follows.', ['Container', 'Topbar', 'Footer']],
      ['added', '`--container` and `--measure` — the two widths a page actually has. `--container` is the page, gutter to gutter. `--measure` (860px) is the reading column *inside* a track that already has a sidebar beside it, which is what `.ui-app__main` takes. Because they are different axes, one never substitutes for the other: a shell whose main column is `--container` has no sidebar. Counting only page-scale values, the kit held ten different numbers before this and no token for any of them.'],
      ['fixed', 'The app shell states its reading width in one place. `shell.js` carried its own `860px` beside the same number in `layout.css`, and a test compared the two strings to keep them true — two sources with a guard, not one source. Pass no `maxWidth` and the shell now writes no property at all, so the stylesheet resolves to `--measure`. An unusable value removes the property rather than passing it on, which matters more than it sounds: a custom property accepts any token stream, so a bad one is a *valid* declaration that makes `max-width` invalid at computed-value time and drops the column to the full track. Once you pass an explicit `maxWidth`, it works exactly as before.', ['Shell']],
      ['added', 'A gate fails on a literal page-scale `max-width` anywhere in `src/styles` or the site. It finds its subjects by scanning the property rather than reading a list of files, so a new stylesheet is covered by existing, and its floor is read out of `--measure` rather than written into the test. A media query is not a subject, because a breakpoint is a question about the viewport rather than a width given to a box. So a test says exactly that, against a live breakpoint sitting on the floor itself.'],
      ['added', 'A **Guidelines / Layout and density** page: the two widths, why one source beats two held in step, and where density comes from. The kit has no density mode and that is the position, not an omission — the spacing scale is the control. `.ui-table--dense` is the one component-local exception, and the page says plainly that its own numbers are literals rather than steps.'],
    ],
  },
  {
    v: '0.12.0', date: '2026-08-13', tag: 'latest',
    changes: [
      ['fixed', 'A status glyph and a close button no longer share a shape. A danger `toast()` rendered the same bare `x` twice — once on the left meaning *this failed*, once on the right meaning *make this go away* — and the reader had to work out which from position. Status now uses the circled glyphs the kit was already shipping and never using: `circleCheck`, `circleX`, `circleAlert`. The bare `x` belongs to the close button alone. The rule underneath is worth knowing if you pick your own: **a circled glyph is a state the system reports, a bare glyph is an action you can take.** `info` and `neutral` are unchanged, and anything you pass as `icon` still wins.', ['Toast', 'Callout']],
      ['added', '`iconOnlyAllowed` — the closed list of actions a control may drop its visible label for: close or dismiss, copy, overflow menu, expand or collapse. Every kit glyph is `aria-hidden`, so an icon-only button has always been forced to name itself; that said a nameless one cannot ship, never that a wordless one should. This does. A gate reviews the kit\'s own call sites against it, and found one — a settings cog in the button stories — on its first run.', ['Button']],
      ['added', '`iconMeanings` — what a glyph means when a component picks it for you rather than you naming it, covering the eight the kit wires to semantics.'],
      ['fixed', '`card`, `chart` and `doc` are declared once each. The `COMMS` group re-declared all three with byte-identical path data, so the icon catalogue filed one glyph under two headings and the file carried three lines nobody could tell from a real glyph. Nothing you call changes — `icon(\'card\')` resolved the whole time — and a gate now fails a name declared in more than one group.', ['Icons']],
      ['added', 'A **Guidelines / Iconography** page: when a control may go wordless, what a glyph means, and what adding one costs — naming, which group it belongs to, and where its path came from. Each rule links the gate that holds it.'],
    ],
  },
  {
    v: '0.11.4', date: '2026-08-13', tag: 'latest',
    changes: [
      ['fixed', 'A toast\'s trailing action is readable on every status. It was painted in the status accent — a colour picked for a 3px rule and a 22px icon circle, not for text — so in the light theme a warn action measured 3.29:1 on its own wash where AA asks 4.5:1, and success, info and danger were short on at least one style each. The action takes the kit\'s text-grade signal inks now, the same ones the chips are set in. Its hover has changed direction too: it used to wash the ground with a second helping of the status colour, which moved the ground *towards* the ink it has to clear, so a hovered action read worse than a resting one. It lifts towards the page instead. The dark theme is unchanged, because there the two inks are already the same value. Nothing you pass to `toast()` changes.', ['Toast']],
      ['added', '`--toast-action-ink` — the trailing action\'s colour is its own custom property, set per status alongside `--toast-accent`. Override it if you want an action in a colour of your own; `--toast-accent` still drives the marker, the icon circle, the timer bar and the outline border.', ['Toast']],
      ['fixed', 'The React data table\'s sort caret is legible. It painted the muted ink at half opacity, which took a glyph carrying the sort direction down to 2.16:1 in the light theme — under half the AA floor. The opacity is gone, so the caret is the muted ink at full strength.', ['DataTable']],
    ],
  },
  {
    v: '0.11.3', date: '2026-08-13',
    changes: [
      ['fixed', 'The accent picker shows Nebula as the violet you actually get. Its swatch was a fixed gradient, and it stopped tracking the tokens in 0.11.0 when the default accent lifted to clear AA on its own wash — so the chip you pressed to choose the kit\'s default accent held neither colour that accent resolves to. Phoenix, Ocean and Emerald were always right and are unchanged. Every swatch is now made of its own accent\'s ramp, and a test holds it there rather than a line in the contributing guide.', ['Footer']],
    ],
  },
  {
    v: '0.11.2', date: '2026-08-13',
    changes: [
      ['added', 'The kit has guidelines — five pages in Storybook under **Guidelines**, with an index that says what each covers and how many of its rules the kit actually meets. Colour and theming, the full state set, which component suits which job, microcopy and tone, and destructive actions. Every rule shows a live do and don\'t built from real components, and cites the lines of the kit that implement it.'],
      ['added', 'Two rules say the kit does not meet them yet, and name the issue tracking each. A guideline nobody has implemented is worth more written down and marked than left out, and worth less than nothing asserted as if it were true.'],
      ['changed', 'The design rules left `CONTRIBUTING.md`. Tokens over literals, signal colours staying constant, the states a component owes, both themes and all accents, and a control naming the state it is in — all five are in the guidelines now, and deleted from the contributing guide rather than copied. Nothing you install changes; if you had bookmarked a golden rule by its number, it has a page instead.'],
      ['fixed', 'The wording guideline cited a button labelled `Revoke`, which fails the test the rule states out loud — does the label make sense on its own? The example screen says `Revoke access` now, and the rule cites the kit\'s own confirmation first.'],
    ],
  },
  {
    v: '0.11.1', date: '2026-08-13',
    changes: [
      ['fixed', 'A drawer stops taking clicks the moment it starts closing. Its panel and scrim stayed hit-testable for the length of the close fade, so a click landing in that window still reached a control inside the panel and ran your handler a second time — a double-click on a drawer\'s own button was enough. The closing animation is unchanged.', ['Drawer']],
      ['fixed', 'Where two overlays are rendered open together, the one you can see is the one Escape closes. A confirm paints a layer above a drawer, but the keyboard went to whichever root came later in the markup — so a confirm written before the drawer it asks about went inert while Escape closed the drawer underneath it. Opening a confirm over a live drawer with `openConfirm()` was never affected.', ['Drawer', 'Confirm']],
    ],
  },
  {
    v: '0.11.0', date: '2026-08-12',
    changes: [
      ['added', '`appShell()` — the kit has one page shell now. A full-height rail built from the kit\'s own `sidebarNav()`, beside exactly one `<main>`. The breadcrumb trail is yours: pass `crumbs` and it renders `breadcrumbs()`, pass nothing and there is no trail. The topbar is off unless you ask for one.', ['Shell']],
      ['added', 'The rail folds to icons below 720px instead of disappearing. Every row keeps its accessible name at every width, and the icon target measures 45×44px on a phone. Before this, a 375px screen got three navigation links, none of them reachable.', ['Shell']],
      ['breaking', '`accountShell()` is now a preset over `appShell()`, and its markup changed. It emits a `<main>` where it emitted none, its sidebar is `sidebarNav()`\'s `.ui-nav--side` rather than a hand-written `.ui-side`, and its breadcrumb comes from `breadcrumbs()`. Every option it took it still takes, including the old `[id, icon, label, href, target]` nav tuples — but CSS or scripts of yours that reached for `.ui-side`, `.ui-shell`, `.ui-shell__crumbs`, `.ui-shell__page` or `.sub` no longer find anything, because nothing emits that markup any more. The shell has also stopped emitting `.ui-card-stack`; that rule is still in `card.css`, so markup of your own carrying the class still spaces the same way. Inside the shell the card stack is `.ui-app__body` and the page subtitle is `.ui-app__sub`.', ['Shell']],
      ['breaking', '`ACCOUNT_NAV` is a list of `{ id, icon, label }` objects, not `[id, icon, label]` tuples. `sidebarNav()`, `appShell()`, `accountShell()`, `topbar()` and `accountMenu()` all read either shape, so passing it anywhere the kit takes a nav still works — but if you spread or destructure its entries yourself, that is the line to change.', ['Shell']],
      ['breaking', 'A nav label that arrives pre-escaped now shows its entity. Every nav primitive escapes what it is given, so `[\'x\', \'gear\', \'Access &amp; agents\']` renders as `Access &amp;amp; agents`. The kit taught this pattern: the `ACCOUNT_NAV` it shipped spelled that ampersand as an entity, because the old shell interpolated raw HTML. Pass raw text — `Access & agents` — wherever you were passing entities.', ['Shell']],
      ['breaking', '`crumb` is escaped rather than inserted as HTML. It used to land inside a `<b>` the shell wrote itself; it now goes through `breadcrumbs()`, which escapes every label. `crumb: \'<em>Payouts</em>\'` rendered italic before and renders the tags as text now. There is no markup slot in the trail — pass an item with an `icon` to `appShell({ crumbs })` if you need one.', ['Shell']],
      ['changed', '`sub` is a `<p>`, not a `<div>`. It is still a trusted-HTML slot, but a `<p>` closes at the first block element the parser meets, so `sub: \'<div>block</div>\'` now leaves a stray `</p>` behind it. Inline markup is unaffected; anything block-level belongs in `body`.', ['Shell']],
      ['removed', 'The `.ui-side` and `.ui-shell` rules are gone from the stylesheet. Nothing emitted that markup any more.', ['Shell']],
      ['fixed', 'A rail label keeps the kit\'s own colour under a host stylesheet\'s `a:link`. The kit\'s declaration was `.ui-nav__item` at (0,1,0) and a host\'s `a:link` is (0,1,1), so every resting rail label took the host\'s link colour. The breadcrumb link is held the same way.'],
      ['fixed', 'A badged rail row is announced with its count. The row carries an accessible name at every width now, and a name built from the label alone had narrowed "Pending 3" to "Pending".'],
      ['fixed', 'The signed-in reader sits beside the rail\'s navigation, not inside it — a screen reader was announcing the reader\'s email address as a navigation entry.'],
      ['fixed', 'A shell no longer names a reader you did not give it. Where a caller passed only an address, or no account at all, the topbar menu filled the gap with the kit\'s own demo person — so a page could name your reader in the rail and somebody else beside it.', ['Shell']],
      ['changed', 'The account menu\'s initials come from the display name when there is one, and from the address otherwise. They were read from the address alone, so the rail and the menu could draw two different marks for one reader.'],
      ['changed', '`ACCOUNT_NAV` spells its ampersand as `&` rather than `&amp;`. If you read that constant\'s labels yourself, they are raw text now.'],
    ],
  },
  {
    v: '0.10.0', date: '2026-08-12',
    changes: [
      ['breaking', '`drawer({ open: true })` now really opens — the page behind goes inert, Tab is trapped in the panel, Escape closes it. A sidebar or an inline specimen that should sit there open wants `specimen: true`. `confirm()` reads `open: true` the same way.'],
      ['added', '`confirm()` — the question a page stops for before something irreversible. A focus-trapped modal over a scrim; Escape cancels, and it opens on the safe answer, so a reader who hits Enter out of habit keeps what they have.'],
      ['fixed', 'Opening a drawer puts the reader inside it. Focus was asked for while the panel still counted as hidden, so it went nowhere — and the page behind was already hidden from assistive technology by then, leaving the reader on the document body with nothing to read and nothing to tab to.', ['Drawer']],
      ['fixed', 'Two overlays open at once — two drawers, or a confirm over a drawer — no longer hide the whole page from assistive technology until a reload. Closing them out of order used to leave everything outside them `inert` for good.'],
    ],
  },
  {
    v: '0.9.1', date: '2026-08-09',
    changes: [
      ['changed', 'Nothing you can see. 0.9.0 shipped, and then two comments inside shipped stylesheets changed without a version bump, so the package on npm stopped matching the source. This release makes them agree again — upgrading from 0.9.0 changes no rendering and no API.'],
      ['fixed', 'Releasing no longer depends on someone remembering to do it. A version bump landing on `main` is tagged, gets a release whose notes are its changelog entry, and is published. A pull request that changes what the package ships without bumping the version fails, and a daily check opens an issue if what is on npm and what is on `main` disagree for more than a day. Silence used to look the same as success; it no longer does.'],
    ],
  },
  {
    v: '0.9.0', date: '2026-08-09',
    changes: [
      ['breaking', 'The inline-icon reset is a floor again, not a ceiling. `svg:not([width]):not([height])` counted both attribute selectors and weighed (0,2,1), so it quietly outranked every `.ui-btn svg`-shaped rule — in the kit and in your own CSS. It is now `svg:where(:not([width]):not([height]))` at (0,0,1). Any icon rule of yours that was silently losing to it now applies, so icons you sized yourself will change to the size you actually asked for.'],
      ['added', '`footer()`, `success()`, `successCheck()` and `wireSuccess()` are reachable from the package root. They were in the source and missing from the entry point, so nobody could import them.'],
      ['added', '`empty.css` ships through `/inline`, so the empty-state styles reach anyone using the inline stylesheet rather than the built one.'],
      ['fixed', 'The theme control reports the theme you are in, never the one a click would produce — in the glyph and in the accessible name, which is rewritten whenever the state changes.', ['Topbar']],
      ['fixed', '`--pink` clears the surfaces it is drawn on in both themes, and the live pill and info badge clear AA in light.', ['Badge', 'Callout']],
      ['fixed', 'A glow wash is a tint of the colour it carries. The values that had drifted are back in line and a test holds them there.'],
      ['fixed', 'The danger nav row is quiet at rest and turns `--pink` on hover, which is what the destructive-actions guideline says it should do.'],
      ['changed', 'Colour contrast is measured rather than reviewed by eye. Every story is mounted per theme against the real stylesheets, and each text-owning element is measured against the background actually composited beneath it. Pairs that stay below the bar are recorded with a written reason rather than left to be rediscovered.'],
    ],
  },
  {
    v: '0.8.1', date: '2026-08-07',
    changes: [
      ['fixed', 'The zebra table recipe insets its own end cells, so a striped row no longer runs into the container border.', ['Table']],
      ['fixed', 'The audience switcher on the homepage announces itself as a tablist and then behaves like one — roving tabindex, arrow keys, `aria-selected`.'],
      ['fixed', 'The Storybook toolbar selector works again, and the workbench stops composing stories from outside the kit.'],
      ['fixed', 'Releases publish again. `npm publish` was handed the tarball as a bare `a/b` path, which npm reads as owner/repo shorthand, so every publish resolved a repository instead of the file and died on a public-key error.'],
    ],
  },
  {
    v: '0.8.0', date: '2026-08-07',
    changes: [
      ['added', 'React components ship as `@apliteni/apliteni-ui/react` — Button, Badge, Card, Icon, Modal and DataTable, with their own stylesheets and stories. The vanilla kit is unchanged and remains the source of truth for tokens.'],
      ['added', 'Guidelines are a place in Storybook now, starting with destructive actions. Each rule cites the lines of the kit that implement it, and a test fails the build when a cited line drifts.'],
      ['added', 'Storybook flips theme in one click instead of through a dropdown.'],
      ['fixed', 'Light-mode Phoenix and Emerald were deepened to meet WCAG AA. Both failed as text and as a button fill.'],
      ['fixed', 'Danger is always `--pink`, and colour comes from tokens rather than from literals scattered through the components.'],
      ['fixed', 'Field errors are connected to their fields, decorative icons are hidden from assistive technology, every icon-only control has a name, and the accessibility gates that were meant to catch all of this actually run.', ['Inputs']],
      ['changed', 'The icon set is unified on canonical Feather/Lucide glyphs, so the same idea is the same drawing everywhere.'],
      ['changed', 'Storybook 8 → 10 and Vite 5 → 6.'],
    ],
  },
  {
    v: '0.7.2', date: '2026-07-24',
    changes: [
      ['changed', 'Relicensed as **MIT** (was proprietary/UNLICENSED). The package is published on public npm, so MIT matches how it can actually be used — install and use it freely across your products.'],
    ],
  },
  {
    v: '0.7.1', date: '2026-07-24',
    changes: [
      ['fixed', 'Table row hover no longer collides with its container’s border — `.ui-table--hover` now draws the highlight as an inset, rounded pill (a few px clear of the edge) instead of a full-bleed rectangle. Dense/zebra ledgers keep their existing full-bleed tint.'],
      ['changed', 'Homepage polish: code-block Copy buttons morph a copy glyph into a checkmark on success (reduced-motion swaps instantly), bento icon tiles use larger crisp glyphs, and the footer gets a visible link hover plus an Apliteni → apliteni.com link.'],
    ],
  },
  {
    v: '0.7.0', date: '2026-07-24',
    changes: [
      ['added', 'Tabs component — `tabs({ items, active, name })` renders an accessible tablist + panels (framework-agnostic HTML string); wire it with `initTabs()`. Full WAI-ARIA pattern: roving tabindex, Arrow/Home/End keys, aria-selected and aria-controls wiring. New Components → Tabs story.'],
    ],
  },
  {
    v: '0.6.1', date: '2026-07-23',
    changes: [
      ['changed', 'Theme toggle is now a single icon-only switch — a compact sun/moon button (no "Light/Dark" text). Keeps its `aria-label`, so the accessible name is intact. Affects `topbar({ theme: true })` and the site chrome.'],
    ],
  },
  {
    v: '0.6.0', date: '2026-07-23',
    changes: [
      ['removed', 'Aurora background — the `aurora()` component and the `.ui-bg-aurora` backdrop are gone. Nothing in the kit used them, so they were dead weight. The ambient `.ui-glow` blobs and the other backdrops (spotlight, accent wash, grid, dots) stay. Removing a public export is a breaking change — hence the minor bump.'],
      ['added', 'Homepage bento shows more of the kit — live Icons and Motion cells — and its blocks read as distinct panels (per-cell hue, no card hover).'],
    ],
  },
  {
    v: '0.5.0', date: '2026-07-23',
    changes: [
      ['added', 'Motion library — a small, token-driven set of reusable effects as plain classes: entrances (`.m-fade-in`, `.m-slide-up/-down/-left/-right`, `.m-scale-in`, `.m-blur-in`), micro-interactions (`.m-lift`, `.m-press`, `.m-skeleton`), attention (`.m-pulse`, `.m-shake`, `.m-draw`) and staggered scroll reveals (`[data-reveal]` + the optional `initReveal()` hook). Demoed in Foundations → Motion with a live token table and a Replay playground.'],
      ['added', 'One global `prefers-reduced-motion` rule that neutralises every animation and transition in the kit — closing gaps where the badge pulse and smooth scroll were previously unguarded — while letting one-shots settle on their final frame.'],
      ['changed', 'Motion now speaks the Apliteni brand vocabulary — durations and easings sync from design-system (`--duration-*` / `--easing-*`); the kit’s `--dur-*` / `--ease` alias onto them, with new `--delay-1…5` for staggering.'],
      ['changed', 'Landing “Built for people and agents alike” grid rebuilt as a bento with per-cell hues and no card hover, so the blocks read as distinct and the real controls inside each one no longer fight a card-level animation.'],
    ],
  },
  {
    v: '0.4.0', date: '2026-07-21',
    changes: [
      ['added', 'Ambient aurora background — `aurora()` lays down drifting glow blobs plus an optional paper grain. Colours read the accent tokens, so it re-themes across Nebula, Phoenix, Ocean and Emerald with no per-app CSS. Full-bleed `fixed` mode; `prefers-reduced-motion` respected.'],
      ['added', 'Accessibility CI gate — every story runs through axe (WCAG 2.0/2.1 A + AA) under `npm test`, so violations can’t regress.'],
      ['added', 'Apliteni seedling on the Brand page alongside the kit prism, each with a size ramp.'],
      ['fixed', 'Resolved the WCAG A/AA violations the a11y panel flagged — real labels on every input, named listboxes, `select()` factory.'],
      ['fixed', 'Consent-card brand lockup — the mark no longer jams against the label; `.brand` is now self-contained outside the topbar.'],
      ['fixed', 'The aurora CSS now ships through the inline / server-render bundle too (`/inline` export, site `kit.css`), not just the bundler entry.'],
      ['changed', 'Calmer Storybook manager chrome — purple reads as a sparing accent, not a wall.'],
    ],
  },
  {
    v: '0.3.0', date: '2026-07-21',
    changes: [
      ['changed', 'Light theme is now a true white app — `--bg` / `--surface` both `#ffffff` with retuned neutrals, so downstream products stop forking CSS.'],
      ['added', 'Finance data-table treatment (`.ui-table--dense/--zebra/--hover`, `__num` / `__code`) and the semantic status badges, promoted into the kit.'],
      ['fixed', 'Light cards get a hairline border + soft shadow so they read as panels on white; a too-wide table scrolls inside the card instead of bleeding past its corners.'],
    ],
  },
  {
    v: '0.2.4', date: '2026-07-20',
    changes: [
      ['fixed', 'Active segmented pill now sits inside its track — the heavy card shadow was spilling past the edge and reading as overflow. New tight `--shadow-seg` token.', ['Segmented']],
    ],
  },
  {
    v: '0.2.3', date: '2026-07-20',
    changes: [
      ['added', 'Gradient-bars busy loader on buttons — the button is disabled while it works.', ['Button']],
      ['added', 'Centered + glow Google-SSO sign-in, with idle / signing-in states.'],
    ],
  },
  {
    v: '0.2.2', date: '2026-07-20',
    changes: [
      ['added', '`--accent-strong` token — primary buttons now clear WCAG AA contrast.', ['Button']],
      ['added', '`--seg-active-bg` token — the active segmented pill reads clearly in dark.', ['Segmented']],
      ['added', 'Google-SSO-only sign-in story.'],
      ['fixed', 'Card grids no longer misalign — spacing moved to `.ui-card-stack` (the child margin leaked into rows).', ['Card']],
      ['changed', 'Removed the auto-generated Storybook “Docs” pages; intro wordmark reads apliteni-ui.'],
    ],
  },
  {
    v: '0.2.1', date: '2026-07-20',
    changes: [
      ['fixed', 'Larger feature icons; aligned landing preview cards; roomier hero.'],
      ['changed', 'Version moved to a nav pill; dropped the Strategy footer link.'],
    ],
  },
  {
    v: '0.1.2', date: '2026-07-20',
    changes: [['fixed', 'Enlarged the consent scope + app-chip icons.']],
  },
  {
    v: '0.1.1', date: '2026-07-20',
    changes: [['fixed', 'Account menu stays hidden until the session is confirmed (`.acct.on`).']],
  },
  {
    v: '0.1.0', date: '2026-07-20', tag: 'first',
    changes: [
      ['added', 'First release — tokens, components, and the deck theme.'],
      ['added', 'Accent sub-themes — Nebula, Phoenix, Ocean and Emerald — in dark and light.'],
      ['added', 'Storybook workbench + the ui.apli.tech landing.'],
    ],
  },
];

// Component display name → Storybook story id (title kebab + first export).
// A name absent here renders as a plain, unlinked chip.
const COMPONENTS = {
  Table:     'components-table--finance-data',
  Badge:     'components-badge-status--badges',
  Button:    'components-button--playground',
  Card:      'components-card--variants',
  Callout:   'components-callout-toast--callouts',
  Confirm:   'components-confirm--playground',
  Drawer:    'components-drawer--playground',
  Inputs:    'components-inputs--text-fields',
  Segmented: 'components-segmented-control--playground',
  Snippet:   'components-code-snippet--shell',
  Switch:    'components-switch-checkbox--switches',
  Topbar:    'components-topbar--full',
  Feedback:  'components-feedback--default',
};

const STORYBOOK = (id) => `/storybook/?path=/story/${id}`;

const TAG = {
  added: { label: 'Added', cls: 'added' },
  fixed: { label: 'Fixed', cls: 'fixed' },
  changed: { label: 'Changed', cls: 'changed' },
  removed: { label: 'Removed', cls: 'removed' },
  breaking: { label: 'Breaking', cls: 'breaking' },
};

// GitHub handle map — resolves a commit email to an avatar + profile.
// Unknown authors fall back to an initials chip and plain name.
const AUTHORS = {
  'artur.sabirov@apliteni.com': { handle: 'asabirov', name: 'Artur Sabirov' },
};

const initialsOf = (name) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

// Parse `git log --format=%an%x09%ae` output into deduped, bot-filtered contributors.
export const parseContributors = (logText, authors = AUTHORS) => {
  const seen = new Map(); // email → { name, count }
  for (const line of logText.split('\n')) {
    if (!line.trim()) continue;
    const [name, email] = line.split('\t');
    if (!name || !email) continue;
    if (/\[bot\]/i.test(name) || /\[bot\]/i.test(email)) continue;
    const key = email.toLowerCase();
    const cur = seen.get(key) || { name, count: 0 };
    cur.count += 1;
    seen.set(key, cur);
  }
  return [...seen.entries()]
    .map(([email, { name, count }]) => {
      const a = authors[email];
      const person = a
        ? {
            name: a.name, handle: a.handle,
            url: `https://github.com/${a.handle}`,
            avatar: `https://github.com/${a.handle}.png?size=48`,
            initials: initialsOf(a.name),
          }
        : { name, handle: null, url: null, avatar: null, initials: initialsOf(name) };
      return { person, count };
    })
    .sort((a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name))
    .map(({ person }) => person);
};

// Per-release contributor row: avatar (photo or initials) + handle/name chip.
export const contributorChips = (people) => {
  if (!people || !people.length) return '';
  const who = (p) => {
    const av = p.avatar
      ? `<img class="av" src="${attr(p.avatar)}" alt="" width="22" height="22">`
      : `<span class="av ini">${fmt(p.initials)}</span>`;
    const label = p.handle ? `@${fmt(p.handle)}` : fmt(p.name);
    return p.url
      ? `<a class="who" href="${attr(p.url)}">${av}${label}</a>`
      : `<span class="who">${av}${label}</span>`;
  };
  return `<div class="contrib"><span class="people">${people.map(who).join('')}</span></div>`;
};

// tiny inline-code + backtick formatter (no external md)
const fmt = (s) => s
  .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  .replace(/`([^`]+)`/g, '<code class="ui-code">$1</code>');

// Escape a value for use inside a double-quoted HTML attribute.
const attr = (s) => String(s).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));

// Per-change component chips: known → Storybook deeplink, unknown → plain pill.
export const componentChips = (names) => {
  if (!names || !names.length) return '';
  const chip = (n) => COMPONENTS[n]
    ? `<a class="comp" href="${STORYBOOK(COMPONENTS[n])}">${fmt(n)}</a>`
    : `<span class="comp plain">${fmt(n)}</span>`;
  return `<span class="chips">${names.map(chip).join('')}</span>`;
};

export const isBreakingRelease = (r) => r.changes.some(([t]) => t === 'breaking');

const BREAKING_BADGE = `<span class="ui-badge ui-badge--breaking">` +
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>` +
  `Breaking</span>`;

export const release = (r, contributors) => `
  <section class="rel">
    <div class="rel__rail"><span class="rel__dot${r.tag === 'latest' ? ' is-latest' : ''}"></span></div>
    <div class="rel__body">
      <header class="rel__head">
        <span class="rel__v">v${r.v}</span>
        <span class="rel__date">${r.date}</span>
        ${r.tag === 'latest' ? '<span class="ui-badge ui-badge--live">Latest</span>' : ''}
        ${r.tag === 'first' ? '<span class="ui-badge ui-badge--soon">First</span>' : ''}
        ${isBreakingRelease(r) ? BREAKING_BADGE : ''}
      </header>
      <ul class="rel__list">
        ${r.changes.map(([t, text, comps]) => `<li><span class="tag tag--${TAG[t].cls}">${TAG[t].label}</span><span>${fmt(text)}${componentChips(comps)}</span></li>`).join('')}
      </ul>
      ${contributorChips(contributors)}
    </div>
  </section>`;

export const changelogMain = (contributorsByVersion = {}) =>
  RELEASES.map((r) => release(r, contributorsByVersion[r.v])).join('');
