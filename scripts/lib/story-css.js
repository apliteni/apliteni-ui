/**
 * What CSS a story writes for itself, and whether the kit should have written it.
 *
 * why: AGENTS.md#changes — "Showcases and stories use kit classes; local CSS may only
 * place kit parts (layout glue), never restyle or re-implement them (#601)."
 *
 * A showcase is the kit on a page. CSS a story writes for itself is therefore one of
 * two things: it puts a kit part somewhere, or it does a kit part's job again. The
 * second kind is what #601 calls a shadow kit, and it is a defect twice over — the
 * showcase stops demonstrating the kit, and the gap it papers over never reaches an
 * issue.
 *
 * Every declaration a story carries gets exactly one verdict:
 *
 *   glue       the story's own selector, placing something: display, grid, gap,
 *              margin, width, position… It is free, up to a count.
 *   placement  the same placement, but written onto a kit class. Allowed only from an
 *              allow-list, because naming `.ui-card` in a story is the one case where
 *              a reviewer has to agree the kit offers no other way.
 *   shadow     paint, type or motion — background, border, colour, font, shadow,
 *              transition — wherever it is written, and a kit token re-declared.
 *              There is no allow-list: the kit owns how its parts look.
 *   unknown    something this file cannot sort: a property that is in neither
 *              vocabulary, or a style block it cannot read. Reported as a failure,
 *              never passed over — a gate that passes what it cannot classify is a
 *              gate with a hole in it, and so is a gate that measures an unreadable
 *              style block as zero declarations.
 *
 * Both vocabularies are closed lists of property names. A property in neither is
 * `unknown` wherever it is written, kit selector or not: a pattern wide enough to guess
 * at a name it has never seen guesses wrong, and `column-rule: 8px solid red` is the
 * proof — a paint declaration that a `column-*` pattern called placement.
 *
 * Both workspaces read with this module and keep their own subjects, allow-list and
 * recorded figures, which is what AGENTS.md#verification asks for.
 *
 * LIMITS, so a pass is not read as more than it is:
 *  - Source, not paint. This reads the text of a `<style>` block, a story-owned
 *    stylesheet and a `style=` attribute. A declaration set through `element.style.x = …`
 *    is not seen at all. One assembled at run time out of string pieces is not read
 *    either, but it is reported as unreadable rather than measured as nothing.
 *  - A `style=` attribute's subject is the `class` its own tag spells out literally,
 *    wherever in the tag it is written. A className built by an expression reads as no
 *    class at all, so a placement onto a kit class written that way lands in `glue`
 *    rather than in the allow-list.
 *  - A style object is read the way React reads it. `style={name}`, `style={name.key}`
 *    and a `...spread` of either are followed to the `const` object literal in the same
 *    file, and a later key answers an earlier one of the same name — so
 *    `{ ...stack, gap: 14 }` is every property `stack` holds with one of them answered.
 *    The list counts at every tag that uses it: an object two tags share is measured
 *    twice, because it is two tags' worth of declarations on the page.
 *  - A name this file binds twice is resolved to neither of the two. Which one paints is
 *    a question about scope, and a reader that guesses measures the wrong object in
 *    silence, so the style is reported as unreadable instead. So is a spread of a call,
 *    a parameter or a conditional.
 *  - A `<style>` block's text has to be in the source: the text in the tag, a string
 *    literal, or a name bound to one literal in the same file. A concatenation, an
 *    interpolated `${…}` and an unresolved name are reported as unreadable.
 *  - One property, one verdict, by name. `border: 0` reads as paint because `border`
 *    paints; a story that clears one is still deciding how a part looks.
 *  - Specificity is not resolved, and neither is the cascade inside one block: a story
 *    rule that loses still counts, and two CSS declarations of one property count twice.
 *    Both were written to win, and a reader reads them as the story's intent. A style
 *    object is the one exception, because one key is one declaration however many times
 *    the source writes it.
 *  - Nesting and at-rules are read to any depth, and a nested selector is written out
 *    against its parent, so `.ui-card { & > b { … } }` is a placement onto `.ui-card`.
 *    `@media` bodies are read, their conditions are not: a glue declaration inside a
 *    breakpoint costs the same as one outside it. An at-rule this file does not know is
 *    reported rather than walked.
 *  - The stylesheet reading is a parser. The JavaScript around it is not: this reads text
 *    rather than a syntax tree, so a `/` opening a regular expression reads as division
 *    and an apostrophe in JSX text reads as the start of a string. Either can blank a
 *    region that is not a string — and when it does, the style it covers reports as
 *    unreadable rather than as empty, so the result is a gate failure and not a pass.
 *    Each gate's recorded declaration total is a lower bound for the same reason: a
 *    reading that stops reaching source fails before it passes.
 */

