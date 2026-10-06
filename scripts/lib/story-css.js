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
 *   unknown    a property this file does not sort. Reported as a failure, never
 *              passed over: a gate that ignores what it cannot classify is a gate with
 *              a hole in it.
 *
 * Both workspaces read with this module and keep their own subjects, allow-list and
 * recorded figures, which is what AGENTS.md#verification asks for.
 *
 * LIMITS, so a pass is not read as more than it is:
 *  - Source, not paint. This reads the text of a `<style>` block, a story-only
 *    stylesheet and a `style=` attribute. A declaration assembled at run time out of
 *    string pieces, or set through `element.style.x = …`, is not seen.
 *  - A `style=` attribute's subject is the `class` the same tag spells out literally.
 *    A className built by an expression reads as no class at all, so a placement onto
 *    a kit class written that way lands in `glue` rather than in the allow-list.
 *  - One property, one verdict, by name. `border: 0` reads as paint because `border`
 *    paints; a story that clears one is still deciding how a part looks.
 *  - Specificity is not resolved. A story rule that loses the cascade still counts: it
 *    was written to win, and a reader reads it as the story's intent.
 *  - `@media` bodies are read, their conditions are not. A glue declaration inside a
 *    breakpoint costs the same as one outside it.
 */

/* Placement: where a box sits, how big it is, and how its children are dealt. Nothing
 * here decides how anything looks. `pointer-events` and `touch-action` are in because
 * they place a hit area; `border-collapse` and `border-spacing` are in because they are
 * table geometry rather than the border's paint. */
const GLUE = new RegExp(`^(?:${[
  'display', 'flex', 'flex-(?:basis|direction|flow|grow|shrink|wrap)',
  'grid', 'grid-[\\w-]+', 'gap', 'row-gap', 'column-gap', 'columns', 'column-[\\w-]+',
  'align-(?:content|items|self)', 'justify-(?:content|items|self)', 'place-(?:content|items|self)',
  'order', 'margin(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  'padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?',
  '(?:min-|max-)?(?:width|height)', '(?:inline|block)-size', '(?:min|max)-(?:inline|block)-size',
  'position', 'top', 'right', 'bottom', 'left', 'inset(?:-[\\w-]+)?', 'z-index',
  'overflow(?:-[xy]|-wrap)?', 'box-sizing', 'aspect-ratio', 'float', 'clear',
  'white-space', 'text-wrap', 'word-break', 'hyphens', 'text-align', 'vertical-align',
  'scroll-[\\w-]+', 'overscroll-behavior(?:-[xy])?', 'writing-mode', 'isolation',
  'contain', 'container-type', 'container-name', 'touch-action', 'pointer-events',
  'resize', 'table-layout', 'border-collapse', 'border-spacing', 'caption-side',
  'list-style-position', 'counter-(?:reset|increment|set)', 'env',
].join('|')})$`);

/* Paint, type and motion: how a thing looks and how it moves. A story writing any of
 * these is deciding something the kit decides. */
const PAINT = new RegExp(`^(?:${[
  'background(?:-[\\w-]+)?', '-webkit-background-clip',
  'border(?!-collapse|-spacing)(?:-[\\w-]+)?', 'border-radius', 'box-shadow',
  'color', '-webkit-text-fill-color', 'caret-color', 'accent-color',
  'outline(?:-[\\w-]+)?', 'font(?:-[\\w-]+)?', 'letter-spacing', 'word-spacing',
  'line-height', 'text-(?:decoration|transform|shadow|indent|emphasis)(?:-[\\w-]+)?',
  'text-underline-offset', 'opacity', 'filter', 'backdrop-filter', 'mix-blend-mode',
  'transition(?:-[\\w-]+)?', 'animation(?:-[\\w-]+)?', 'transform(?:-[\\w-]+)?',
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
  // Each comma-separated subject is its own selector; one naming a kit class is enough.
  if (selector.split(',').some((one) => KIT_CLASS.test(one))) return 'placement';
  if (GLUE.test(property)) return 'glue';
  return 'unknown';
}

/* ---- reading the source ------------------------------------------------- */

const lineAt = (src, index) => src.slice(0, index).split('\n').length;

/**
 * Every stylesheet a story source carries: each `<style>` block, and the template
 * literal behind a `<style>{CSS}</style>` reference.
 *
 * @returns {Array<{css: string, line: number}>}
 */
export function styleSheets(src) {
  const found = [];
  const named = new Set();
  for (const m of src.matchAll(/<style[^>]*>\s*\{\s*([A-Za-z_$][\w$]*)\s*\}\s*<\/style>/g)) named.add(m[1]);
  for (const m of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const body = m[1];
    if (/^\s*\{\s*[A-Za-z_$][\w$]*\s*\}\s*$/.test(body)) continue;
    const css = body.replace(/^\s*\{\s*(['"`])/, '').replace(/(['"`])\s*\}\s*$/, '');
    found.push({ css, line: lineAt(src, m.index + m[0].indexOf(body)) });
  }
  for (const name of named) {
    const m = new RegExp(`\\b${name}\\s*=\\s*\`([\\s\\S]*?)\`\\s*;`).exec(src);
    if (m) found.push({ css: m[1], line: lineAt(src, m.index + m[0].indexOf(m[1])) });
  }
  return found;
}

/** One declaration list, split on `;` outside parentheses. */
function cssDeclarations(text) {
  const parts = [];
  let depth = 0;
  let buffer = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ';' && depth === 0) { parts.push(buffer); buffer = ''; continue; }
    buffer += ch;
  }
  parts.push(buffer);
  return parts.map(named).filter(Boolean);
}

