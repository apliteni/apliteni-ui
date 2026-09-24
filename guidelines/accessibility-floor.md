# The accessibility floor

The four numbers under every control, the kit's higher aims, and the blind spots its gates admit.

## Give every pointer target at least 24x24 CSS px.

<!-- rule: target-size -->

**Except:** WCAG 2.5.8 allows spacing, an equivalent control, inline text targets, user-agent sizes and essential presentation; none covered the three undersized kit controls. Overlays must not reach neighbours: toast close/action and stacked-toast gaps are 12px against 2.5px overhang; the checkbox has 11px to its same-input label. The gate does not measure these layout distances.

**Do:** 2.5.8 measures targets: the 19x19 checkbox has a centred 24x24 ::before hit area without moving its box. Overlay only when the drawn box is the design; otherwise grow it. The sm button already clears at 26.5px; .ui-snippet__copy’s 0.56px shortfall needed invisible min-height, not an unmeasurable overlay.

**Don't:** A 19x19 target matches the ink but is 5px short on both axes, as three kit controls were before [#219](https://github.com/apliteni/apliteni-ui/issues/219).

## Hold a focus indicator to 3:1 against the ground it lands on.

<!-- rule: ring-contrast -->

**Why:** G2’s solid band supplies contrast, its surface-coloured gap separates accent-filled controls, and its halo decorates ([#343](https://github.com/apliteni/apliteni-ui/issues/343)). The band must hold 4.22:1 on flat ground and 3:1 against actual gap/halo pixels; glow alone failed 3:1.

## Paint a disabled control, never fade it: 3:1 for the label, and a pair it does not show when it is on.

<!-- rule: disabled-legibility -->

**Why:** WCAG 1.4.3 exempts disabled controls, so [#220](https://github.com/apliteni/apliteni-ui/issues/220) sets 3:1: opacity faded label and box together to 1.48:1, with no light-theme control clearing 3:1. Opaque --disabled-ink / --disabled-surface / --disabled-border gives labels 6.91:1 dark and 4.89:1 light; boxless ghosts use --disabled-ink-bare, floored at 4.89:1 and measuring 5.20:1–7.49:1 by ground ([#273](https://github.com/apliteni/apliteni-ui/issues/273)).

**Except:** Disabled must still look weaker: change the pair and drop the accent. Its 6.91:1 dark / 4.89:1 light contrasts exceed or fall below enabled’s 5.70:1 / 7.34:1, yet grey on grey differs from white on purple. Paint carries state; contrast carries legibility. Only the label-free switch track still fades; its 1.4.11 pair is ungated.

## Set a field's text to 16px where the pointer is coarse.

<!-- rule: touch-field-size -->

**Why:** iOS Safari zooms into fields below 16px and does not zoom out: kit forms were 14.5px, the pager’s two fields 13px, dropdown search 12.5px. The input/select/textarea rule covers kit and host fields; use real 16px, because scaling it down still zooms and shrinks borders and focus rings.

**Except:** This is a flat size, not a CSS font-size floor: host fields above 16px shrink too. Preserve them with !important on a more specific selector, such as a field class or .hero-search input, regardless of sheet order. Checkbox, radio, range, colour, file and button types do not zoom and keep their size. Do not use user-scalable=no or maximum-scale=1: removing pinch-zoom violates WCAG 1.4.4 and Apple’s guidance, and the host owns that viewport tag; field sizing belongs in CSS.

## Read a green gate as a floor, never as a verdict.

<!-- rule: floor-not-verdict -->

**Why:** These numbers are minimums; the four aims below describe the goal. A component one thousandth above AA passes and is still the worst thing on the page.

## Say what a gate cannot see, in the gate.

<!-- rule: name-the-gap -->

**Why:** The table collects each gate’s declared blind spots from its header, not a fresh audit. A gate that overstates itself is how contrast came to be “verified visually” in the first place.

## Above the floor

<!-- section: aims -->

The numbers above are minimums. Apply these four aims to every new component.

### Body text is close to 7:1, not 4.5:1.

**Apply:** AA requires 4.5:1, and the kit’s normal --text on --bg is well above that in both themes. A new component at 4.6 passes but is still the kit’s weakest text. Use --text for words at every size. Create hierarchy with size, weight and spacing. Reserve muted and dim ink for the closed glyph, state and empty-slot exceptions in Labels and titles.

### A status uses a mark and a word, never hue alone.

**Apply:** There are five statuses, including red and green. Every signal component pairs colour with a glyph and label. The stroke-width rule makes the glyph wide enough to look like a graphic rather than a smudge.

### A measurable pair is better than an unmeasurable pair.

**Apply:** A gradient, filter or translucent layer over text cannot be judged in the walk and will remain unjudgeable. An opaque ground is measurable.

### A control must work before it looks good.

**Apply:** Keys come first, then the pointer, then visual styling. If keyboard behaviour was written last, it is only a guess.

## What the checks cannot see

<!-- section: gates -->

These are the checks’ declared limits, not a new audit. Every accessibility check must appear here.

### Ring surfaces

**Checks:** Finds raised backgrounds and their aliases in both workspaces. It requires a matching gap and the shared ring composition. Form focus rules use focus-visible.

**Limit:** Rendered blur contrast, clipping and browser focus behaviour require Chromium pixel and keyboard evidence.

### React: BackLink

**Checks:** Checks the React back link against the factory rule: the arrow is aria-hidden so its meaning is spoken in words; the accessible name includes the visible text as WCAG 2.5.3 requires; and a name already saying "Back to" is not repeated.

**Limit:** Whether the link is reachable in its location. It is a static anchor with no state, so this gate does not press a key. The shell gate places it on a page.

### React: Dropdown

**Checks:** Presses real keys on the React dropdown: arrows open it on the first or selected row, move through the ring and skip disabled rows; Home and End; Enter and Space; Escape and Tab; and focus after closing. With a search field, it checks that focus stays in the combobox, aria-activedescendant names the row Enter would choose, and Home and End move the caret. It also checks every row role, aria-selected and aria-disabled against the factory.

**Limit:** Whether requested focus lands. JSDOM moves focus into a box hidden by the stylesheet. The rule that makes an opening panel visible when the key lands is checked by the overlay CSS gate against the stylesheet.

**Limit:** A caller’s row is accessible only if the caller spreads the props onto the correct element. This gate checks that props arrive, not where a consumer spreads them.

### React: Pagination

**Checks:** Checks where focus goes when a pager step becomes disabled at an end or during loading, and ensures the jump box never commits a page the reader did not request.

**Limit:** Real browser focus. JSDOM does not blur a control that becomes disabled, so tests simulate the move to `<body>`.

### Palette keyboard

**Checks:** Presses real keys on the command palette: the opening hotkey, arrows that move the active row while the caret stays in the text box, Enter, Escape that closes only the top overlay, the Tab trap, and the live-region message.

**Limit:** Whether requested focus lands. As with the drawer gate, JSDOM has no layout or transition, so a focus() that a browser would reject is counted as successful.

**Limit:** The pointer. Hovering changes the active row and clicking runs it; this gate does neither.

### Command palette

**Checks:** Checks the palette guidelines against the component: its keyboard contract matches the keys the sources compare, its grouping uses the claimed label role, and every rendered palette row goes somewhere, runs something, asks something or says it is unavailable.

**Limit:** What a key does. It checks which keys are handled, not the result; the palette keyboard gate presses them.

**Limit:** A row a story does not render. The sweep is the catalogue, so a product’s own palette is covered only where the kit renders it.

### The page

**Checks:** Renders every screen under the stories and app screens and checks the page rules: one h1; an outline descending one rank at a time and stopping where the contract says; one named navigation landmark; the shell’s head order; and no overlay open before the reader requests it.

**Limit:** CSS behaviour. It reads story markup without resolving stylesheets, so display:none content is still a heading and an off-screen landmark is still present.

**Limit:** What headings say. A correct rank and an incorrect title look the same here; the letter-case gate checks the words.

**Limit:** A screen no story draws. The sweep covers only the story app screens, so a consumer page is covered only to the extent that the kit draws the same shape.

### Contrast

**Checks:** Measures every text-owning element in every story and both themes against the background composited above it.

**Limit:** Layout, including a toast over the page, a dropdown over a card or a drawer over its scrim. DOM ancestry stands in for visual stacking and is wrong where the two differ. This is the gate’s largest gap; only a browser closes it (#131).

**Limit:** Paint layers the walk cannot see, such as a ::before backdrop or sibling glow. Nine pairs per backdrop are judged against the wrong ground.

**Limit:** Gradients and images an element owns or inherits. These are reported as unjudgeable, not passed.

**Limit:** Filters. .ui-btn--primary:hover brightens, but the gate reads the pre-filter colour.

**Limit:** Inactive components and everything inside them. This is the gap filled by this page’s third number.

**Limit:** Non-text contrast such as borders, focus rings and icon strokes, which requires geometry.

**Limit:** More than one accent and any state beyond hover, focus-visible, focus and active.

### A11y

**Checks:** Runs axe over every story in both themes for WCAG 2.0/2.1 A and AA. It asserts that the check count equals stories × themes so nothing disappears silently.

**Limit:** Accents. It uses only the default accent in two themes; testing every accent repaints tokens and costs runtime.

**Limit:** color-contrast, deliberately. Axe cannot resolve var() in a headless DOM and would treat the kit tokens as having no colour.

**Limit:** Anything static markup cannot show. Axe passed a tablist that controlled nothing.

### Keyboard

**Checks:** Presses real keys and checks what moved, covering what the partial axe run cannot see. It wires markup with the kit’s own topbar and tab setup, sends KeyboardEvents and checks activeElement.

**Limit:** Every component it does not reach. Coverage stops at the topbar and tabs.

### Drawer focus

**Checks:** Checks that opening the drawer requests focus inside its panel.

**Limit:** Whether focus really lands. JSDOM has no CSS or transitions, and the original bug involved transitioned visibility making focus() a no-op in Chrome. This gate can prove only the request.

### Accent contrast

**Checks:** Checks a token contract across all eight theme × accent cells. It renders nothing, runs in milliseconds and sees pairs no story happens to render.

**Limit:** Anything a component composes that the tokens do not state alone.

### Elevation

**Checks:** Checks every box-shadow declared by the kit’s stylesheets, reads each layer’s geometry per theme and rejects a cast shadow that is not the floating treatment. It also checks the floor this page needs: --muted on raised surfaces clears AA in both themes.

**Limit:** The rendered result. Ratios are arithmetic over flat colours, while a blurred penumbra is not one. The drop is scored at its core, the darkest ink it lays down.

**Limit:** filter: drop-shadow(). Two shipped cases are zero-offset signal-colour glows; an offset one would pass here unseen.

**Limit:** A shadow from markup, such as an inline style in a story or a consumer stylesheet.

**Limit:** A cast appearing only when two custom properties simultaneously have non-winning values. Each name is tested against every kit value, one at a time.

### Signal contrast

**Checks:** Reads declarations from the source and checks twenty status-glyph pairs against the stroke-width rule’s bar.

**Limit:** Colour for glyphs without a status. Width is checked next door; ratio is not.

### Stat basis

**Checks:** Requires every change shown in a stat band to state its comparison basis in reachable text, either beside the change or in the caption it points to, never only in a hover title.

**Limit:** Whether the named comparison is correct. It checks only that one exists and is reachable.

### Glyph stroke

**Checks:** Renders every story and measures the actual width of every stroked glyph, resolving inheritance and the icon factory’s default, against the stroke-width rule’s 1.5 CSS px line.

**Limit:** Colour. It measures only width; the stroke-width rule determines the relevant bar.

**Limit:** Anything no story renders, so it also rejects a sizing rule without a specimen.

**Limit:** State. Stories render at rest, so a stroke declared only in :hover is unseen.

### Accessibility floor

**Checks:** Pins three page numbers: target size for every rendered control, using its box UNION generated pseudo-elements; ring contrast against every ground; and the composite left by a disabled control. Each disabled control is measured as rendered and again without its disabled attribute, so the pair must change. Every control in a folded rail is measured separately, with its name read while the label is off-screen.

**Limit:** A disabled input’s value. The walk measures text nodes, while an input stores its value in a property. Thus .ui-input:disabled is found and repainted but contributes no pair; its tokens are measured on other controls using them.

**Limit:** Width for anything sized by a line of text. It is reported unmeasurable, not passed. An overlay may widen known width but cannot provide one.

**Limit:** The 2.5.8 spacing exception, which is entirely a layout question.

**Limit:** Overlay position. Size is read but offset is not, so both a clear overlay and one covering a neighbour count without that distinction being reported.

**Limit:** Clipping. An overflow:hidden ancestor can cut an overlay, but boxes are not composited here. .ui-toast clips, and its close control was checked by hand.

**Limit:** The ring’s inner edge. Only the outside ground is measured.

### Confirm keyboard

**Checks:** Uses the same key-pressing method as the keyboard gate for confirm(): focus enters the question, Escape answers it and Tab cannot leave.

**Limit:** Browser behaviour JSDOM lacks, including transitions, paint and scrolling.

### Overlay stack

**Checks:** Checks two overlays open together: who owns Escape, what is inert, where Tab goes and what remains after one closes out of order.

**Limit:** Focus that is requested but does not land, due to the same JSDOM limit as the drawer gate.

### Overlay css

**Checks:** Reads both overlay stylesheets as text and asks the same questions of each, because the broken rules involved transitioned visibility that JSDOM cannot run.

**Limit:** Whether the rule reaches the element. It reads declarations, not the cascade.

### Dropdown field ground

**Checks:** Measures how deeply the dropdown search field sinks into its panel, compared per theme with the kit’s own field on a card. The surrounding surface determines the depth: a floating panel is one level above a card.

**Limit:** Legibility. It checks field ground against its surround, not whether field text clears AA; the contrast walk checks that.

**Limit:** Every other field. It checks one selector in one stylesheet, so a second field added to a panel later is not covered.

### Dropdown foot role

**Checks:** Places the same head and foot in each panel dropdown() can emit and runs axe over all three. Thus the rule that a control belongs only in the search variant’s dialog is measured rather than merely documented.

**Limit:** Everything else in the foot. It asks one question of one slot, not about rows, trigger or keyboard.

**Limit:** A control on which axe has no opinion. The rule uses aria-required-children, which counts children by role rather than behaviour.

### Field zoom

**Checks:** Checks the touch-zoom net (#294). It mounts every story in a stylesheet-free jsdom, asks whether the net’s selector reaches each field with matches(), and compares this with every font-size rule read from the kit’s stylesheets. It fails a field rule below 16px, a rule above 16px that the flat net would shrink, any second !important font size in the kit, and any second (pointer: coarse) rule outside the net’s stylesheet.

**Limit:** The cascade. Nothing is resolved; jsdom does not rank !important between rules and would return the component size. Declarations are compared directly. The gate proves only that the net is the kit’s sole important font size, not that a browser resolves it so.

**Limit:** Whether a browser matches (pointer: coarse). jsdom evaluates no media query, and this gate reads the net block as text. The device evidence is the screenshots under the touch-zoom documentation.

**Limit:** Safari’s threshold. 16px is observed browser behaviour, not a standard, so this gate cannot measure the number itself.

**Limit:** Layout. Larger text can grow its box, but no box is laid out. The phone pager strip is a review question, not a gate failure.

**Limit:** A field rendered only by a host page. The selector can reach it, but this walk cannot see it.

### Reduced motion

**Checks:** Checks the prefers-reduced-motion net (WCAG 2.3.3). It parses the reduced-motion stylesheet, so deleting one of the net’s !important durations fails. It also fails a duration with !important outside a reduced-motion block, which would override the net; one inside a component block that does more than disable motion; and an !important loop count above one. Finally, it finds every script waiting for animationend or transitionend, including a React onTransitionEnd prop, and requires a timer in the same function. A reduced-motion branch alone does not count.

**Limit:** Which timer is used. Any setTimeout in the function counts, even if unrelated to the listener.

**Limit:** Whether a browser applies the net. jsdom evaluates no media query, so the net is read but never run.

**Limit:** Delays. The net does not zero animation-delay or transition-delay, and this gate does not look for them.

**Limit:** Inline styles written by scripts and script-driven motion such as requestAnimationFrame or element.animate().

### Motion coverage

**Checks:** Finds every state rule that shows, hides or moves an element. It requires a transition or entrance animation between states, or a motion: still note explaining why. It also records the motion the reduced-motion net must stop.

**Limit:** Whether anything plays. jsdom runs no animation, so each component test checks that the entrance class appears on change and not at first render.

**Limit:** Content inserted by innerHTML, and React markup mounted or unmounted without a state class, such as DataTable rows after sorting. React overlays have one, including .rx-scrim.is-open and the kit drawer’s .is-open, and these are read.

**Limit:** Ancestors. The element is matched by its rightmost classes, so a transition under another parent still counts.

### Tooltip specimens

**Checks:** Renders every story, wires it as the preview does and opens each readout with pointer, focus and Escape. A picture of a readout must be open and unchanged at the end, and a live readout on the same pages must open under the pointer.

**Limit:** Where the readout sits. JSDOM lays out nothing, so it proves only that the picture remains visible.

**Limit:** Whether a live readout is keyboard reachable. The wiring adds no tab stop to a mark, which is the open question on #282.

### Nav cascade

**Checks:** Checks three repaired rail declarations against their intended elements. Each was present in the stylesheet but ineffective, including a cancelled focus ring.

**Limit:** JSDOM ranks author rules faithfully but does not rank by origin. The user-agent boundary is a known exception, documented in the contribution guide’s cascade section.

### Button chrome

**Checks:** Mounts every clickable class the kit ships where a story renders it, once with browser button chrome and once without. It requires equal background, border, font-family, font-size, line-height, text-align and width. The three font facets are separate because Chrome writes them as one shorthand, `font: 400 13.3333px Arial`; a font-family longhand restores the face but leaves size and leading. Width also requires rejecting `width: auto` and `width: fit-content`, even when readings match. Three failing classes and three excluded classes are pinned by name, so the derived count remains stable.

**Limit:** Layout. JSDOM computes no boxes, so shrink-to-fit is modelled with a width declaration. A row filling its line for another reason may look repaired.

**Limit:** The chrome itself. Stand-in values are Chromium’s, measured on the branch that created this gate and not updated afterward. A browser restyle would leave the stand-in stale.

**Limit:** Weight and style. `font: inherit` resets both, so rules preserving either must come after the shorthand; this gate does not read whether they do.

**Limit:** State. Readings are at rest, so chrome only shown on :hover is unseen.

**Limit:** Rows in its own ledger. A class rendered as a `<button>` is measured and counted rather than failed. Sixteen rows retain chrome nobody is repairing: twelve on text-align and four on line-height.

**Limit:** Every ancestry of a deferred row. A failing class is read in every distinct story ancestry; a ledgered class is read once. Fourteen classes appear 415 times across 232 ancestries; fourteen are read, leaving 218 cascades under ledgered rows unmeasured.

**Limit:** A class that stops being clickable. The sweep begins at `cursor: pointer`, so moving the declaration to a wrapper or :hover removes the class from the sweep. Three subjects are pinned by name; fourteen deferred classes are not.

**Limit:** The deliberate exclusion bucket: browser-owned form controls or their decoration, including the `select` behind .ui-select, the `label` around the checkbox in .ui-check and the `span` drawn by .ui-switch__track. Earlier, many more were excluded for markup reasons, leaving .ui-fbpill unmeasured while carrying the whole defect.

### Shell

**Checks:** Checks shell composition: one `<main>`, a named navigation landmark, a rail item named at every width, the caller-owned breadcrumb trail and the fold toggle. The toggle is drawn only when requested, is a native button outside the landmark and is named for the action.

**Limit:** How markup looks after meeting the stylesheet; the shell states gate checks that.

### Shell states

**Checks:** Resolves the shell through the real cascade at every width, theme and accent so nothing disappears. It also checks the folded rail against the narrow-rail rule for each property and every element, both at rest and focused.

**Limit:** Layout. Width is represented by a class, not a viewport.

### Shell rail

**Checks:** Presses the fold toggle through wireShell() and checks the rail, announced state, focus location, folded-row titles, cookie and path, opt-out and ui-rail event. It then draws the next page and checks that the state was remembered.

**Limit:** Enter and Space. The toggle is native, but JSDOM performs no key activation, so a press is treated as a click.

**Limit:** The tooltip itself. A title is added and removed; whether a browser displays it is browser behaviour.

**Limit:** The paint before script. A server that does not read the cookie paints the rail open for one frame; only a browser shows that.

### Danger colour

**Checks:** A destructive control is never the accent and stays quiet until pointed at, so “delete” never uses the kit’s go colour.

**Limit:** Whether the hover colour clears AA where it lands; the contrast gate checks that.

### Accent swatch

**Checks:** Checks that the accent picker’s swatch uses the tokens selected by the accent in all three picker copies. A stale swatch would misrepresent the available choice.

**Limit:** Whether the selected accent is legible; the accent contrast gate checks that.

### Accent without theme

**Checks:** Renders the kit without data-theme and checks that it is still painted, still dark and still uses the accent requested by data-accent. This is the state created when a host stamps nothing, and no other gate mounts it.

**Limit:** --accent alone. It reads the token naming the sub-theme, not the neighbouring ramp, so a bare cell that repoints --accent but forgets --purple-light passes because of the one token it changed.

**Limit:** Contrast. It checks only that a colour arrives, not that it is legible. Accent contrast checks all eight stamped cells, and neither checks the unstamped one.

**Limit:** prefers-color-scheme, which the kit does not ship. An unstamped document is dark on a light machine, and this gate treats that as intended (#250).

### Iconography

**Checks:** Allows a control to be wordless only for an action on the closed list, which a perfect aria-label cannot answer.

**Limit:** Whether the glyph is legible at its size. The stroke-width rule governs that for two families.

### React: DataTable

**Checks:** Checks that keyboard sorting keeps semantic column headers and announces sort direction.

**Limit:** Real browser focus and responsive layout; mounted tests use jsdom.

### React: CommandPalette

**Checks:** Compares the React palette with the vanilla factory shape by shape: panel, roles, groups and every row. It then presses keys on the mounted version, checking opening focus, return focus, arrows, Enter and refusal to run the destructive row.

**Limit:** The hotkey. Cmd+K belongs to the vanilla wiring; a React host binds its own key to the `open` prop it already owns.

**Limit:** Real browser focus and layout; these are jsdom mounts.

### React: Modal

**Checks:** Checks the mounted React modal’s focus and dismissal behaviour.

**Limit:** The scrim backdrop-filter and anything else only a browser composites.

### React: Drawer

**Checks:** Checks the mounted React drawer’s focus, Tab trap, Escape, scrim and close-button dismissal.

**Limit:** Real browser focus and transitions; jsdom runs neither.

### React: A11y

**Checks:** Applies the same axe contract to the React workspace through vitest and Testing Library.

**Limit:** The same two things axe cannot check: contrast and anything hidden by static markup.

### React: Field zoom

**Checks:** Checks the touch-zoom net across this workspace: mounts every React story, asks whether the net selector reaches each field and reads React source stylesheets for their own field size. An important field size there would override the net.

**Limit:** All limits of the vanilla gate remain: no media query is evaluated, Safari’s threshold is not measured and nothing is laid out.

### React: Contrast

**Checks:** Mounts every React story in both themes against the kit stylesheet and every React source stylesheet, substituting tokens per theme.

**Limit:** No state pass. All blind spots of the vanilla contrast gate also apply here.

## What nothing measures

<!-- section: ungated -->

These subjects are not covered.

### Keyboard beyond the topbar and tabs

**Note:** The dropdown, table, segmented control, feedback composer and app-shell navigation rows have no keyboard gate. The shell rail test presses the fold toggle and a group toggle, but nothing presses Tab through the rail. These areas are untested, not covered.

### Stacking

**Note:** The contrast gate calls this its largest single gap. Only a real browser closes it (#131).