/* Placement: where a box sits, how big it is, and how its children are dealt. Nothing
 * here decides how anything looks. `pointer-events` and `touch-action` are in because
 * they place a hit area; `border-collapse` and `border-spacing` are in because they are
 * table geometry rather than the border's paint; the `scroll-*` entries are the ones
 * that measure or snap, not the one that animates.
 *
 * Spelled out, every one of them. No `column-[\w-]+`: that pattern also answered for
 * `column-rule-color`, which paints. */
const GLUE = new RegExp(`^(?:${[
  'display',
  'flex', 'flex-(?:basis|direction|flow|grow|shrink|wrap)',
  'grid', 'grid-area', 'grid-template(?:-(?:areas|columns|rows))?',
  'grid-auto-(?:columns|flow|rows)',
  'grid-(?:row|column)(?:-(?:start|end))?',
  'gap', 'row-gap', 'column-gap',
  'columns', 'column-(?:count|fill|span|width)',
  'align-(?:content|items|self)', 'justify-(?:content|items|self)', 'place-(?:content|items|self)',
  'order', 'margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  'padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  '(?:min-|max-)?(?:width|height)', '(?:inline|block)-size', '(?:min|max)-(?:inline|block)-size',
  'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'inset', 'inset-(?:block|inline)(?:-(?:start|end))?',
  'overflow(?:-[xy]|-wrap)?', 'box-sizing', 'aspect-ratio', 'float', 'clear',
  'white-space', 'text-wrap(?:-(?:mode|style))?', 'word-break', 'hyphens',
  'text-align(?:-last)?', 'vertical-align',
  'scroll-margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  'scroll-padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  'scroll-snap-(?:align|stop|type)',
  'overscroll-behavior(?:-[xy])?', 'writing-mode', 'isolation',
  'contain', 'container-type', 'container-name', 'touch-action', 'pointer-events',
  'resize', 'table-layout', 'border-collapse', 'border-spacing', 'caption-side',
  'list-style-position', 'counter-(?:reset|increment|set)',
].join('|')})$`);

/* Paint, type and motion: how a thing looks and how it moves. A story writing any of
 * these is deciding something the kit decides. `column-rule*` is here because a rule
 * drawn between columns is a border by another name; `scroll-behavior` and
 * `scroll-timeline*` are here because smooth scrolling is motion. */
const PAINT = new RegExp(`^(?:${[
  'background(?:-[\\w-]+)?', '-webkit-background-clip',
  'border(?!-collapse|-spacing)(?:-[\\w-]+)?', 'border-radius', 'box-shadow',
  'column-rule(?:-(?:color|style|width))?',
  'color', '-webkit-text-fill-color', 'caret-color', 'accent-color',
  'outline(?:-[\\w-]+)?', 'font(?:-[\\w-]+)?', 'letter-spacing', 'word-spacing',
  'line-height', 'text-(?:decoration|transform|shadow|indent|emphasis)(?:-[\\w-]+)?',
  'text-underline-offset', 'opacity', 'filter', 'backdrop-filter', 'mix-blend-mode',
  'transition(?:-[\\w-]+)?', 'animation(?:-[\\w-]+)?', 'transform(?:-[\\w-]+)?',
  'scroll-behavior', 'scroll-timeline(?:-(?:axis|name))?',
  'rotate', 'scale', 'translate', 'perspective', 'zoom', 'will-change',
  'cursor', 'appearance', '-webkit-appearance', 'user-select', '-webkit-user-select',
  'visibility', 'content', 'quotes', 'list-style(?:-(?:type|image))?',
  'stroke(?:-[\\w-]+)?', 'fill(?:-[\\w-]+)?', 'paint-order', 'vector-effect',
  'clip-path', 'mask(?:-[\\w-]+)?', 'object-(?:fit|position)', 'tab-size',
].join('|')})$`);

/** A kit class, the only naming the kit publishes. */
export const KIT_CLASS = /\.ui-[A-Za-z0-9_-]+/;

/* The custom properties the kit asks a consumer to set. `--ring-gap` and `--ring` are
 * docs/foundations.md#the-focus-ring: a surface of its own has to say what colour its
 * gap sits on. `--ui-table-height` is the `var(--ui-table-height, 70vh)` fallback in
 * src/styles/table.css, which exists to be answered. Setting one of these is using the
 * kit, not overriding it. */
export const KNOBS = new Set(['--ring', '--ring-gap', '--ring-gap-width', '--ui-table-height']);

/** Every `--name` the kit's token sheets declare, read from their text. */
export function kitTokenNames(...sheets) {
  const names = new Set();
  for (const css of sheets) for (const [, name] of css.matchAll(/(--[\w-]+)\s*:/g)) names.add(name);
  return names;
}