/** One JSX style object, split on `,` outside brackets and strings; a spread is skipped. */
function jsxDeclarations(text) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let buffer = '';
  for (const ch of text) {
    if (quote) { buffer += ch; if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; buffer += ch; continue; }
    if ('([{'.includes(ch)) depth += 1;
    if (')]}'.includes(ch)) depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(buffer); buffer = ''; continue; }
    buffer += ch;
  }
  parts.push(buffer);
  return parts.filter((p) => !p.trim().startsWith('...')).map(named).filter(Boolean);
}

/** `prop: value` → `{property, value}`, with a JSX `maxWidth` spelled as CSS. */
function named(text) {
  const at = text.indexOf(':');
  if (at < 0) return null;
  const property = text.slice(0, at).trim().replace(/['"]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  if (!property || property.startsWith('/*') || /[\s{}]/.test(property)) return null;
  return { property, value: text.slice(at + 1).trim() };
}

/**
 * Every `style=` attribute in a story source, with the kit classes of the tag it sits
 * on. A `className` built by an expression reads as no class — see LIMITS.
 *
 * @returns {Array<{selector: string, decls: Array<{property: string, value: string}>, line: number}>}
 */
export function inlineStyles(src) {
  const found = [];
  const subject = (at) => {
    const open = src.lastIndexOf('<', at);
    if (open < 0) return '(element)';
    const m = /class(?:Name)?=(?:"([^"<>]*)"|\{'([^'<>]*)'\}|\{`([^`<>${]*)`\})/.exec(src.slice(open, at));
    const names = (m ? (m[1] ?? m[2] ?? m[3]) : '').split(/\s+/).filter(Boolean);
    return names.length ? names.map((c) => `.${c}`).join('') : '(element)';
  };
  for (const m of src.matchAll(/style="([^"]*)"/g)) {
    found.push({ selector: subject(m.index), decls: cssDeclarations(m[1]), line: lineAt(src, m.index) });
  }
  for (const m of src.matchAll(/style=\{\{([^}]*)\}\}/g)) {
    found.push({ selector: subject(m.index), decls: jsxDeclarations(m[1]), line: lineAt(src, m.index) });
  }
  return found;
}

/**
 * A stylesheet flattened to rules. One level of `@media` nesting is unwrapped, which is
 * all these sheets use.
 *
 * @returns {Array<{selector: string, decls: Array<{property: string, value: string}>, line: number, media: string|null}>}
 */
export function rulesIn(css, firstLine = 1) {
  // Blank the comments but keep every newline, so the line numbers stay true.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const line = (index) => firstLine + clean.slice(0, index).split('\n').length - 1;
  const rules = [];
  const blocks = [];
  const flat = clean.replace(/@media([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g, (m, condition, body, index) => {
    blocks.push({ condition: condition.trim(), body, at: index + m.indexOf(body) });
    return m.replace(/[^\n]/g, ' ');
  });
  const collect = (text, offset, media) => {
    for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim();
      if (!selector || selector.startsWith('@')) continue;
      const at = offset + m.index + (m[1].length - m[1].trimStart().length);
      rules.push({ selector, decls: cssDeclarations(m[2]), line: line(at), media });
    }
  };
  collect(flat, 0, null);
  for (const block of blocks) collect(block.body, block.at, block.condition);
  return rules;
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
      for (const rule of rulesIn(sheet.css, sheet.line)) {
        for (const d of rule.decls) decls.push({ ...d, selector: rule.selector, line: rule.line, media: rule.media });
      }
    }
    for (const inline of inlineStyles(src)) {
      for (const d of inline.decls) decls.push({ ...d, selector: inline.selector, line: inline.line, media: null });
    }
  }
  const sorted = decls.map((d) => ({ ...d, file, verdict: classify(d, kitTokens) }));
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
export const show = (d) =>
  `${d.file}:${d.line}  ${d.selector} { ${d.property}: ${d.value} }${d.media ? ` @media ${d.media}` : ''}`;

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
      problems.push(`${show(d)}\n    \`${d.property}\` is a property ${where} does not sort. Put it `
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
