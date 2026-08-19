# Contributing to @apliteni/apliteni-ui

The kit is **framework-agnostic HTML + CSS**: design tokens, one CSS file per
component, and tiny factory functions. Storybook is the workbench. `src/` has no build
step — what you write is what ships. The one exception is the React components in
`react/`, which are compiled by tsup into `react/dist/` and published as the
`@apliteni/apliteni-ui/react` subpath (see below).

## Setup

```bash
npm install
npm run storybook        # http://localhost:6006
```

`npm test` also needs [`jq`](https://jqlang.github.io/jq/) on your PATH: `brew install jq`,
`apt install jq`, `winget install jqlang.jq`. Without it the tests covering the release
workflow's publish step skip themselves instead of failing, so a green local run is not
proof they passed. CI stops the run rather than skipping them.

## Issues & pull requests

- **Found a bug or want a component?** Open an issue — pick **Bug report** or **Component
  or enhancement request** so the important details are captured up front. One thing per issue.
- **Sending a change?** Fork, branch off `main` (`fix/…` or `feat/…`), and open a PR against
  `main`. Fill in the PR template: what changed, the linked issue, and the verification
  checklist.
- **`main` is protected.** Direct pushes are blocked, and five checks have to be green before
  the merge button works: `build`, `Dependency audit`, `Published artifact check`, `Secret scan
  (gitleaks)` and `Internal-terms denylist`. Inside `build` are the build itself, `npm test`
  (unit + axe a11y) and the React tests. Review conversations have to be resolved as well —
  one open thread greys the button out with all five checks green.
- **Less is enforced than that sounds.** No review is required — the rule asks for zero
  approvals, so you can merge your own pull request. Nor is `Shipped surface vs version` (see
  Release) one of the required checks, which means it can go red while the merge button stays
  green. And because pull requests need not be up to date with `main`, two of them can each
  bump to the same version. Repository admins are exempt from all of it. Making any of this
  stricter takes three settings on the branch rule for `main` — require one approving review,
  add `Shipped surface vs version` to the required checks, turn on "require branches to be up
  to date" — and none of them live in this repository.
- Keep PRs focused. One concern per PR reviews faster than a grab-bag.

## Rules

The rules for designing a screen are in the **Guidelines** section of Storybook —
[ui.apli.tech/storybook](https://ui.apli.tech/storybook/). Tokens and colour, the states
a component owes, which component to reach for, how it words itself. Read them before
you start, not at review.

**No visual slop.** Run the AI-slop detector on any new example page. It reads
comments too: past about twenty-five lines, a comment block has stopped being a
comment and become a design document. What the kit guarantees goes in
[docs/specification.md](docs/specification.md), how the repo works goes below, why
this shape and not another goes in the issue — see
[docs/README.md](docs/README.md#where-a-decision-gets-recorded). The code keeps a
one-line pointer:

```js
// why: docs/specification.md#icons-and-glyphs
```

`scripts/doc-refs.test.js` resolves every such pointer in the tree, so a citation
that stops landing fails a build instead of misleading whoever follows it.

## Data handling

This repo is **public**. Never commit real customer or financial data, personal
emails or phone numbers, or internal infrastructure identifiers (Lessly
service/org/product IDs, `*.lessly.run` hosts, ttl.sh image tags, deploy tokens) —
in code, fixtures, **issues, or PR text**. Use clearly-fabricated placeholders for
all demo data (e.g. `Ada Lovelace / ada@apliteni.com`).

Two automated gates enforce this (see `.github/workflows/security.yml`), and both
are required checks: gitleaks with a PII/infra ruleset (`.gitleaks.toml`), and an
internal-terms denylist, which greps the tracked files as they stand. On a pull
request gitleaks reads only that pull request's own commits; on a push to main it
reads the whole history. Run them locally before pushing with
[pre-commit](https://pre-commit.com): `pip install pre-commit && pre-commit install`.
Issues and PR bodies aren't covered by gitleaks — a separate workflow warns on
internal identifiers posted there, but the responsibility is yours.

Two of those gates check themselves, and it is worth knowing which two.
`scripts/gitleaks-rules.check.mjs` mutation-tests every rule in `.gitleaks.toml`, and
`scripts/secret-scan-range.check.mjs` lifts the scan step's own logic out of
`security.yml` and runs it against synthetic repositories. Because both sit inside the
required Secret scan job, a diff that loosens a scanner rule or the scan's commit range
turns that job red.

What nothing checks is the checkers. Those two scripts are graded by themselves, and
`.pre-commit-config.yaml` and the rest of `.github/` by nothing at all, so a diff that
guts one of them passes every gate this repo has. Please say so in the pull request body
when you touch one, so the reviewer reads the change itself rather than the run.

## How the gates work

The rules below govern every gate in this repo. They are about the gates rather than about the
kit, which is why they live here and not in
[docs/specification.md](docs/specification.md).

### A gate discovers its subjects and never enumerates them

A gate sweeps a surface and works on whatever it finds there. A new page, a new story, a
new stylesheet beside `preview.js`: in scope by existing, with nothing to add to a list.

A hand-written list of selectors is the thing this rule exists to prevent, and the cost of
breaking it is on record. `stories/glyph-stroke.test.js` replaced a prose enumeration of
stroked glyphs that named six of ten and missed four. The icon gate collected only
selectors ending in `svg` until `.ui-fbck` — a class the kit puts *on* an svg — turned out
to be losing to the same reset as everything else, unmeasured.

Three riders come with it:

- **The count is asserted.** A file that stops carrying a subject leaves the count, so
  coverage cannot quietly shrink to zero and stay green.
- **Where a count cannot see, a test says so.** `.storybook/` contributes no subject
  today, so a count cannot tell whether it was read at all. A test named for the surface
  is what proves it was.
- **The subject is the element, not the declaration**, wherever the two can disagree. Two
  shapes in this kit make them disagree, and a stylesheet scan gets both wrong. A rule can
  re-size an icon's box and let the stroke come from a rule further up
  (`.ui-nav--side.is-collapsed .ui-nav__ic svg`), which read one declaration at a time looks
  like a rule with no stroke in it. And a stroke can arrive from the markup: `src/assets/icons.js`
  puts `stroke-width` on every icon it emits, `feedback.js` emits its own with a different one,
  and `sun` and `moon` hard-code a third — so a rule that sets only a box still paints a stroked
  glyph, at a width decided in a file no stylesheet scan opens. `stories/glyph-stroke.test.js`
  therefore renders every story and measures the `<svg>` elements that come out, cascade already
  resolved.

Compose from source, never from a built site. CI runs `npm test` before
`build-storybook` and never runs `site/build.mjs`, so a gate reading `site/public/` fails
in CI — and one that skips when the directory is absent drops coverage in silence, which
is worse.

### A gate that skips is worse than a gate that is absent

`stories/a11y.test.js` renders every story in both themes and runs axe-core over the result, and
it refuses two things it used to do.

**Skipping quietly.** A story that threw — anything calling `document.createElement` blew up in
bare Node — or returned a DOM node instead of a string was silently `continue`d. Five stories,
including the whole Feedback file, were "covered" by a test that checked nothing. Stories now
render inside a JSDOM, DOM output is serialised, and a story that still cannot be rendered is a
**failure**. The per-file tests assert that checks run equals stories discovered × themes, and a
tally test re-checks that across every file, so a story cannot fall out unnoticed.

**Gating one theme.** Light mode had never been checked. Both run now; accents stay out, since
they only repaint tokens and the matrix costs runtime. One JSDOM is created per file and axe is
evaluated into it once, so the second theme costs a rerun rather than a fresh browser.

Two rule families are kept quiet on purpose. Best-practice heuristics like `region` flag story
content sitting outside a landmark inside the Storybook iframe, which is framing rather than a
bug. And `color-contrast` is off because axe cannot resolve `var()` in a headless DOM: it reads
the kit's tokens as no colour at all and would only add flake. Contrast is
[the walk's](#the-contrast-walk) job. The rule set is the one the Storybook panel runs, so the
panel and CI never disagree.

### A number a comment argues for is pinned by a measured test

A comment that explains why a wait is two minutes or a threshold is three is an assertion
with nothing behind it. Pin it by **measuring** rather than by reading the source: the
workflow harness runs the real `run:` bodies on a virtual clock, so a deadline is held by
the seconds a step actually spends and a retry count by how many times a stub is actually
called. Asserting on the YAML would prove nothing, because the strings under suspicion are
exactly the ones a grep would look for.

Where a value cannot be exercised at all, pin it as a **relation** instead of a figure.
`timeout-minutes` is one: the three waits are measured at their worst, the costs no clock
can see are added, and the total is related to the ceiling read out of the YAML — it must
fit in two thirds of it and be at least half of it.

### A prose citation carries an anchor

A `file:line` written in a comment, a test message or story copy is a pointer, and it rots
the way a `kit` entry rots — except that nothing was watching it. It fails **silently and
legibly**: everything parses, the suite passes, and a reader who follows it lands on real
code, just not the code the sentence is about.

That is not a worry, it is a bill this repo has paid. Commit `f222104` deleted 29 lines from
`base.css` and `callout.css` and broke five citations in one stroke. `callout.css:145` became
a blank line while two comments went on discussing a specificity override; `base.css:130` ran
off the end of a 124-line file. Nothing turned red for five commits.

So write the line, then write what is **on** it:

```
src/styles/callout.css:137 `.ui-toast--solid .ui-toast__action`
src/styles/nav.css:39-41 `font-size: 14.5px;`
```

`scripts/code-refs.test.js` resolves every one of them — the file exists, the line exists,
and the anchor appears on it. A range passes when the anchor is on any line inside it.
File-and-line-exists would not do: **every one of the five wrong lines was a real line**, so
only the anchor tells a moved rule from a rule that is still there.

Four things the form asks of you, and the reason for each:

- **Cite from the repo root.** A bare `nav.css:113` leaves the gate guessing a directory, and
  it will not guess. Unanchored, a bare filename is not read as a citation at all — it is
  indistinguishable from a fixture or a stack frame — so that one is a hole rather than a
  gate, and it is named in the gate's ledger.
- **Put the anchor after the citation**, within one line-wrap. Two lines away, the next
  backticked span belongs to somebody else's sentence.
- **A guideline `kit` entry keeps its own form** — `{ ref, pattern }`, resolved by
  `stories/guidelines/refs.test.js`. `code-refs.test.js` stands off those and asserts its
  count against what the pages declare, so a `ref:` written where that walk cannot see it
  makes the two disagree rather than falling between them.
- **Story copy a reader sees anchors with a second code span**, not a backtick that would
  land on the page: `${code('src/styles/nav.css:81')} ${code('.ui-nav__item.is-danger:hover')}`.

Two forms are exempt by construction, never by a list. A `<sha>:` prefix makes the citation
historical — a claim about a tree that is not this one. And a path whose first segment is not
tracked at the repo root points into a dependency, whose line numbers move on an upgrade this
repo does not pin here.

### A rule is proven by the mutation that kills its case

A passing test proves the case runs, not that the rule has teeth. After the cases pass,
weaken the rule one axis at a time and re-run every case against each weakened copy: a rule
that means something loses a case, and a rule that has stopped meaning anything loses
nothing.

`scripts/gitleaks-rules.check.mjs` does this to every rule in `.gitleaks.toml` across eight
axes. The lesson that shaped it is worth carrying to the next gate — **a check can be
switched off from either side.** For a while it watched only the rules, so two lines added
to `[allowlist] regexes` took a scan carrying both shapes from "leaks found: 2" to "no
leaks found" while the check reported that every rule had a case that dies under a
mutation. Every entry in both lists is a subject in its own right now.

When you mutate to prove a pin, put the edit on disk, diff to confirm it landed, watch the
test fail, and revert. A mutation that never reached the mechanism proves nothing, and a
green run is not evidence that it did.

### An exception is a note at the site, read by the gate

Most rules here are absolute, and the ones that are not have a problem: the exceptions cannot
be listed in the gate without becoming the enumeration the first rule forbids. A list of
"selectors allowed to keep a literal" is a list of selectors.

So the exception is written where the exception is, in a shape the gate parses.
`stories/motion-tokens.test.js` forbids a hand-written duration anywhere in the kit's CSS
except in an `animation` that says which of two kinds it is and why —
`/* motion: ambient — a spinner turns until the request answers */`. The gate knows the two
kind names and demands a reason after them; it knows nothing about which sheets or selectors
have one. Add an ambient loop tomorrow and the gate has an opinion about it without being
edited.

Two things make this an exception rather than a hole. The kinds are **closed** — the gate
accepts `ambient` and `choreographed`, so a third would need arguing for in
[docs/specification.md](docs/specification.md) rather than typed at a use site. And the note
sits **on the declaration**, so it is read by whoever is about to change the number, which a
list in a test file never is.

### A subject a gate cannot check is a failure, never a skip

A gate that walks a set has to say what happened to every member of it. The temptation, every
time, is to `continue` past the one that will not cooperate — and in the output a `continue`
is indistinguishable from a pass.

`stories/a11y.test.js` did exactly that. A story that threw (anything calling
`document.createElement` blew up in bare Node) or returned a DOM node instead of a string was
skipped in silence: five stories, the whole Feedback file among them, were "covered" by a test
that checked nothing. Stories now render inside a jsdom, DOM output is serialised, and a story
that still cannot be rendered fails. `stories/lib/contrast.js` walks the same catalogue under
the same rule, and `walkStories()` returns an unrenderable story as a problem.

Refusing to skip is only half of it, because a subject that never reaches the walk is not
skipped — it is absent, and absence has no line in the output at all. So the count is asserted
beside it: each per-file test checks that checks-run equals stories-discovered × themes, and a
tally test at the end re-checks that across every file. A story cannot fall out of the set
unnoticed.

### A gate carries a ledger of what it does not reach

A green run is a claim, and the claim is only as wide as the walk behind it. So each gate ends
its header with a ledger of its own holes. `stories/contrast.test.js`, `react/src/contrast.test.tsx`,
`stories/guidelines/accessibility-floor.test.js`, `stories/accent-swatch.test.js` and
`stories/glyph-stroke.test.js` each carry one, and that ledger stays at the gate rather than
moving into this file: the person it has to reach is whoever is about to trust the green, and
they are reading the test, not this.

What moves here is the argument under a hole, when the hole is not particular to one gate. No
width for anything a line of text sizes is jsdom having no layout, described once in
[Where jsdom stops being a browser](#where-jsdom-stops-being-a-browser) and named at the gate in
a line. A hole that is a **decision** — the accessibility floor reads WCAG 2.5.8 without its
spacing exception, so 24×24 is absolute — belongs to the issue that decided it. What is left at
the gate is one line per hole, saying what is not measured and what a reader should not conclude
from the pass.

A ledger is maintained. A hole that has been closed comes out of it, and a gate that narrows
gains a line — an entry describing a limit that no longer exists sends the next reader to fix
something that is fine.

### What the signal-colour gate models, and the edits it exists to refuse

`stories/signal-contrast.test.js` holds the guarantee in
[specification.md](docs/specification.md#colour-and-contrast) that a signal colour's ink clears
AA on the surface it actually sits on. The trap it was built after is that most of those rules
do not sit on `--bg` at all: they paint the signal onto its own translucent glow, and a hue
picked to read on the dark canvas is nowhere near dark enough once that wash lands on white.

The two fixes it gates are deliberately different shapes, and the difference is the lesson.
For **success**, the deepened chip pair already existed and already cleared AA, so every
green-on-glow-green rule is simply repointed at `--chip-success-ink` / `--chip-success-fill` and
no token value moves. For **danger** the failing consumers are not chips at all — a nav row on
hover, a form error — and they cannot borrow `--chip-danger-ink` without giving a chip token a
second job its own comment disclaims. So `--pink` itself moved: darker in light
(`#d63c72` → `#b63361`), lighter in dark (`#e35b8f` → `#e97ca5`). Reach for the token only when
the consumers are not the family the existing pair was named for.

Three modelling choices, all deliberate:

- **Each rule names the surface it lands on**, because they differ — a nav badge sits on `--bg`,
  a dropdown badge sits inside a `--surface-2` menu, and a danger menu row is read while its row
  is hovered to `--surface`. Where a rule declares its own background, that background is
  composited over the named surface first.
- **Compositing rounds to 8 bits**, because that is closer to a framebuffer than full precision
  is — not because it is what the browser paints. The two models disagree by at most a few
  hundredths, and a value that close to the bar is chosen to clear under either.
- **One theme axis is enough.** Accents redefine only the purple family, so the signal ratios are
  the same under Phoenix, Ocean and Emerald as under the default.

**A glow is its own colour at low alpha, and nothing more.** That is not decoration: the same hue
is spent at low alpha in places that do *not* read `--glow-*`, so a glow that drifts off its
token puts two different washes of one colour side by side in the same app. `--pink` is the
worked example — spent at 10% both as `--glow-pink` and as the `color-mix` in
`.ui-btn--danger:hover` — and `--green` the same, as the `color-mix` in the `.ui-dot.is-live`
pulse. Every glow is gated in **both** themes: it is the same invariant, it already holds for all
four, and a gate watching only light would let the next hand-authored dark value through
unchallenged. Nothing about a wash makes drift acceptable in one theme and not the other.

**`--glow-purple` is the exception, and it is gated separately.** The other three tint a token
that means one thing in both themes; this one tints the accent family, where the theme changes
*which member* is the display hue. In dark, `--accent` is the display hue and `--glow-purple`
tints it. In light, `--accent` is a text ink and `--purple-light` is the display hue, so
`--glow-purple` tints `--purple-light`.

Light's `--accent` is deepened on purpose: [#96][i96] (shipped in [#101][i101]) found the light
Phoenix and Emerald accents failing AA as text on white — Phoenix `#d64a12` at 4.33:1, Emerald
`#0b9c68` at 3.52:1 — and deepened **only** `--accent`, to `#a8370c` (6.53:1) and `#087a52`
(5.36:1). Before that commit those two cells held `--accent` and `--purple-light` at the same
value, so every light cell agreed with either reading and the split did not exist to be seen.

Be straight about the provenance: no comment in either token file says the washes were
deliberately left behind. #101 scoped itself to the AA failure and moved nothing else, so the
light rule is what that narrow commit *left*, and the gate is the first place it is written down.
It is still the right rule — a 10% wash is not text and gains nothing from AA, and dragging it
down with the ink would darken every accented surface in the light app to fix a problem those
surfaces do not have. `--ring` was left the same way and agrees, cell for cell.

So do **not** "fix" the light glows onto `--accent` to make the two themes agree. That uniformity
would undo #96's reasoning and mud every light wash. Stopping that edit is what the gate is for,
and that edit is the mutation it was written against.

[i96]: https://github.com/apliteni/apliteni-ui/issues/96
[i101]: https://github.com/apliteni/apliteni-ui/issues/101

### One gate per workspace, over one shared implementation

Each workspace gets its own gate, because a shared count cancels: a React rule dropping out
of coverage and a site rule arriving in the same commit leave the number where it was and
the tripwire says nothing. The two also fail for different people, and a broken React sweep
should say so in its own red.

Underneath, one implementation. The icon gates all import `scripts/lib/icon-cascade.js`
rather than copying it, so three gates asking one question cannot drift into asking three.

Sometimes the walk cannot be shared even when the arithmetic can. `stories/lib/contrast.js`'s
`walkStories` discovers `stories/**.stories.js`, calls each story's render fn as a plain function
and assigns the result to `innerHTML` — none of which a React story survives. Its render fn calls
hooks, so it has to be mounted rather than called, and `serialize()` returns null for the
ReactElement it hands back. So `react/src/contrast.test.tsx` imports the resolver's pure half
(`tokensFor`, `substitute`, `desugar`, `parseColour`, `composite`, `ratio`, `effectiveBackground`,
`hasOwnText`, `selectorPath`, `groupFindings`, `kitCssFor`) and re-expresses only the walk, through
vitest and `@testing-library/react`. `react/src/a11y.test.tsx` made the same trade for axe. The
split to hold is arithmetic shared, mounting per workspace — a second copy of the compositing
maths is the drift this rule is against, and a second walk is not.

Read source, not built output. `react/dist` is gitignored and built by `prepare`, and
`release.yml` installs with `--ignore-scripts`, so a gate reading `dist` measures something
CI does not have — the local-green/CI-red defect this area keeps producing.

## Where jsdom stops being a browser

The icon gates mount real elements against the kit's real CSS and ask jsdom what size came
out, over one shared implementation in `scripts/lib/icon-cascade.js`. jsdom is close enough
to a browser that the gaps are the whole difficulty, and each one below is a shape where a
gate measured something a browser does not render. None of them was reasoned out in advance;
every one shipped first and is written down here so the next gate does not rediscover it.

### A spelling the sweep cannot see costs coverage in silence

The set of classes the kit puts on an `<svg>` is read out of markup, and `mount()` asks that
set whether to build an `<svg>` or a `<div>`. Read it wrong in either direction and the gate
still passes.

HTML folds case and a browser is what decides that: `<SVG CLASS="ic">` parses to an element
whose `localName` is `svg`, in the SVG namespace, matched by `.ic` and sized by every rule
targeting it — jsdom included. A sweep that misses that spelling drops every rule naming the
class out of measurement with no count moving to say so, which is how `.ui-fbck` went
unmeasured the first time. The `ic` tripwire in `scripts/icon-size-surfaces.test.js` does not
catch it coming back: that guards one class that already exists, and a class introduced in
capitals never joins the set for it to miss.

JSX folds no case, because `className` is a prop rather than an attribute. `CLASSNAME` is a
different prop, which React hands to the DOM as an attribute named `classname` and not as a
class at all, and `<SVG …>` is a component reference rather than the intrinsic element.
Reading either would put a class in the set that no `<svg>` carries, and a rule naming it
would be mounted as an icon and measured against the reset.

Neither flag may reach the captured text. A class name is case-**sensitive** — `.Ic` and
`.ic` are two classes — and consumers compare the set exactly, so the class has to come back
spelled the way the markup spells it.

The same split runs through pseudo-class names, where CSS folds case as HTML does.
`:WHERE(svg)` selects what `:where(svg)` selects, so a rule written that way decides an
icon's size; a scan matching lower case only collected no alternatives out of it and let the
rule leave the subject count without moving it. jsdom is worse than blind there:
`querySelectorAll` throws `Unknown pseudo-class :WHERE()`, while `matches()` and the style
resolution answer **true** for every element. So `.ui-btn :WHERE(svg)` sizes every icon in
the document the gate builds, the bare one the reset owns included, and the assertions that
fail are the ones about the reset — in files that are fine, while the rule that did it is
named nowhere. Recognised as a subject, the shape is refused by name and the reader is sent
to the rule.

A tag name folds with the rest of the HTML, and the `<style>` sweep has to fold with it. The
surfaces gate reads the story files, and a story is a `.js` module returning HTML out of a
template literal, so `<STYLE>` in one is the element every browser and jsdom parses — its CSS
applies in every iframe that renders the shell. Missed, it is silent at both ends: a story that
spells it that way from the day it is added contributes no block, no subject and no count, and
the sweep reads 14 with the rule measured and 14 without it. Proved by writing one in:
`<style>` reds with `collected 15, expected 14`, and `<STYLE>` leaves all 22 assertions green
over a rule that sizes an icon to 33px.

The fold stops at the JavaScript. `import './x.css'` is a JS keyword and a bundler's loader
match, neither of which folds case: `IMPORT './x.css'` is a syntax error, and `import './x.CSS'`
fails the tsup build outright with *No loader is configured for '.CSS' files*. Reading either as
a stylesheet would hand the React gate a sheet no build produces and send the reader to rename
something the bundler never saw. `dangerouslySetInnerHTML` and `__html` stay case-sensitive for
the same reason — React props rather than HTML attributes — while the tag in front of them folds.
`icon()` is the same case: a JavaScript identifier, so `ICON('check', 'ui-fbck')` calls a
function this kit does not export, nothing renders, and reading it would hand a gate a rule to
mount against markup that does not exist. So is the `.test.js` skip in `svgClassSet()` — `node
--test` matches its glob as written, so `Widget.Test.js` is ordinary source, and folding the skip
would drop it from the sweep in the silent direction.

A CSS **property** name folds, and the value read back for it does not. `WIDTH: 40px` sizes an
element in every browser and cssstyle stores it lower-cased, so `declRe()` carries `i` — a scan
matching lower case only read a file the CSSOM did not have, and the guards that exist to catch
those two disagreeing were the ones it blinded. The anchor survives the flag: `MAX-WIDTH` still
cannot read as `width`. A vendor prefix is part of the name, which is why the raw-text scan for
`-webkit-writing-mode` folds too — `-WEBKIT-WRITING-MODE` turns the axes in exactly the browsers
the lower-case spelling does, and jsdom parses both away before the CSSOM loop can see either.
The name comes back spelled as the file spells it, which is right for a report and wrong for
anything else: `getPropertyValue()` is case-sensitive even though `setProperty()` is not, so
`MAX-WIDTH` asked as written reads back empty and looks like a value jsdom threw away.

`@import` splits the same way inside one pattern. The keyword is an at-rule keyword and folds, so
a sheet listed as `@IMPORT` is a sheet `index.css` really pulls in; missed, it never joins the
document any gate builds, and the surfaces and React gates then measure every rule they sweep
against a cascade the kit does not have with no count of theirs moving to say so. The specifier
is a path that goes straight to `readFileSync` and is case-sensitive on Linux however the keyword
in front of it reads, so it must come back exactly as written — the flag folds case in the
pattern, not in the text. `scripts/stylesheet-manifest.test.js` derives the same list without the
flag, so an `@IMPORT` is a sheet `kitSheetNames()` finds and that guard does not: it reds there,
saying the sheet is missing from `index.css` when what is missing is the lower-case spelling.
Loud and pointing one file off, which is the direction to leave it in.

Only the **top level** of a compound is harvested for what the subject may be. `:has()` and
`:not()` are excluded: the first is about a different element and the second says what the
subject is not. An `:is()` nested inside either belongs to that pseudo's argument, not to the
subject — `.a:not(:is(svg))` selects everything that is *not* an svg, and harvesting the
`:is()` out of it made that an icon rule, which the gate then tried to mount and hard-errored
on the `:`. A red on correct CSS, out of the one exclusion the function is built around.

Every raw-text scan in `icon-cascade.js` has to answer the same question, and the two languages
answer it differently. CSS folds case on keywords and property names; JavaScript folds none.
Getting it backwards is silent in one direction and noisy in the other, so the decision is
written down per scan rather than re-derived:

| the scan | reads | because |
| --- | --- | --- |
| property names (`declRe`) | **any case** | `WIDTH: 40px` sizes an element and `cssstyle` stores it lower-cased, so a lower-case-only scan read a file the CSSOM did not have |
| `@import` keyword | **any case** | `@IMPORT "./zz.css"` parses into a real `CSSImportRule`, so the sheet ships and no gate opens it |
| `@import` specifier | **as written** | it goes straight to `readFileSync`, and a file name is case-sensitive on Linux however the keyword reads |
| pseudo-class names | **any case** | `:WHERE(svg)` selects what `:where(svg)` selects |
| class names | **as written** | `.Ic` and `.ic` are two classes, and every consumer compares the set exactly |
| JS `import` and its extension | **as written** | `IMPORT './x.css'` is a syntax error, and esbuild fails the build outright on `.CSS` — both are loud at build time |
| `icon()` calls | **as written** | `icon` is a JavaScript identifier; `ICON(…)` calls nothing this kit exports |
| the `*.test.*` skip | **as written** | `node --test` matches its glob as written, so `Widget.Test.js` is ordinary source and folding the skip would drop it from the sweep |

In every case the flag folds case **in the pattern, not in the text**, so a name comes back
spelled the way the file spells it. A caller that keys on a property name, or hands one to
`cssstyle`, has to lower-case it first: `getPropertyValue()` is case-sensitive even though
`setProperty()` is not, so `MAX-WIDTH` asked as written reads back empty and looks like a value
jsdom threw away.

One of these has a loud twin worth knowing about. `scripts/stylesheet-manifest.test.js` derives
the kit's sheet list with the same pattern **minus** the case flag, so an `@IMPORT` in
`index.css` is a sheet the gate finds and the manifest guard does not — it reds there, saying
the sheet is missing from `index.css` when what is missing is the lower-case spelling. Loud, and
pointing one file off, which is the direction to leave it in.

**Strings are blanked before every raw-text scan, and offsets are preserved.** A string is
content rather than CSS: the data URI in `src/styles/input.css` holds
`style='height:12px;width:12px'` and a `content` can hold `{ width: 5px`, and read as
declarations both make a gate refuse a file a browser is perfectly happy with — and a gate that
reds on correct code gets switched off. Blanking replaces the *contents* and leaves the quotes
and every offset where they were, which is what lets a scan match against the blanked text and
read the answer out of the original. `importsIn()` needs exactly that, since the specifier of a
real `@import` is itself a string.

Comments come out first, everywhere. A commented-out `width: 20px` is not a declaration, and the
patterns anchor on `;` or `{`, so a comment sitting between `{` and the first declaration hides
that declaration from every one of them. That leaves one shape unhandled: a comment opener
written **inside** a string, which `stripComments()` cuts from, taking real CSS with it.

### The CSSOM stops describing a block that repeats a property

`cssstyle` keeps a repeated property once, in its **first** position carrying its **last**
value and its **last** importance. Every gate here reads that bookkeeping and it is right
whenever it still describes the file. It stops in two ways, and they are not the same
failure.

**The winner.** A browser takes the important declaration wherever it sits, and only then the
last one, so the winner of `.ui-btn svg { width: 40px !important; width: 16px }` is 40px. The
CSSOM holds 16px, not important, because that is the last declaration — the gate mounts an
element, reads 16px back, agrees with itself and reports the rule as measured while the
browser renders something else. That is the whole of [#148][i148] rebuilt inside the fix for
it: a rule deciding an icon's size with the thing meant to notice staying quiet.

The line is exactly this: a repeat is misread when **some** declaration of the property is
important and the **last** one is not. Nothing else about the repeat matters.

| the block | why |
| --- | --- |
| `width: 100%; width: fit-content` | no importance anywhere, last wins in both — the fallback idiom, read correctly, must stay green |
| `width: 10px; width: 12px !important` | importance arrives and stays; the last declaration **is** the winner |
| `width: 10px !important; width: 12px` | importance drops; a browser takes 10px and the CSSOM says 12px — refused |
| `10px !imp; 12px; 14px` | the winner is 10px, the CSSOM says 14px — refused |
| `10px; 12px !imp; 14px` | the winner is 12px, the CSSOM says 14px — refused |
| `10px; 12px !imp; 14px !imp` | the winner is the last one — read right |

`height` and both logical spellings are asked too, since `cssstyle` deduplicates all four the
same way. Value equality is no way out: `width: 16px !important; width: 16px` computes the
same number and still loses the importance, which is the one thing that decides a contest
against an `!important` reset.

How the file **spells** the property is a separate question this scan used to get wrong.
`WIDTH` and `width` are one property to CSS and one entry in the CSSOM, so a capital walked
past a lower-case-only check and handed every gate the losing declaration — #148 again,
arriving through the spelling. The name is now read the way CSS reads it and keyed
lower-cased. Two spellings stay outside what it can see, and nothing in this repo writes
either: an **escaped** name, `wid\74 h`, is `width` to a browser and nothing at all to jsdom,
which throws the declaration away before the CSSOM has it, so there is no repeat left to
refuse; a name led by a no-break space or a BOM goes the other way, dropped by browser and
jsdom alike but counted here regardless, because `\s` in a JavaScript regex covers characters
CSS whitespace does not. The first under-reads and the second would refuse a block that is
fine.

**The order**, which is about the logical fold. In `.a { width: 10px; inline-size: 33px;
width: 12px }` the property sits on both sides of its twin, so keeping it in its first
position moves it in front of a declaration the file puts it behind: a browser renders 12px
and the fold gives 33. Every other arrangement survives — with the repeats on one side of the
twin, whichever side, the deduplicated order is still the file's.

Both are wrong numbers rather than errors, which every gate reports as a pass, and nothing in
the CSSOM recovers the truth: `rule.cssText` is serialised from the same deduplicated block.
So the gate refuses rather than guessing, and it refuses without asking whether the rule sizes
an icon at all. Telling the two apart would mean handing the check the icon classes, which
two of the three gates derive only after they have folded — and neither shape is CSS anybody
writes on purpose, since a declaration a browser can never take is dead either way.

### The reset is found by what only the reset does

The reset and the rules measured against it can share a file, so provenance cannot tell them
apart. A gate that excluded `base.css` wholesale swallowed any component rule written there,
and `.ui-nav__ic svg { width: 40px }` in that file was measured by nothing.

So the reset is identified positively, by the one thing only it does: it sizes an icon with no
class on it, no attribute and nothing around it. Every component rule in the kit names a
class, on the icon or on an ancestor, so a bare `<svg>` matches none of them — the same icon
the bare-icon test measures, which is what makes this a definition rather than a heuristic
about shape.

Shape must not decide it. jsdom serialises `.x { svg { … } }` as `& svg`, so "the rule with no
class in it" reads a nested component rule as the reset and drops it in silence. Nothing here
reads a selector's parts: a nested rule is refused by name first, and the question is asked of
an element. It is asked per selector, since one block's selector list can hold the reset and a
component rule, and only of rules that **size** an icon — `*` matches a bare svg and decides
nothing about it.

Exactly one, and the count is the point. A second rule sizing a bare icon is either a reset
written twice or a rule like `svg:not([width])` at (0,1,1), which out-ranks every `.ui-btn
svg` in the kit from the one file whose rules are not subjects — #148 arriving again with
every gate green. Two rules sharing one selector are one reset, since that is one rule split
across two blocks.

### The reset is a floor, and its specificity is the whole of that

The icon reset is written `svg:where(:not([width]):not([height]))`, and the `:where()` is not
decoration: it holds the whole filter at zero specificity, so the rule weighs (0,0,1) — one
element, nothing more — and any component rule that sizes an icon out-ranks it. Written bare,
`:not([width]):not([height])` counts both attribute selectors and weighs (0,2,1), which beats
every `.ui-btn svg`-shaped rule in the kit whatever order the files load in. It did, for all of
them bar three, and for `.ui-fbck` besides — a class on the svg itself, so easy to miss when you
go looking.

Two gates keep the rules competing with it honest, each over the ground it actually sweeps:
`src/styles/icon-size.test.js` reads the stylesheets `src/index.css` imports, and
`scripts/icon-size-surfaces.test.js` reads the surfaces the kit renders. Neither claims more.
Two gaps are worth knowing: a reset scoped to an ancestor that a subject's own selector does not
name is out of reach of both, and `.storybook/preview.js` imports `src/index.css` into every
story iframe, which makes `.storybook/` a third rendering surface neither gate sweeps. Nothing
in there sizes an icon today.

### A declaration jsdom drops leaves no subject to count

jsdom keeps the declarations it understands and discards the rest without a word, so
`.zz svg { width: fit-content(20%) }` reaches the CSSOM as a rule that sizes nothing. It
contributes no subject, a count only moves when a subject appears or disappears, and so a rule
added and dropped in the same breath leaves the number exactly where it was while the rule
applies in a browser with nothing watching it. All three gates ask about it.

The question goes to the raw text, since the CSSOM is precisely where the answer is missing,
and each declaration is re-parsed on its own rather than looked for by value: `fit-content(20%)`
and `anchor-size(width)` are what jsdom drops today, and a list of values here would be out of
date by the release after this one.

It is asked **of the rules that decide an icon**, not of every rule in the sheet. What jsdom
drops has nothing to do with icons — `width: env(safe-area-inset-left)` on a drawer,
`height: CALC(1px + 2px)` on a toast — and refusing those is a red on CSS somebody is going to
write and be right to write. Over two small React files, asking everything cost nothing; over
`src/styles` it is a wide net across CSS with no icon near it. The dropped declaration is gone
from the CSSOM, so the selector comes out of the raw text instead.

A conditional group is **descended into** rather than read flat, because that argument holds at
every depth and the code used to make it only at brace depth 0. `@media` is a wrapper: the
declarations under it belong to the rules further in, each with an element selector of its own
to be scoped by — bar a keyframe, whose `from` and `50%` name no element and so scope to
nothing, which is right, since no icon's cascade runs through a keyframe. Read flat, the
block's selector was the at-rule, no selector starting with `@` is an icon, and every
declaration inside got asked about — which refused `width: env(safe-area-inset-left)` on a
drawer inside a media query while allowing the same declaration one brace out.

Three shapes are asked anyway, because scoping them is what would make them silent: an at-rule
holding declarations rather than rules, where there is nothing further in to descend to and the
prelude is not a selector; a rule with a rule nested inside it, where the inner selector is
relative to the outer one and says nothing alone; and a selector computed at render time, where
"not an icon" is a guess rather than an answer. Each is reported with the ground it sits on
named, which is coarser than a rule and still sends the reader to the right place.

A logical declaration is asked under its **physical** name, which is not the name the file
spells. `cssstyle` waves `inline-size` through whatever the value, so asked as written it
always survives — and then the fold rewrites it onto `width`, which refuses the value, and the
rule ends up empty anyway. The cascade every gate measures is the physical one, so that is the
cascade the declaration has to reach. It is *reported* as written, since that is the
declaration the reader has to go and find.

The other half of the same hole is a stylesheet a gate cannot see the whole of: an
interpolation standing where a rule or a declaration would be — `<style>${SHELL_CSS}</style>`,
a `${SHARED}` after the last rule in a block, `.a { ${DECLS} }`. Each can hold a rule that
sizes an icon and each is invisible to a scan keyed on punctuation, since the value and
property scans need a `:` beside the marker and the selector scan needs a `{` after it. So it
is asked by **position**. The older question — is the marker here and did the sheet parse to no
rules — is answered "no" by any one parseable rule written beside the shell, which is the
shared-shell refactor itself: one ordinary rule next to `${SHELL_CSS}` and the block reads as
fully measured. A marker inside a declaration's *value* is left alone whatever the property,
because a surface interpolates a colour or an image far more often than a size and refusing
`background: ${theme.bg}` is a red on correct code.

### Resolving the cascade rather than reading the stylesheet

`stories/nav-cascade.test.js`, `stories/contrast.test.js` and the resolver the second is built
on, `stories/lib/contrast.js`, all answer a question a grep over the stylesheet cannot. Every
defect the nav gate was built after was a rule that looked right in the file and never applied:
the nested indent lost to the `.ui-nav ul` reset, the active child's marker was offset against
that missing indent and painted outside the nav box, and the active nested row's focus ring was
cancelled by a later rule of equal specificity. All three declarations were present. All three
were dead. Grepping for them passes on every one.

So the shape is: load the stylesheets the surface actually ships with, substitute their `var()`
references from the token files for the theme under test, mount real factory markup in jsdom,
and read `getComputedStyle` back. jsdom applies author rules by specificity and source order, so
a declaration that loses to another author rule resolves to the winner's value there exactly as
it does in a browser.

**Author rules are the whole of that guarantee.** jsdom does not rank by origin, so a bare type
selector loses to the user-agent sheet it would beat in a browser — `a { color }` on a linked
`<a>` reads back as the UA's `rgb(0, 0, 238)`. Every selector `nav-cascade` asserts on carries a
class, and a class outranks the UA sheet correctly. The contrast resolver cannot impose that
restriction, because it walks whatever the stories happen to render, so it rewrites the bare `a`
rule into `:link` / `:visited` forms instead.

**What jsdom will not match is rewritten, and every rewrite preserves specificity** — otherwise
the cascade under test is no longer the shipped one.

- `:hover` / `:focus-visible` never match. Each becomes an attribute selector, also (0,1,0),
  that the test sets on the element it is exercising.
- `::before` is not computed. Each `X::before` rule becomes `X > [data-pseudo="before"]` with a
  stand-in child injected. Every `::before` rule gains the same (0,1,0), so their order among
  themselves is untouched.
- A custom property re-declared per component variant (`--toast-accent`, once per toast status)
  cannot be flattened first-wins, or every toast reports the first status's colour. One
  variant-scoped copy of each consuming declaration is emitted instead.

That last one has a limitation worth carrying rather than hiding. A specialised copy holds one
more class of specificity than the rule it came from, so it can out-rank a rule the browser
would let win. Each copy is therefore emitted immediately after its source rule rather than at
the end of the sheet, which keeps source order intact against a later override of equal weight.
That is correct exactly when a base rule precedes the variants overriding it — `.ui-btn` before
`.ui-btn--sm`, `.ui-toast__action` before `.ui-toast--solid .ui-toast__action` — which is the
kit's convention throughout. The gate pins the toast case with a self-check, so a regression in
that convention is visible rather than silent.

**Layout is not modelled, because jsdom has none.** The nav marker's position is derived
arithmetically from resolved values, and the derivation is validated against the running
Storybook: the unrepaired rail measured `markerX = navLeft − 11px` there, and the arithmetic
gave −11 for the same CSS.

The division of labour between the resolver and its callers is deliberate. `stories/lib/contrast.js`
is everything mechanical — parse a colour, composite an alpha chain, compute a WCAG ratio — and
it decides nothing. Which failures are acceptable is written by hand, in the gate.

### An unresolved `var()` measures nothing and reports green

jsdom does not resolve `var()` into a longhand. `color: var(--muted)` reads back as the literal
string `var(--muted)`, `parseColour` returns null, and the element leaves the walk unmeasured
while the run stays green. Every colour and every size in this kit is a `var()`, so this decides
how a stylesheet reaches a test DOM, and the two gates that face it answer in opposite
directions — deliberately.

**Substitute, where one value per theme is the right answer.** The contrast walks read the sheets
off disk and substitute the token file for the theme under test into them before mounting.
`react/src/contrast.test.tsx` does this rather than turning on Vitest's `css` option, which would
make `import './Modal.css'` land in the test DOM verbatim: every colour in it is a `var()` onto a
vanilla-kit token, so the gate would measure nothing and report green — and turning it on now
would only add a second, unresolvable copy of each sheet to the same document. Discovery is still
Vite's there: `import.meta.glob('./**/*.css')` is evaluated for its **keys** only, nothing eager
and nothing imported, so a new component stylesheet is in the gate the moment it exists.

**Probe, where the answer has to differ per element.** Substitution flattens: it gives one value
for the whole document, which is right for a token and wrong for a geometry that the cascade
decides per element. `.ui-btn--sm` has to read its own 6px rather than the base 9px. jsdom does
two things correctly — it cascades custom properties per element and it inherits them — so
`stories/guidelines/accessibility-floor.test.js` mounts the sheet **unsubstituted** and copies
every geometry declaration into a probe custom property beside itself: `padding: var(--btn-pad-y) …`
also emits `--tsz-padding: var(--btn-pad-y) …`. Reading the probe back gives the declaration that
won for that element, vars and all, and each var is then resolved from the same element. Nothing
is rewritten or removed and the copy is appended to its own block, so the sheet still says what it
said.

A `sel::before { … }` rule gets a second copy onto `sel` itself, under `--tsz-before-*`. jsdom
computes no style for a pseudo-element, but a custom property set on the element is readable from
the element, and the element is what the pseudo belongs to. Stated exactly: the retargeted rule
carries one point less specificity than the pseudo selector it came from — a pseudo-element weighs
as much as a type selector — so two pseudo rules disagreeing on one element resolve here by source
order where CSS would resolve them by weight. No rule in the kit has that shape, and it is the same
approximation the file makes elsewhere.

### The style cache holds values, and refuses to answer for a stale document

`makeStyleCache()` in `stories/lib/contrast.js` memoises `getComputedStyle` for one window,
between DOM writes. The walk asks for a computed style far more often than there are elements:
every text-owning element is walked up its ancestor chain three separate times — once for the
background composite, once to test whether an ancestor hides it, once to accumulate ancestor
opacity — and siblings share almost all of that chain. Measured over both themes before the
cache existed: **137,206** `getComputedStyle` calls, of which the background walk was only
24,840. The hidden test (57,630) and the opacity accumulation (47,894) were larger, and both
run to the root with no early exit. That is expensive in jsdom twice over — a miss resolves the
whole cascade, and a hit still deep-copies the cached declaration property by property.

**It memoises the lookup and nothing else.** Not `effectiveBackground`'s composite, which is
the tempting version and the one that can go quietly wrong: a composite cached against an
element would have to argue that source-over stays associative down a chain shared by siblings
with different translucent backgrounds of their own. The composite is cheap once the lookups
are free, so it is rebuilt for every element and that argument never has to be made.

**It stores values, not declarations, and that is not a detail.** jsdom resolves `color-mix()`
lazily — on the first read of the property — and what it resolves to depends on what else has
been looked up by then. Hold a declaration, look at anything else, then read `.color`, and back
comes the raw `color-mix(in srgb, …)` instead of the `color(srgb …)` the same declaration would
have given a moment earlier. `parseColour` cannot read the raw form, so the element leaves the
walk without a word: not a failure, not an unjudgeable, just gone. Caching the declaration
object did precisely that to the twelve solid toasts' text — every reported finding stayed
identical while the gate quietly stopped looking at twelve pairs. So the cache reads the
properties it needs at the moment it stores them, freezes them, and serves those. Reading one
it does not hold throws rather than answering `undefined`, because `undefined` here means
"skipped in silence" — [the same failure](#a-subject-a-gate-cannot-check-is-a-failure-never-a-skip)
wearing a different hat.

**It cannot serve a colour from the wrong render**, for three reasons together. The memo is a
`WeakMap` keyed on the element *object*, and an element belongs to exactly one document, so no
entry of one render is reachable from another. There is no cache at module scope: `walkStories`
builds one per call and drops it on return, so one theme pass cannot seed the next. And within
a single document every DOM write in the walk goes through `mutate`, which drops the memo whole
— including when the write throws. That last one is the one that matters, because the walk
toggles `data-ui-state` to exercise `:hover` and a surviving memo would report the at-rest
colour for the hovered pass. It is also exactly as conservative as jsdom itself: an attribute
change on an attached element runs `_attrModified` → `_modified` → `_clearStyleCache`, which
throws away jsdom's own cache for the whole document. This memo is invalidated wherever jsdom's
is. Between writes, `getComputedStyle` is a pure function of the element, which is what makes
the memo sound at all.

**That third reason is checked rather than promised.** Routing every write through `mutate` used
to be a convention held by three call sites and a comment, and a fourth site added with a bare
`setAttribute` would leave the memo describing the document as it was one render ago — the gate
reporting a colour nobody painted, confidently, with no test failing. So the cache no longer
trusts its caller. It attaches a `MutationObserver` to the document and drains the record queue
on every read: `MutationObserver` queues synchronously and `takeRecords()` drains synchronously,
so "has anything changed since I last looked?" is a question that can be asked on the hot path
with a standard DOM API and no jsdom internals. A non-empty queue at a read means a write
reached the document without the memo being dropped, and the cache throws instead of answering.
The failure is latched: a cache that has once seen an unrouted write stays dead, so the error
cannot be thrown once and walked past.

Stated exactly, because a guard that overstates itself is worse than none: this enforces *the
cache never answers a question about a document that has moved since it last looked*. It does
not enforce *no write happens outside `mutate`*. A write with no read after it is invisible to
the guard, and harmless, because nothing was served from the memo it invalidated. In exchange it
catches a write from anywhere, including one made by a story's own render code, which is the
part a source scan of the resolver could never reach.

[i148]: https://github.com/apliteni/apliteni-ui/issues/148

## The contrast walk

`stories/contrast.test.js` renders every story in both themes, mounts its real markup in JSDOM
against the kit's real stylesheets with the token files substituted per theme, and measures
every text-owning element against the background chain composited above it. Adding a component
adds its pairs with no human step. Each gate states its own blind spots in its own header, per
the `name-the-gap` rule the Guidelines publish; what follows is the reasoning behind them.

### The cascade JSDOM ranks, and the one boundary it does not

JSDOM applies **author** rules by specificity and source order faithfully, and that is the whole
of the guarantee — it does not rank by origin. There is one known exception, at the user-agent
boundary: the UA sheet's `a:link` out-ranks a same-specificity author `a` rule, so a linked
anchor reads back as the UA's `rgb(0, 0, 238)`. The resolver rewrites the kit's single bare `a`
rule to carry `:link`/`:visited`, and a self-check asserts that colour appears nowhere in the
walk. Do not repeat the unqualified claim that JSDOM's cascade matches a browser's; it holds
among author rules only.

A custom property re-declared per component variant — `--toast-accent`, once per toast status —
would flatten to whichever status came first, repainting every toast one colour. The resolver
emits a variant-scoped copy of each consuming declaration instead, immediately after the rule it
specialises, so a later override of equal weight still wins. That relies on a base rule
preceding its variants, which is the kit's convention throughout, and a five-toast self-check
pins it.

### The React workspace gets its own walk, over the same arithmetic

`walkStories` cannot reach `react/src`: it discovers `stories/**.stories.js`, calls each story's
render fn as a plain function and assigns the result to `innerHTML`. A React story returns a
`ReactElement`, which serialises to `null`, and its render fn calls hooks — so it has to *be* a
component and has to actually mount. `react/src/contrast.test.tsx` therefore borrows the
resolver's **pure** half and re-expresses the walk through vitest and
`@testing-library/react`. The arithmetic is shared; only the mounting differs.
`react/src/a11y.test.tsx` made the same trade for axe, per
[one gate per workspace, over one shared implementation](#one-gate-per-workspace-over-one-shared-implementation).

The stylesheet does **not** come from Vite. Vitest's `css` option would make
`import './Modal.css'` land in the test DOM, but it would land verbatim — and every colour in
that workspace is a `var()` onto a vanilla-kit token, which JSDOM does not resolve. `color:
var(--muted)` reads back as the literal string, `parseColour` returns null, and the gate would
measure nothing while reporting green. So the CSS is read off disk and the theme's token file is
substituted into it first, exactly as the vanilla gate does. Turning `css` on would only add a
second, unresolvable copy of each sheet to the same document.

Discovery is still Vite's: `import.meta.glob('./**/*.css')` is evaluated for its **keys** only —
not eager, nothing is imported — so a new component stylesheet is in the gate the moment it
exists, and the count is asserted.

Two differences from the vanilla walk, both narrowing. There is **no state pass**: nothing under
`react/` declares a colour in a state, and `.rx-sort:focus-visible` sets an outline, which is
non-text contrast the gate does not judge either way — so the pass would cost two more renders
to measure zero new pairs. Add it when a state rule paints text. And **one accent**, like the
vanilla default cell.

### What the walk costs, and why the gate on it is a ratio

The walk is the most expensive thing in `npm test`, it runs on every invocation, and it is the
suite's critical path: `node --test` runs files as parallel child processes and this one
outlasts all the others put together. Measured on a 10-core laptop, the suite runs in ~18s with
it and ~8s without, so the gate still roughly doubles it. Cost grows close to linearly with
theme × accent cells — 16.3s for the default 2 and 63.4s for all 8, so about 8s a cell. The
eight-cell matrix is behind `CONTRAST_ACCENTS=1` and off by default; anyone adding a cell should
know they are buying ~8s of every `npm test`, forever.

It used to be worse. The walk asked JSDOM for a computed style 138,534 times across the two
cells, because every text element was walked up its ancestor chain three separate times —
background, hidden test, opacity — and siblings share almost all of that chain. Memoising the
lookup per element between DOM writes cut that to 28,706 calls and the walk from ~23s to ~16s.
Not the 3× the call count suggests: what remains is dominated by the 5,738 DOM writes the state
passes make, each of which throws away JSDOM's own style cache for the whole document and forces
the next lookups to resolve the cascade from scratch. That is JSDOM's invalidation rule and
nothing here can safely be cleverer than it.

All three numbers are asserted rather than remembered, per
[a number a comment argues for is pinned by a measured test](#a-number-a-comment-argues-for-is-pinned-by-a-measured-test).
The **miss rate** is the deterministic half of the cost gate: a wall-clock ceiling cannot see a
2× regression through machine noise, but the walk asks for a computed style a fixed number of
times for a fixed catalogue, and how many of those reach JSDOM is arithmetic rather than
weather — two identical runs give identical numbers.

It is gated as a **ratio and not as the 28,706**, because the absolute count is a fact about the
catalogue as much as about the cache: it moves every time a story is added, so an exact
assertion would have to be re-pinned by whoever adds one, to a number carrying no judgement. The
miss rate is the quantity the cache actually controls — 1.0 by definition before the cache
existed, 0.2072 now — and adding a story moves numerator and denominator together, which is why
the two themes agree to three decimal places (0.2068 / 0.2077). The absolute figures are logged
rather than asserted, so a human reading a CI log still sees them move.

The ceiling is **0.30**: about 1.45× today's rate and comfortably below the 0.41 a doubling of
lookups would produce, so a single added story cannot trip it and the person adding one is not
taxed. What trips it is the cache being neutered, or a DOM write appearing inside the
per-element loop — either of which turns hits back into misses across the whole walk. It does
not see a new ancestor walk that reads through the cache and hits every time: that raises
`queries`, leaves `lookups` alone, and moves the ratio *down* while making the walk slower. The
miss rate is a gate on the cache, not on the walk's shape. The 5,738 writes are gated too, as
the anti-vacuity counter for the invariant that keeps the cache honest — every DOM write goes
through `mutate`, and the cache refuses to answer if one did not.

### The two cost gates fail for different reasons, so they are kept apart

The **wall-clock ceiling** is 120s. Measured on a 10-core laptop over two default cells:
15.7–16.5s run alone, 16.4–18.3s inside `npm test` where it shares those cores with 21 other
files, and 47.6s with all ten cores deliberately saturated by competing processes. The ceiling
is set off that last number rather than the first — ~2.5× the worst measurement and ~7× the
normal one.

Stated narrowly, because a ceiling that overstates itself is worse than none: it catches a
runaway — a walk that stopped terminating, or a theme × accent cell added to `THEMES`/`ACCENT`
without anyone costing it. It does **not** catch a 2× performance regression, and no wall-clock
number can. Contention alone spans 3× on one machine, so any threshold tight enough to see a
doubling flakes on a busy laptop, and a ceiling that flakes gets deleted by the next person.

The doubling is the miss rate's job. A runaway shows up on the clock and not in the ratio — a
walk that stopped terminating keeps a perfectly good miss rate — and a doubling shows up in the
ratio and not on the clock.

### A ledger that keys on a measurement is written by hand, on purpose

Do not build a script that regenerates the contrast ledger. The mandatory `why` on every entry
is the anti-automation device: a regenerator would have to invent the sentence explaining why a
bucket's four dark accent rows are acceptable debt, and it cannot, so the entries stay attached
to a person who decided.

Contrast this with `stories/danger-colour.test.js`, whose `AT_REST_EXEMPT` keys on a CSS
**selector parsed out of the source** and whose test fails when an exemption stops naming a live
rule. That ledger cannot rot, because a rename breaks it. The contrast ledger keys on a
**measurement**, which changes whenever a token moves — so it needs a human, and the `why` is
where the human is. It is the same reasoning as
[an exception is a note at the site, read by the gate](#an-exception-is-a-note-at-the-site-read-by-the-gate),
arriving at the opposite mechanism because the key is different.

Counts are asserted with `===`, never as a ceiling. A ceiling would let a fix in one row mask a
regression in another inside the same bucket. An exact count costs a one-line edit whenever a
story is added that renders an already-failing component, and that edit is the point: a human
then looks at the new row. A total ceiling over everything means a finding that matches no
bucket has nowhere to hide.

## The two security checks

`scripts/gitleaks-rules.check.mjs` and `scripts/secret-scan-range.check.mjs` are deliberately
**not** named `*.test.js`. `npm test` globs `scripts/**/*.test.js` and runs on machines with
no gitleaks; both need the pinned binary and belong to the security workflow, which downloads
it. Each takes an optional path argument so it can be pointed at an older or deliberately
mutated config to prove it still fails there — which is the only thing that makes a green run
mean anything.

**A rule that has quietly stopped matching looks exactly like a repo with no secrets in it.**
The scan is green either way, so `gitleaks-rules.check` plants a fabricated instance of each
covered shape and asserts the scanner finds it. The rule ID is half the assertion rather than
decoration: several of these shapes would otherwise be picked up by gitleaks' `generic-api-key`,
which needs a credential-ish word next to the value and stands down on its own stopword list,
and being caught by that instead of by the intended rule is the footing
[#179](https://github.com/apliteni/apliteni-ui/issues/179) exists to replace.

Cases alone are not the gate, because a case can quietly stop testing anything — three of them
did, and a throwaway script found all three. So after the cases pass, every rule is weakened
along the axes it actually has (character classes, length floors, word boundaries, id, entropy)
and every case is re-run against the weakened config. The bar is per **subject**: a subject
none of whose mutations kills a case is not proven and fails. An individual mutation that
survives is printed, and one that survives with no written justification fails too — as does a
justification that has stopped being true. The mutation table is derived from the config text,
never listed in the check.

A subject is a rule **or an allowlist entry**, per
[a rule is proven by the mutation that kills its case](#a-rule-is-proven-by-the-mutation-that-kills-its-case).
Every entry in both lists is mutated by being removed and is proven when some case goes red
without it. An entry no case exercises fails exactly like a rule with no case — which is what
an exemption added for a shape nobody tests looks like.

**How much history a scan covers is invisible from its result.** `gitleaks detect --source .`
walks every ref in the clone, so a leak on one unmerged branch turned the check red on every
other open pull request at once
([#186](https://github.com/apliteni/apliteni-ui/issues/186)) — and the opposite mistake, a
range that quietly covers nothing, looks exactly like a clean repository. So
`secret-scan-range.check` lifts the scan step's real `run:` body out of
`.github/workflows/security.yml` and executes it against synthetic repositories where the
right answer is known: a leak on a branch nobody is reviewing, and a leak in the commits under
review.

That the body can be executed at all is a property of how it is written. It reads every value
from the environment — `GITHUB_EVENT_NAME`, `PR_BASE_SHA`, `PR_HEAD_SHA`, `PR_HEAD_REF` — and
never from a `${{ }}` expression. That is a **security** rule first: this repo is public and
takes fork pull requests, and a branch name pasted into a shell script by the expression
evaluator is a command-injection hole. Being testable is the second consequence, and the check
asserts the rule so the two cannot drift apart. Its YAML parser is hand-rolled and throws the
moment the file's shape changes, in the style of `parseSteps()` in
`scripts/tag-on-bump.test.js` — a parser that shrugged and matched nothing would take the
check green over a workflow it never read.

Both share an exit-code contract: **0** every scenario behaved as the workflow claims, **1**
one or more scenarios failed after all of them have run so a run lists every failure rather
than the first, **2** the check could not reach a verdict — the workflow would not parse, the
step is gone, git or gitleaks would not run. "Cannot tell" is not "passed" and is not "failed"
either: a gate that reports a broken harness as a failed assertion sends the reader looking for
a leak that was never claimed.

**Each planted file carries three separate claims**, and the shape of them is the oracle.

`ours` is the **exact** set of this config's rules that may name the file — exact rather than
"at least", because nothing else detects one of our rules eating another's territory. Widening
`clickup-api-token` until it also matched `figd_…` left every case green under the old
"expected ∈ named" oracle, and for a config whose recent history is deliberate loosening of
character classes that is the likeliest failure. A control case is simply `ours: null`, the same
claim rather than a special case.

`upstream` is gitleaks' own rules that must **also** fire, asserted only where upstream
genuinely owns the shape and never as a general requirement: the default ruleset is not ours to
depend on. `generic-api-key` names `deploy-token.md` today and is deliberately ignored, so a
stopword or entropy tweak upstream cannot turn the check red.

`forbidden` is the mirror, and it exists for one job: an `[allowlist]` entry whose only effect
is to silence an **upstream** rule cannot be proven by `ours` at all, because no rule of ours
ever names the shape.

**Two constraints are pinned by measurement rather than by reading the config.** The loaded
1Password rule carries a Shannon floor of 4 on the whole match, which used to arrive unwritten
by sharing an id with upstream's rule. Two shape-perfect payloads hold it: fifteen characters of
the alnum alphabet puts the match at 3.9978 and sixteen puts it at 4.0370, and the seeds were
searched to land the pair 0.04 apart across the step. That narrowness is the point — a floor
pinned by 3.7 and 5.8 would be satisfied anywhere in the gap.

The other cannot be written in `.gitleaks.toml` at all. `useDefault = true` pulls in gitleaks'
default **global** allowlist, whose stopwords are matched case-insensitively as a substring of
the secret; the a–z run is one of them, so a token carrying it is dropped before any rule of
ours reaches a verdict. Measured on gitleaks 8.30.1: a shape-perfect fixture at 37 characters
and entropy 4.9392 is **not** reported, while the same shape with a scrambled 30-character
payload at entropy 4.7026 **is** — so neither length nor entropy silences it. Isolated twice,
with a stand-in rule whose id does not collide with upstream's: `useDefault = false` catches it
and `true` does not, so it is the global allowlist rather than the id merge. A red on that case
means upstream's global allowlist moved.

**An evil merge hides a secret from every patch.** `gitleaks detect` on a git source is
`git log -p` underneath, which prints no diff for a merge commit — so a payload introduced by a
conflict resolution is in *no* patch: not in a pull request's `base..head` range, and not in the
whole-clone walk on the branch it lands on. That is not a corner case, it is the ordinary shape
of a resolved conflict. Squash and rebase merges rewrite the change into an ordinary commit and
do not carry it; this repository allows merge commits and uses them. The fixture builder proves
its own premise before handing the repository over — if `git log -p` over the range already
shows the payload, the fixture is not the thing it claims to be.

**No fixture may ever be written into the tree.** Every one is generated at runtime into a temp
directory removed on every exit path. This repo is public, its own scan runs over `scripts/`,
and the Security workflow's denylist greps tracked files for the same infra shapes — so a
literal private IP or token in either file would refuse every commit in the repo, for everyone,
until it was put back. `gitleaks-rules.check` assembles its payloads with a template literal
and `secret-scan-range.check` with a join, and each carries the warning at the site where
editing happens.

## Traps this repo has already paid for

**A fix-forward commit does not unsay a secret.** `gitleaks detect` walks `git log -p`, so
redacting a hostname in a later commit leaves the branch scanning red — six findings stayed
six. `git reset --soft <base>` plus one clean recommit is the fix, and only before the first
push, because a commit on a public repo stays fetchable by SHA after its branch is deleted.
So run both gates over the branch *range*, never over the working tree. `docs/` and `scripts/`
are scanned, which makes prose documenting a gate the prose most likely to trip it.

**`refs.test.js` pins references by `file:line`.** Inserting a block into a widely-cited file
therefore renumbers guideline pages outside your diff, so prefer appending to
`src/tokens/tokens.css`. The same file checks an `unmet: { issue: N }` marker's shape but never
whether the gap is still real — grep `unmet` when an issue closes, or the Guidelines Overview
goes on advertising it publicly.

### A shorthand resets the axis it does not mention

`padding` sets all four sides, including the ones you leave out. So `style="padding:70px 0"`
on an element whose class supplies the page gutter deletes that gutter, and the section runs
edge to edge at every width below the container — invisible on a desktop, where the container
is narrower than the viewport and the centring margin fakes a margin. Three sections of
`site/index.html` shipped that way and reached the live site. Write `padding-block` when only
the vertical axis is meant.

`site/gutter.test.js` holds it, and how it holds it is the part worth copying. It reads the
source rather than a layout: jsdom resolves none, and its CSSOM drops rules it cannot parse, so
measuring computed padding reported a missing gutter on nine healthy elements. It also pins the
container — a token `max-width` plus the centring margin, which is what tells a container from
a bounded paragraph — because the first version discovered gutter classes and checked only
those, and deleting the gutter simply dropped the class out of the set. The gate passed with
the defect in the tree, which is [a skip wearing a different
hat](#a-subject-a-gate-cannot-check-is-a-failure-never-a-skip).

**A checkout with no `node_modules` reds exactly one test.** `scripts/packaging.test.js` links
this tree's own React into a scratch consumer rather than downloading one, so an absent install
stops it at setup while everything else passes. Run `npm ci` first.

## Add a component

1. `src/styles/<name>.css` — token-driven, `.ui-<name>` class namespace.
2. `@import` it in `src/index.css`, and add it to `src/inline.js` (`styles` map +
   `cssText`) so server-render consumers get it.
3. A factory in `src/components/index.js` returning an HTML string.
4. Re-export it from `src/index.js`.
5. `stories/components/<Name>.stories.js` — a Playground + a states gallery.

**Shipping a module is not publishing it**, which is what step 4 is for. `files` in
`package.json` is `["src", …]`, so every component module lands in the tarball; the package has
no `./components/*` subpath, so `src/index.js` is the only thing a consumer can see. `footer()`
and `success()` sat in the gap through 0.8.1 — fully built, fully shipped, reachable by nobody —
and Storybook rendered both the whole time, because a story deep-imports the module path
(`from '../../src/components/footer.js'`) rather than the entry. *Does this render?* is a
different question from *can anyone import this?*, and only the second one is the published
surface. The gap is silent in the other direction too: a name in `src/index.js` with no file
behind it throws `ERR_MODULE_NOT_FOUND` and the whole kit fails to load.

`scripts/entry-reachability.test.js` holds both directions, reading each side off the files
rather than off a list of expected exports — a third copy of the same thing would only give the
first two something new to drift from. The contract it enforces is stated in
[docs/library.md](docs/library.md).

## Add a glyph

`src/assets/icons.js` holds the set: Lucide paths at the house 24×24 / 1.7 stroke, round
caps and joins. Lucide is the maintained Feather and our glyphs match it 1:1. Each value is
the inner markup and `icon()` wraps it in the shared `<svg>`, so a glyph inherits
`currentColor` and sits right next to our type with no runtime dependency anywhere.

**Name it for what it depicts, not for the one place it is used** — `trash`, not
`deleteWorkspace`. camelCase, and a modifier follows its noun (`circleX`, `eyeOff`,
`trendingUp`) so the family sorts together. A name is taken once. A second declaration of
one is a gate failure rather than a merge conflict, because the flat `ICONS` map takes the
last of the two and nothing breaks loudly: `card`, `chart` and `doc` sat filed under two
headings each until [#199][i199], and the file grew lines no reader could tell from a real
glyph.

**Group it by what it depicts, again rather than by caller.** `chart` lives in `DATA`
because it draws data, even when a comms panel is what renders it. If two groups both look
right, the glyph belongs to the one whose other members it would sit beside in the
catalogue. Groups are not tags: exactly one.

**Take the path from Lucide unmodified**, at the house stroke and box. That is what keeps
the set looking like one hand, and a year later a traced glyph and a copied one are
indistinguishable by eye — so the commit message is the only place the difference survives.
Say which Lucide name it came from when the two differ, and give a reason for a hand-drawn
path. Brand marks are the exception with no original to take: `github` and `linkedin` are
the vendor's own and live in `BRAND` for that reason.

`src/assets/icons.test.js` holds one-group-per-glyph and the emitter's numbers;
`stories/guidelines/iconography.test.js` holds the icon-only list. The rules as a reader
meets them are on Guidelines / Iconography.

[i199]: https://github.com/apliteni/apliteni-ui/issues/199

## React components (`react/`)

`react/` is a **private workspace** — it is not a package anyone installs. Its build
output ships as the `@apliteni/apliteni-ui/react` subpath of this package, so the kit
is one package with one version, one pin and one supply-chain surface. Rules:

1. **No drift.** React components render only `.ui-*` classes + tokens — never
   their own colours, spacing, or radii. The design tokens' source of truth is
   the `apliteni/design-system` repo.
2. **Parity test is a merge gate.** Each primitive has a class-name parity test
   (`react/src/test/classlist.ts`) asserting its class list equals the vanilla
   factory's output. If it fails, fix the React component — the vanilla output
   is the source of truth.
3. **React stays out of the root manifest.** The root package declares `react` and
   `react-dom` nowhere — not as dependencies, not as peers. An optional peer lands in
   the lockfile as `devOptional`, which put React in the set the production audit
   walks, and that audit gates `main`: one react-dom advisory would redden every PR
   in a repo that ships no React. React reaches us only as a devDependency of this
   workspace, stays `external` in `tsup.config.ts` — never bundled — and consumers
   install it themselves, which the README has to keep saying.
   `scripts/packaging.test.js` fails if any of that slips.
4. Use TypeScript; every component gets a test and a Storybook story.
5. **Never publish it separately, and never give it a `*` dependency.** The workspace
   is `"private": true` with no `dependencies`; it reaches the vanilla factories
   through the bare `@apliteni/apliteni-ui` specifier, which resolves to this very
   package once installed and to `../src/` in the repo (`react/kit-alias.ts`, wired
   into `vitest.config.ts` and `.storybook/main.ts`). `scripts/packaging.test.js`
   enforces all of it.
6. **Root `test` glob is explicit.** The root `test` script lists directories
   (`src/`, `stories/`, `site/`, `scripts/`) rather than globbing everything — if you
   add a new top-level directory containing tests, add it to that glob too. It names
   each directory twice: once in the guard that fails the run when a directory is
   missing, once in the glob handed to `node --test`. A renamed directory used to
   drop its tests and still exit 0; now it exits 1 and says which one is gone.

### Packaging guard

`scripts/packaging.test.js` packs the real tarball (`npm pack`, which runs `prepare` →
the tsup build), installs it into a scratch directory outside the repository, and then
checks every `exports` entry **from a consumer that lives there**: the target is in the
tarball, it is not zero bytes once installed, it resolves under **both** `import` and
`require`, and — for JS entries — importing it yields exports. 0.7.2 shipped an
`exports` map that read fine and a `files` array that dropped every React file;
reading `package.json` back to itself proves nothing. A guard that would still pass
with an empty bundle, or with a subpath no `require()` can reach, is not a guard.

The install is what makes the check honest. `react/package.json` is deliberately kept
out of the tarball, and that absence is what lets Node's self-reference resolution find
the root manifest — so the bare `import { icon } from "@apliteni/apliteni-ui"` inside
`react/dist/index.js` only resolves once the package is installed. Checked from the
working tree it either fails, or passes by accident off a stale
`node_modules/@apliteni/apliteni-ui` left over from an earlier install.

The install is offline: the kit declares no runtime dependencies, so a correct tarball
needs nothing from the registry. React is linked in from the repo's own `node_modules`
afterwards, the way a real consumer of `./react` supplies it — and only after the guard
has asserted that installing the kit alone dragged no React along. If the install
itself fails, the run fails with npm's output attached; it never passes because nothing
was checked. Adds roughly 0.3s to the run.

If you add an export, add its files to `files`; the guard will tell you. Wildcard
targets (`"./guidelines/*"`) are expanded against the pack list and each match is
checked, so a pattern is never reported as a missing file.

## Add an accent sub-theme

Append a pair of blocks to `src/tokens/accents.css`:

```css
:root[data-theme="dark"][data-accent="<name>"]  { /* --accent, --purple*, --glow-purple, --ring, --grad-* */ }
:root[data-theme="light"][data-accent="<name>"] { /* light variant */ }
```

Add it to the toolbar (`.storybook/preview.js` globalTypes.accent), the
`accentPicker()` swatches, and the `Sub-themes` story maps. Verify contrast of the
primary button (`--accent` bg × `--accent-contrast` text) in both themes.

The swatch is machine-checked, so you do not get to pick its colours.
`stories/accent-swatch.test.js` derives it from your tokens: at `135deg`, it fades
from the next distinct step up your dark ramp — of `--purple`, `--purple-light` and
`--purple-mid`, the darkest one still lighter than `--accent` — down to dark
`--accent` itself. Most accents land on `--purple-light`; Nebula's *is* its own
`--accent`, so it walks on to `--purple-mid`. Two ramp steps tied at that luminance
make the rule unanswerable and the gate says so rather than picking one.

**The angle is the one literal in that gate, and it is there on purpose.** The rule is
directional — up the ramp at stop 1, down to `--accent` at stop 2 — so which end of the gradient
is which is decided by the angle, and a gate checking only the two colours would pass `315deg`
painting the identical pair backwards. Two weaker checks were available and both were refused:
*field 0 parses as an angle* passes `315deg`, and *all four swatches agree* passes all four
reversed together. Neither holds what the rule says, so `135deg` is written down — what all four
ship, and what the kit uses for every other gradient.

Dark and not light, because there is one swatch and it can only be one colour. The picker renders
in both themes; the accent's identity is its dark cell, where the accent is at its most saturated
and most itself.

Read the gate as a new invariant rather than a regression detector. It would have been red before
[#157][i157] too: the dark ramp then had `--purple-light` equal to `--accent`, the same degeneracy
Nebula has today, and the swatch resolved it by walking **down** to `--purple` instead of up. The
rule picks the other end for every accent alike, and the day it was written was the first day any
version of Nebula's swatch satisfied it. The shipped colours moved under [#190][i190] because the
rule is stricter than the eyeballing before it, not because #157 knocked something loose.

Write the dark block as `:root[data-theme="dark"][data-accent="<name>"]`, attributes
in that order, and declare `--accent` and all three `--purple*` in it. Any other
legal spelling is invisible to the resolver, which then hands your accent Nebula's
ramp; the gate checks for your block by name and fails if it cannot find it.

The same gate holds the site's two hand-kept copies (`site/chrome.mjs`,
`site/index.html`), so add your swatch to all three at once. What it compares is the
`linear-gradient(…)` text each picker paints for each accent — it never sees whether
you deliver it as `--swatch:` or `background:`, what the aria-labels say, or what
order the accents are written in. Those three still want to match by hand, for the
next person reading the diff; the gate only holds the colours.

[i157]: https://github.com/apliteni/apliteni-ui/issues/157
[i190]: https://github.com/apliteni/apliteni-ui/issues/190

## Brand tokens (synced from design-system)

`src/tokens/brand.generated.css` is **generated — never hand-edit it.** It holds
the Apliteni umbrella-brand colour primitives (`--color-apliteni-*`: the violet
and supporting ramps), owned upstream by
[`apliteni/design-system`](https://github.com/apliteni/design-system) and served
at `style.apliteni.com`. Every push to that repo's `main` opens a CI-gated PR here
that rewrites this one file (RFC #42, Option B).

- To change a **brand** colour: edit it upstream, not here. The sync PR follows.
- To refresh locally: `npm run tokens:sync -- --url https://style.apliteni.com/tokens.css`
  (or `--from <path>/dist/tokens.css` against a local checkout). `npm run tokens:check`
  fails if the file is stale.
- Our **semantic** tokens (`--bg`, `--surface`, `--accent`, signal colours) stay
  hand-authored in `tokens.css`. The purple deck theme is a deliberate product
  choice, so it may diverge from the brand palette. `npm run tokens:drift` prints
  where — expected, not a bug.

`src/assets/brand.generated/` is the same story for the **Apliteni marks** — the
umbrella wordmark + seedling mark, synced from upstream (`index.js` exports them as
inline strings; see Foundations → Brand → Umbrella). Use these for *Apliteni the
company*. The kit's own `prism` mark stays hand-authored in `src/assets/brand.js`.

## Release

A release is a version bump. Merge one to `main` and the rest happens on its
own: `tag-on-bump.yml` tags the commit, cuts a GitHub Release whose notes are
the changelog entry for that version, and dispatches the publish workflow on
the tag. The old ritual of `npm version`, a pushed tag and `gh release create`
is gone.

One step still needs a person. The publish job runs in the `npm-publish`
environment, which asks one of four reviewers to approve it and will not let you
approve your own, so expect to be waiting for somebody else. `tag-on-bump.yml`
watches the publish for ten minutes and then stops watching. A run that finishes
inside that window is reported as it finished, red if the publish failed. It also
goes red when the publish succeeded and npm's last answer, once the two and a half
minutes are up, is that it does not have the version — and the message sends you
to npm first, because a version is published before every edge can read it. Any
other last answer leaves the job green with a warning on it, because a registry
that was not answering when the window closed has said nothing either way, and
`version-drift.yml` is what catches that one.

A run still waiting on a reviewer when the ten minutes are up leaves the job
green, with a warning naming what it is waiting for and, where it can, the run.
Somebody who has not clicked yet is not a broken pipeline.

So that green does not mean the version shipped. It means the release was
started: the tag, the Release and the dispatch are all done, and npm has nothing
new on it until the approval lands. If the approval never comes, what notices
is `version-drift.yml` — it compares npm against `main` once a day and only
reports a gap older than twenty-four hours, so expect the issue in one to two
days rather than overnight.

A red job does not undo itself. The publish it started can still finish, since a
run that was building when the watch ran out may publish minutes later, but the
job that already went red stays red — nothing goes back and re-runs it. What
turns green is the next push to `main`, because the decision comes from the
registry rather than from the tag: once the version is on npm, any run after
that reads the release as done. Or re-run the failed job by hand — same thing.
Either way nothing needs undoing: whatever part of the release is missing gets
picked up from where it stopped.

**The registry decides, not the tag**, and that is the rule the whole workflow
turns on. A version is released when npm serves it, so the plan step asks npm
rather than asking git — otherwise a failed publish becomes permanently green
the moment a tag exists. `scripts/tag-on-bump.test.js` holds it by running the
workflow's real `run:` bodies against a stubbed registry and evaluating the
`if:` expressions the way Actions evaluates them, per
[a number a comment argues for is pinned by a measured
test](#a-number-a-comment-argues-for-is-pinned-by-a-measured-test). Asserting on
the YAML would prove nothing: the strings under suspicion are exactly the ones a
grep would be looking for.

Two things have to be in the pull request. The `Shipped surface vs version` job
checks both and goes red without either. Since it is not one of the checks
branch protection requires, though, a red one does not stop the merge — read it
yourself before you merge.

**A change to what we publish needs a bump.** The `Shipped surface vs version`
job packs the tarball at both ends of the pull request and compares the
contents. If they differ and the version does not, it fails and names the
files. `files` in package.json is what decides "published" — everything in
`src/` except its tests, `react/dist`, plus the readme, licence and manifest
files npm adds whether you list them or not. 52 files today. Two cases catch
people out. `react/dist` is built from `react/src` and is not in the
repository, so a React change lands in the report as a `react/dist` change you
never saw in your diff. Tests under `src/` ship nothing, so editing one needs
no bump.

**A bump needs a changelog entry.** Add it to the `RELEASES` array in
`site/changelog.mjs`, in the same pull request. The Release notes are read from
there, so a version nothing describes is a release that cannot be built.
Without this gate the failure would arrive after the bump was already on
`main`, and undoing that takes a second pull request.

Which number to bump is still yours to choose. Patch or minor is a judgement
about what the change costs the people who installed the package, and once a
version is on npm it is there for good.

The publish runs as two jobs. `build` installs and runs `npm pack`, whose
`prepare` builds `react/dist` from the tagged commit — so the React subpath can
never ship stale — and `publish` holds the OIDC credential and does nothing but
push that tarball to the public npm registry, so no third-party install or
build script runs beside it.

If `main` and npm disagree for more than a day, a scheduled job opens an issue
saying so. It is the backstop for a release that was tagged and never reached
the registry.

### What the release gates are shaped by

Each of the three has a shape that looks over-built until you know which failure it was
built after. None of them was designed; all three were extracted from something that had
already shipped wrong and reported green.

**`shipped-surface.mjs` measures the artefact, never the paths.** Twice a change to what we
publish merged without a bump and stayed off npm while sitting on `main` looking merged: the
`./react` subpath, and `footer()` / `success()` / `successCheck()` / `wireSuccess()` exported
from the entry point and unreachable by every consumer. Review caught neither, because a diff
does not tell you whether the thing it changes is published.

Matching changed paths against `files` fails in both directions. `react/dist` is built and
gitignored, so a change to what it contains never appears in a `git diff` at all — precisely
the surface that caused the first failure. `react/src/**` is never published but is what
produces `react/dist`, and a glob wide enough to catch it also catches `react/src/*.test.tsx`,
which ships nothing. So the subject is the tarball: pack at the base of the pull request and
at its head, fingerprint every file npm would put inside, compare. Paths never enter the
decision.

Sizes are not enough — an edit that changes a colour token or an off-by-one keeps the byte
count and changes what ships — so the pack list decides *which* files ship and each is then
read off disk and hashed. Reading from disk rather than extracting the tarball keeps the
script to node builtins, and the tarball's contents are those files, so the two answers are
the same answer.

One field is deliberately ignored. `package.json` is inside the tarball, so the version bump
that satisfies the gate is itself a change to the shipped surface; counted naively, the only
fix for a red gate would be a change that keeps it red. So `version` — that field alone, not
the file — is excluded from `package.json`'s fingerprint. `exports` and `files` still count,
and those two fields decided both failures above.

The bump has to be **upwards**, because a version that is merely *different* releases
nothing: set it to something already tagged and `tag-on-bump` finds the tag on `main`,
no-ops, and the change sits merged and unpublished — the original bug, wearing a bump. An
intentional rollback goes forwards too, since npm will not re-serve a version it has already
served.

**`release-notes.mjs` refuses to render, and the refusal is the point.** 0.8.0 and 0.8.1 both
went out with nothing on `ui.apli.tech/changelog`: the page jumped from 0.7.2 to the version
after them and two releases were invisible to anyone reading it. Writing the entry was a step
somebody was supposed to remember, and it went unnoticed for two releases because nothing
depended on it existing. Now the release body is read out of that entry, so a missing entry
is not an oversight to catch later — it is a release that cannot be built. The
`Shipped surface vs version` job imports this script rather than reimplementing the check,
so there is exactly one definition of "the changelog describes this release", and it fails
in the pull request rather than after the bump is already on `main`.

The changelog is **imported, not scraped**. `site/changelog.mjs` exports `RELEASES` as data
with a renderer beside it, so a change to its shape shows up as a failure a test can catch
rather than as a regex that quietly matches nothing and hands back empty notes. A regex would
also have to understand nested brackets, escaped quotes and the backticks in almost every
entry. Breaking changes sort first, because a release page is read top-down and abandoned
halfway, and no entry is obliged to open with its breaking change.

**`registry-status.mjs` has three answers, not two.** `tag-on-bump.yml` used to decide
whether a release still needed doing by asking whether the tag existed. The tag is created
before the publish, so its existence only ever proved the attempt had started — and with a
reviewer required on the `npm-publish` environment, a slow approval is enough to leave the
tag behind. Every later push to `main` then read that tag, concluded there was nothing to do,
skipped the publish and exited green. The pipeline reported healthy for as long as anyone
cared to look while nothing was on npm: the silence the whole release automation exists to
end, rebuilt inside it.

So the registry is what gets asked. `npm view` exits non-zero for a version that is not there
and for a DNS failure alike, and folding those together turns an npm outage into either a
re-publish of a released version or a green tick over an unpublished one. `unknown` is a
first-class verdict and the caller stops on it, exactly as the `git ls-remote` check beside
it in the workflow stops on exit 128. The registry asked is `publishConfig.registry` and not
npm's ambient default, because "did our publish land" is a different question from what an
`.npmrc`, an `npm_config_registry` or a corporate mirror would answer.

All three scripts are in **two halves**, like `scripts/version-drift.mjs`: everything above
the `import.meta.url` check is pure and takes its facts as arguments, so every branch —
including the failure branches — is exercised in milliseconds with no filesystem and no
network; everything below runs npm, reads files and has no judgement in it.

The `ui.apli.tech` site rebuilds from the repo (landing + Storybook) — see the
README for the image build/deploy.