/** A value that ends up as a colour, a gradient or a cast. */
const COLOURISH = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(|gradient\(|\bcurrentcolor\b/i;

/**
 * The one verdict for one declaration.
 *
 * The vocabularies are consulted before the selector is: a property neither list knows
 * is `unknown` even on a kit class, because "glue onto a kit part" is a claim about the
 * property, and the allow-list grants a placement, not an exemption.
 *
 * @param {{selector: string, property: string, value: string}} decl
 * @param {Set<string>} kitTokens  every token name the kit declares
 * @returns {'glue'|'placement'|'shadow'|'unknown'}
 */
export function classify({ selector, property, value }, kitTokens) {
  if (property.startsWith('--')) {
    if (KNOBS.has(property)) return 'glue';
    if (kitTokens.has(property)) return 'shadow';
    // A story's own name. It is a shadow token when it holds a colour, and glue when
    // it holds a length: `--lx-hue: #7c5cff` is paint waiting for a var() to spend it.
    return COLOURISH.test(value) ? 'shadow' : 'glue';
  }
  if (PAINT.test(property)) return 'shadow';
  if (!GLUE.test(property)) return 'unknown';
  // Each comma-separated subject is its own selector; one naming a kit class is enough.
  return selector.split(',').some((one) => KIT_CLASS.test(one)) ? 'placement' : 'glue';
}

/* ---- reading the source ------------------------------------------------- */

const lineAt = (src, index) => src.slice(0, index).split('\n').length;

/**
 * The index just past the comment or string that opens at `at`, or -1 when nothing
 * opens there. A template literal's `${…}` is walked rather than scanned over, so a
 * nested template inside one ends at its own backtick and not at the outer one — which
 * is how most of the vanilla stories are written.
 *
 * @param {'css'|'js'} lang  JS also ends a comment at a newline and quotes with a backtick
 */
function literalEnd(src, at, lang) {
  const ch = src[at];
  if (ch === '/' && src[at + 1] === '*') {
    const close = src.indexOf('*/', at + 2);
    return close < 0 ? src.length : close + 2;
  }
  if (lang === 'js' && ch === '/' && src[at + 1] === '/') {
    const close = src.indexOf('\n', at + 2);
    return close < 0 ? src.length : close;
  }
  if (ch !== '"' && ch !== "'" && !(lang === 'js' && ch === '`')) return -1;
  for (let i = at + 1; i < src.length; i += 1) {
    if (src[i] === '\\') { i += 1; continue; }
    if (src[i] === ch) return i + 1;
    if (ch === '`' && src[i] === '$' && src[i + 1] === '{') i = interpolationEnd(src, i + 2) - 1;
  }
  return src.length;
}

/** The index just past the `}` that closes a `${` whose contents begin at `at`. */
function interpolationEnd(src, at) {
  let depth = 1;
  for (let i = at; i < src.length; i += 1) {
    const end = literalEnd(src, i, 'js');
    if (end >= 0) { i = end - 1; continue; }
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) return i + 1; }
  }
  return src.length;
}

/**
 * One pass over a source, giving the two readings everything below works from. Both are
 * the same length as `src`, with every newline kept, so an index into either is an index
 * into the source and a line number stays true.
 *
 *   clean  the comments blanked, the strings left alone. Every piece of text this module
 *          reports or measures is a slice of it, so a comment cannot reach a selector.
 *   mask   the comments and the inside of every string blanked. Every bracket balanced
 *          and every list split below is done on it, so a `}` inside `/* } *\/`, a `;`
 *          inside `url(a;b)` and a brace inside a string are not syntax.
 *
 * A string is blanked only in `mask`: a vanilla story's whole markup, `<style>` blocks
 * and all, is the inside of one template literal.
 *
 * @param {'css'|'js'} lang
 */
function scan(src, lang) {
  const clean = src.split('');
  const mask = src.split('');
  for (let i = 0; i < src.length; i += 1) {
    const end = literalEnd(src, i, lang);
    if (end < 0) continue;
    const comment = src[i] === '/';
    for (let j = comment ? i : i + 1; j < (comment ? end : end - 1); j += 1) {
      if (src[j] === '\n') continue;
      mask[j] = ' ';
      if (comment) clean[j] = ' ';
    }
    i = end - 1;
  }
  return { clean: clean.join(''), mask: mask.join('') };
}

/** The text inside the balanced `{…}` that opens at `at`, or null when it never closes. */
function braced(src, mask, at) {
  let depth = 0;
  for (let i = at; i < mask.length; i += 1) {
    if (mask[i] === '{') depth += 1;
    else if (mask[i] === '}') { depth -= 1; if (depth === 0) return src.slice(at + 1, i); }
  }
  return null;
}

/** The same, for a fragment this has to scan first. */
const bracedIn = (text, lang, at = text.indexOf('{')) => (at < 0 ? null
  : braced(text, scan(text, lang).mask, at));

/**
 * Split a list into its top-level chunks on `mask`, so a separator inside brackets, a
 * string or a comment is not one. The chunks come back as slices of `text`.
 */
function chunks(text, mask, separator) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < mask.length; i += 1) {
    const ch = mask[i];
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
    else if (ch === separator && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts;
}

/** One CSS declaration list, split on `;`, with its comments gone. */
function cssDeclarations(text) {
  const { clean, mask } = scan(text, 'css');
  return chunks(clean, mask, ';').map(named).filter(Boolean);
}

/**
 * `prop: value` → `{property, value}`, with a JSX `maxWidth` spelled as CSS.
 *
 * A blank chunk is nothing. Anything else that does not read as a declaration comes
 * back as `{unreadable}` rather than as nothing, so the gate reports it: a chunk
 * dropped in silence is a declaration nobody measured.
 */
function named(text) {
  if (!text.trim()) return null;
  const at = text.indexOf(':');
  const property = at < 0 ? '' : text.slice(0, at).trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  if (!property || /[\s(){}[\]:;'"]/.test(property)) return { unreadable: brief(text) };
  return { property, value: text.slice(at + 1).trim() };
}

/** One line of source, short enough to sit in a problem report. */
const brief = (text) => {
  const one = text.trim().replace(/\s+/g, ' ');
  return one.length > 72 ? `${one.slice(0, 71)}…` : one;
};

/* ---- the names a story binds -------------------------------------------- */

/**
 * The object literals a story binds by name: `const row = {…}`. A `style={row}` is an
 * ordinary list of source declarations that happens to be written a few lines up, so it
 * is read there rather than counted as nothing.
 *
 * A name bound twice in one file is recorded as ambiguous and never resolved to the
 * first of the two. Which one paints is a question about scope, and a reader that
 * guesses measures the wrong object in silence — the shape of a bypass, not of a limit.
 *
 * @returns {Map<string, {body: string}|{ambiguous: true}>}
 */
function objectBindings(src, mask) {
  const bound = new Map();
  for (const m of mask.matchAll(/(?<![\w$])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;{]*)?=\s*\{/g)) {
    const body = braced(src, mask, m.index + m[0].length - 1);
    if (bound.has(m[1]) || body == null) bound.set(m[1], { ambiguous: true });
    else bound.set(m[1], { body });
  }
  return bound;
}

/**
 * The strings a story binds by name: `const CSS = '…'`, in any of the three quotes.
 * One literal of plain text and nothing else — a concatenation, a `${…}` interpolated
 * into it, and a name bound twice are all recorded as ambiguous, because a stylesheet
 * assembled at run time is not source and must not read as an empty one.
 *
 * @returns {Map<string, {text: string, at: number}|{ambiguous: true}>}
 */
function stringBindings(src, mask) {
  const bound = new Map();
  for (const m of mask.matchAll(/(?<![\w$])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;{]*)?=\s*(?=['"`])/g)) {
    const at = m.index + m[0].length;
    const end = literalEnd(src, at, 'js');
    const text = stringValue(src.slice(at, end));
    const settled = text != null && /^\s*(?:as\s+const\s*)?[;\n]/.test(mask.slice(end));
    if (bound.has(m[1]) || !settled) bound.set(m[1], { ambiguous: true });
    else bound.set(m[1], { text, at: at + 1 });
  }
  return bound;
}

/** The text one string literal holds, or null when it is not one literal of plain text. */
function stringValue(raw) {
  const quote = raw[0];
  if (raw.length < 2 || raw[raw.length - 1] !== quote) return null;
  if (quote === '`' && raw.includes('${')) return null;
  return raw.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\(.)/g, '$1');
}

/** One `key: {…}` member of a bound object, by key, or null. */
function memberBody(body, key) {
  const { clean, mask } = scan(body, 'js');
  for (const chunk of chunks(clean, mask, ',')) {
    const at = chunk.indexOf(':');
    if (at < 0) continue;
    const name = chunk.slice(0, at).trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    const value = chunk.slice(at + 1).trim();
    if (name === key && value.startsWith('{')) return bracedIn(value, 'js', 0);
  }
  return null;
}

/**
 * The object body an expression stands for: a literal written there, a name bound in
 * this file, or one `name.key` member of one. Null for anything else — a call, a
 * parameter, a conditional, a name bound twice, or a name that spreads itself.
 *
 * @returns {{body: string, names: string[]}|null}
 */
function resolveObject(expression, scope, seen) {
  const text = expression.trim();
  if (text.startsWith('{')) {
    const body = bracedIn(text, 'js', 0);
    return body == null ? null : { body, names: [] };
  }
  const member = /^([A-Za-z_$][\w$]*)\.([\w$]+)$/.exec(text);
  const name = /^[A-Za-z_$][\w$]*$/.test(text) ? text : member?.[1];
  if (!name || seen.includes(name)) return null;
  const bound = scope.get(name);
  if (!bound || bound.ambiguous) return null;
  const body = member ? memberBody(bound.body, member[2]) : bound.body;
  return body == null ? null : { body, names: [name] };
}

/**
 * A style object read the way React reads it: a `...spread` followed into the object it
 * names, and a later key replacing an earlier one of the same name. So
 * `{ ...stack, gap: 14 }` is every property `stack` holds with one of them answered —
 * which is the declaration list the element really carries, and the one a reader of the
 * story sees.
 *
 * A spread this file cannot settle is one unreadable declaration and never a skipped
 * one: skipping it measured the paint it carries as zero.
 */
function objectDeclarations(body, scope, seen = []) {
  const byProperty = new Map();
  const unreadable = [];
  const take = (d) => { if (d.property) byProperty.set(d.property, d); else unreadable.push(d); };
  const { clean, mask } = scan(body, 'js');
  for (const chunk of chunks(clean, mask, ',')) {
    const text = chunk.trim();
    if (!text) continue;
    if (!text.startsWith('...')) { const d = named(chunk); if (d) take(d); continue; }
    const spread = resolveObject(text.slice(3), scope, seen);
    if (!spread) { unreadable.push({ unreadable: brief(text) }); continue; }
    for (const d of objectDeclarations(spread.body, scope, [...seen, ...spread.names])) take(d);
  }
  return [...byProperty.values(), ...unreadable];
}

/* ---- the stylesheets a story carries ------------------------------------ */

/**
 * Every stylesheet a story source carries: each `<style>` block's own text, and the
 * string behind a `<style>{CSS}</style>` reference — a template literal, a quoted
 * string, or a name bound to one in the same file.
 *
 * A block whose text this cannot settle comes back as `{unreadable}` and is reported,
 * never measured as zero. A `<style>` a gate reads as empty is a sheet that can paint
 * whatever it likes, so an unresolved name, a concatenation, a name bound twice and a
 * `${…}` interpolated into the CSS itself all fail here.
 *
 * @returns {Array<{css?: string, unreadable?: string, line: number}>}
 */
export function styleSheets(source) {
  const { clean: src, mask } = scan(source, 'js');
  const strings = stringBindings(src, mask);
  const found = [];
  for (const m of src.matchAll(/<style[^>]*>/g)) {
    const from = m.index + m[0].length;
    const close = src.indexOf('</style>', from);
    const line = lineAt(src, from);
    if (close < 0) { found.push({ unreadable: brief(src.slice(from, from + 80)), line }); continue; }
    const body = src.slice(from, close);
    if (!body.trim()) continue;

    // A JSX expression container: `<style>{CSS}</style>`, `<style>{`…`}</style>`.
    if (body.trimStart().startsWith('{')) {
      const opens = from + body.indexOf('{');
      const inner = braced(src, mask, opens);
      const sheet = inner == null ? null : sheetText(inner, opens + 1, strings);
      found.push(sheet ? { css: sheet.css, line: lineAt(src, sheet.at) }
        : { unreadable: brief(body), line });
      continue;
    }

    // Plain text inside the tag — which, in a vanilla story, is text inside a template
    // literal. A `${…}` in it means the CSS is assembled at run time.
    if (body.includes('${')) { found.push({ unreadable: brief(body), line }); continue; }
    found.push({ css: body, line });
  }
  return found;
}

/**
 * The CSS a `<style>{…}</style>` expression stands for, and where that text begins —
 * `from` is where the expression itself begins, so a story with two of them reports the
 * right line for each.
 */
function sheetText(expression, from, strings) {
  const at = expression.search(/\S/);
  if (at < 0) return null;
  const text = expression.slice(at).trimEnd();
  const offset = from + at;
  if (/^['"`]/.test(text)) {
    const end = literalEnd(text, 0, 'js');
    const css = end === text.length ? stringValue(text) : null;
    return css == null ? null : { css, at: offset + 1 };
  }
  if (!/^[A-Za-z_$][\w$]*$/.test(text)) return null;
  const bound = strings.get(text);
  return !bound || bound.ambiguous ? null : { css: bound.text, at: bound.at };
}

/* ---- the rules in one stylesheet ---------------------------------------- */

/* The at-rules that wrap rules in a condition, and so add nothing of their own. */
const CONDITION_AT = /^@(?:media|supports|container|layer|scope)(?![\w-])/;
/* The at-rules whose block is a declaration list with the at-rule as its subject. */
const DECLARATION_AT = /^@(?:(?:-[a-z]+-)?keyframes|font-face|page|property|counter-style|font-palette-values)(?![\w-])/;

/**
 * A stylesheet read as a tree and flattened to rules: nesting at any depth, at-rules at
 * any depth, and nothing left over.
 *
 * Nothing left over is the point. Text this cannot place — a declaration outside any
 * rule, a stray brace, an at-rule it does not know — comes back as an unreadable
 * declaration rather than being dropped, because a sheet measured as fewer declarations
 * than it holds is a sheet the gate does not gate. The reading it replaced matched the
 * innermost `{…}` of a nested rule and dropped the outer rule's own declarations.
 *
 * A nested rule's selector is composed with its parent's, `&` taking the parent's place,
 * so `.ui-card { & > b { margin: 0 } }` reads as a placement onto `.ui-card`.
 *
 * @returns {Array<{selector: string, decls: object[], line: number, media: string|null}>}
 */
export function rulesIn(sheet, firstLine = 1) {
  const { clean: css, mask } = scan(sheet, 'css');
  const lineOf = (index) => firstLine + css.slice(0, index).split('\n').length - 1;
  const firstWord = (index, text) => index + text.length - text.trimStart().length;
  const rules = [];

  /** One `{…}` body: its own declarations, and a recursion per rule inside it. */
  const block = (from, to, selector, conditions) => {
    const decls = [];
    let start = from;
    let at = -1;
    const keep = (text, index) => {
      if (!text.trim()) return;
      // A declaration outside every rule cannot paint anything and is not a declaration.
      decls.push(...(selector ? cssDeclarations(text) : [{ unreadable: brief(text) }]));
      if (at < 0) at = firstWord(index, text);
    };
    // Bracket depth, because none of `;`, `{` and `}` is syntax inside `url(a;b)`, a
    // `:is(…)` list or an attribute selector.
    let depth = 0;
    for (let i = from; i < to; i += 1) {
      const ch = mask[i];
      if ('(['.includes(ch)) { depth += 1; continue; }
      if (')]'.includes(ch)) { depth = Math.max(0, depth - 1); continue; }
      if (depth > 0) continue;
      if (ch === '{') {
        const body = braced(css, mask, i);
        const end = body == null ? to : i + 1 + body.length;
        child(start, i, end, selector, conditions);
        i = end;
        start = i + 1;
        continue;
      }
      if (ch === ';') { keep(css.slice(start, i), start); start = i + 1; continue; }
      if (ch === '}') { keep(`${css.slice(start, i)}}`, start); start = i + 1; }
    }
    keep(css.slice(start, to), start);
    if (!decls.length) return;
    rules.push({
      selector: selector || '(stylesheet)',
      decls,
      line: lineOf(at < 0 ? from : at),
      media: conditions.length ? conditions.join(' / ') : null,
    });
  };

  /** One rule inside a block: `preludeFrom..preludeTo` names it, `preludeTo + 1..to` is it. */
  const child = (preludeFrom, preludeTo, to, parent, conditions) => {
    const prelude = css.slice(preludeFrom, preludeTo);
    const text = prelude.trim();
    const line = lineOf(firstWord(preludeFrom, prelude));
    const unknown = (shown) => rules.push({
      selector: parent || '(stylesheet)', decls: [{ unreadable: brief(shown) }], line, media: null,
    });
    if (!text) { unknown(`{ ${css.slice(preludeTo + 1, to)} }`); return; }
    if (!text.startsWith('@')) { block(preludeTo + 1, to, compose(parent, text), conditions); return; }
    // `@media` and its kin add a condition and no subject; `@font-face` and `@keyframes`
    // are the subject themselves. An at-rule in neither list is reported, not walked.
    if (CONDITION_AT.test(text)) {
      block(preludeTo + 1, to, parent, [...conditions, text.replace(/^@media\s*/, '')]);
    } else if (DECLARATION_AT.test(text)) {
      block(preludeTo + 1, to, text, conditions);
    } else {
      unknown(`${text} { … }`);
    }
  };

  block(0, css.length, '', []);
  return rules;
}

/**
 * A nested selector written out against the one it sits in, so the subject a declaration
 * lands on is the one it lands on in the browser. A parent of more than one selector
 * becomes `:is(a, b)`, which is what CSS nesting does with it.
 */
function compose(parent, selector) {
  if (!parent) return selector.replace(/&/g, '').trim() || selector;
  const { clean, mask } = scan(selector, 'css');
  const parts = chunks(parent, scan(parent, 'css').mask, ',');
  const subject = parts.length > 1 ? `:is(${parent})` : parent;
  return chunks(clean, mask, ',').map((one) => {
    const part = one.trim();
    return part.includes('&') ? part.replace(/&/g, subject) : `${subject} ${part}`;
  }).join(', ');
}

/* ---- the inline styles a story writes ----------------------------------- */

/**
 * The opening tag a `style=` sits in: from its `<` to the `>` that closes it, skipping
 * quoted text and bracketed expressions so a `>` inside one does not end it early.
 * The whole tag, because `class` is as often written after `style` as before it.
 */
function openTag(src, at) {
  const open = src.lastIndexOf('<', at);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const end = literalEnd(src, i, 'js');
    if (end >= 0) { i = end - 1; continue; }
    const ch = src[i];
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    else if (ch === '>' && depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

/** The subject of an inline style: the classes its own tag spells out, or `(element)`. */
function classesIn(tag) {
  const m = /(?<![\w-])class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*'([^']*)'\s*\}|\{\s*"([^"]*)"\s*\}|\{\s*`([^`$]*)`\s*\})/.exec(tag);
  const names = (m ? (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]) : '').split(/\s+/).filter(Boolean);
  return names.length ? names.map((c) => `.${c}`).join('') : '(element)';
}

/**
 * Every `style=` attribute and `style={…}` prop in a story source, with the kit classes
 * of the tag it sits on. Both quote forms, either attribute order, comments, a JSX
 * object with brackets of its own, a name bound to one, and a spread of either. A block
 * this cannot read is reported as unreadable and never as empty — see LIMITS.
 *
 * @returns {Array<{selector: string, decls: Array<{property?: string, value?: string, unreadable?: string}>, line: number}>}
 */
export function inlineStyles(source) {
  const { clean: src, mask } = scan(source, 'js');
  const scope = objectBindings(src, mask);
  const found = [];
  for (const m of src.matchAll(/(?<![\w$-])style\s*=\s*/g)) {
    const at = m.index + m[0].length;
    const selector = classesIn(openTag(src, m.index));
    const line = lineAt(src, m.index);
    const unreadable = (text) => found.push({ selector, line, decls: [{ unreadable: brief(text) }] });
    const opener = src[at];

    if (opener === '"' || opener === "'") {
      const end = src.indexOf(opener, at + 1);
      if (end < 0) unreadable(src.slice(at, at + 80));
      else found.push({ selector, line, decls: cssDeclarations(src.slice(at + 1, end)) });
      continue;
    }

    if (opener !== '{') { unreadable(src.slice(at, at + 80)); continue; }

    const inner = braced(src, mask, at);
    if (inner == null) { unreadable(src.slice(at, at + 80)); continue; }
    const object = resolveObject(inner, scope, []);
    if (!object) unreadable(inner);
    else found.push({ selector, line, decls: objectDeclarations(object.body, scope, object.names) });
  }
  return found;
}
/* ---- one story's measurement -------------------------------------------- */

/**
 * Every declaration one story file writes, sorted.
 *
 * @param {string} file       the path, as the allow-list and the recorded figures key it
 * @param {string} src        its source, or the stylesheet's text when `file` is a `.css`
 * @param {Set<string>} kitTokens
 * @returns {{file: string, glue: number, placements: object[], shadows: object[], unknowns: object[], total: number}}
 */
export function measureStory(file, src, kitTokens) {
  const decls = [];
  if (file.endsWith('.css')) {
    for (const rule of rulesIn(src, 1)) {
      for (const d of rule.decls) decls.push({ ...d, selector: rule.selector, line: rule.line, media: rule.media });
    }
  } else {
    for (const sheet of styleSheets(src)) {
      if (sheet.css == null) {
        decls.push({ unreadable: sheet.unreadable, selector: '(stylesheet)', line: sheet.line, media: null });
        continue;
      }
      for (const rule of rulesIn(sheet.css, sheet.line)) {
        for (const d of rule.decls) decls.push({ ...d, selector: rule.selector, line: rule.line, media: rule.media });
      }
    }
    for (const inline of inlineStyles(src)) {
      for (const d of inline.decls) decls.push({ ...d, selector: inline.selector, line: inline.line, media: null });
    }
  }
  const sorted = decls.map((d) => ({
    ...d, file, verdict: d.unreadable ? 'unknown' : classify(d, kitTokens),
  }));
  return {
    file,
    total: sorted.length,
    glue: sorted.filter((d) => d.verdict === 'glue').length,
    placements: sorted.filter((d) => d.verdict === 'placement'),
    shadows: sorted.filter((d) => d.verdict === 'shadow'),
    unknowns: sorted.filter((d) => d.verdict === 'unknown'),
  };
}

/** `file:line  .sel { prop: value }`, the one line a reader needs to find it. */
export const show = (d) => `${d.file}:${d.line}  ${d.selector} `
  + `{ ${d.unreadable ?? `${d.property}: ${d.value}`} }${d.media ? ` @media ${d.media}` : ''}`;

/* ---- the judgement ------------------------------------------------------ */

/**
 * What is wrong with a collection of stories, as lines a reader can act on without
 * opening this file.
 *
 * `allowed` is the layout-glue allow-list: `{'file|selector': 'the reason'}`. Only a
 * placement can be allowed, and only onto the selector written down — a reason covers
 * one kit class in one story, not a habit.
 *
 * `recorded` is what each story carries today: `{file: {shadow, glue}}`, either figure
 * optional. A recorded story may stay as it is; it may not grow, and a story that comes
 * under its figure has to record the smaller one so it cannot grow back. Same contract
 * as scripts/word-budget.mjs.
 *
 * @param {object[]} measured  from measureStory()
 * @param {{allowed: Record<string,string>, recorded: Record<string,{shadow?: number, glue?: number}>, ceiling: number, where: string}} against
 * @returns {string[]}
 */
export function problemsIn(measured, { allowed, recorded, ceiling, where }) {
  const problems = [];
  const usedKeys = new Set();
  const seen = new Set();

  for (const story of measured) {
    seen.add(story.file);

    for (const d of story.unknowns) {
      problems.push(d.unreadable
        ? `${show(d)}\n    is a style block ${where} cannot read, so none of it was measured. `
          + 'Spell the declarations out — `style="a: b"`, `style={{ a: b }}`, a `const` object '
          + 'literal in this file, or a `<style>` rule — because a block a gate reads as empty '
          + 'is a block it does not gate.'
        : `${show(d)}\n    \`${d.property}\` is a property ${where} does not sort. Put it `
          + 'in GLUE or PAINT in scripts/lib/story-css.js and say which it is; a gate that passes '
          + 'what it cannot classify is a gate with a hole in it.');
    }

    for (const d of story.placements) {
      const key = `${d.file}|${d.selector}`;
      usedKeys.add(key);
      if (allowed[key]) continue;
      problems.push(`${show(d)}\n    places a kit part by naming its own class, with no reason on `
        + `record. Either let the kit place it — a factory argument, a modifier, a wrapper of your `
        + `own — or add\n      '${key}': 'why the kit offers no other way',\n    to the allow-list `
        + `beside this gate.`);
    }

    const carried = story.shadows.length;
    const figure = recorded[story.file]?.shadow;
    if (carried === 0) {
      if (figure != null) {
        problems.push(`${story.file}: writes no paint, type or motion of its own — delete its `
          + `\`shadow\` figure from RECORDED beside this gate.`);
      }
    } else if (figure == null) {
      problems.push(`${story.file}: ${carried} declaration(s) paint, type or animate what the kit `
        + `owns:\n      ${story.shadows.map(show).join('\n      ')}\n    A showcase shows the kit. `
        + `Use the kit class, or open an issue for the part that is missing — there is no `
        + `allow-list for this one.`);
    } else if (carried > figure) {
      problems.push(`${story.file}: ${carried} shadow declaration(s), ${carried - figure} more than `
        + `the ${figure} recorded. A story already over may not grow:\n      `
        + `${story.shadows.map(show).join('\n      ')}`);
    } else if (carried < figure) {
      problems.push(`${story.file}: ${carried} shadow declaration(s), down from the ${figure} `
        + `recorded — record ${carried} beside this gate so it cannot grow back.`);
    }

    if (story.glue > ceiling) {
      const glued = recorded[story.file]?.glue;
      if (glued == null) {
        problems.push(`${story.file}: ${story.glue} layout-glue declarations, over the ceiling of `
          + `${ceiling}. Past that a story is laying out a page rather than placing kit parts — `
          + `compose it from kit parts, or record the figure with the reason it stands.`);
      } else if (story.glue > glued) {
        problems.push(`${story.file}: ${story.glue} layout-glue declarations, ${story.glue - glued} `
          + `more than the ${glued} recorded. A story over the ceiling may not grow.`);
      } else if (story.glue < glued) {
        problems.push(`${story.file}: ${story.glue} layout-glue declarations, down from the ${glued} `
          + `recorded — record ${story.glue} beside this gate so it cannot grow back.`);
      }
    } else if (recorded[story.file]?.glue != null) {
      problems.push(`${story.file}: ${story.glue} layout-glue declarations, within the ceiling of `
        + `${ceiling} — delete its \`glue\` figure from RECORDED beside this gate.`);
    }
  }

  for (const key of Object.keys(allowed)) {
    if (!usedKeys.has(key)) {
      problems.push(`'${key}' is allow-listed and nothing matches it any more — delete the entry. `
        + 'A dead reason reads as a rule somebody still relies on.');
    }
  }
  for (const file of Object.keys(recorded)) {
    if (!seen.has(file)) {
      problems.push(`${file} is recorded and is not among the subjects — delete its line from `
        + 'RECORDED beside this gate.');
    }
  }

  return problems;
}
