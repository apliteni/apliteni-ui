// Target geometry the accessibility-floor gate reads, shared so the React workspace can
// measure what React renders with the same arithmetic. JSDOM resolves no pixels, so
// the kit's geometry declarations are copied into probe custom properties and read back.
import { JSDOM, VirtualConsole } from 'jsdom';
import { splitSelectorList } from '../../scripts/lib/selector-list.js';
import { installDomGlobals } from './contrast.js';

export const RULE = /([^{}]+)\{([^{}]*)\}/g;
export const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// ---- geometry -------------------------------------------------------------

// The box properties, split by whether CSS inherits them. A custom property
// ALWAYS inherits, so a probe for a non-inherited property would leak an
// ancestor's value down onto a control that declares none — a button inside a
// card would report the card's height. Every one of these is therefore reset to
// a sentinel at `*`, which has no specificity and so loses to every real rule.
// The two CSS does inherit are left to inherit, because there the leak is the
// right answer.
const GEOMETRY = [
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'height', 'width', 'min-height', 'min-width', 'border', 'border-width', 'border-style',
  'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width',
  'box-sizing', 'position',
];
const INHERITED = ['font-size', 'line-height'];
const NONE = '·none·';

// A control's target is not its ink. 2.5.8 measures what a pointer can land on,
// and a pointer landing on a control's ::before or ::after hits the CONTROL —
// the pseudo is a box the element generates, not a child that could take the
// event away. So an overlay inset past the drawn box is a real 24px target with
// the drawn control left at whatever size the design gave it, and this gate has
// to see it or a hit-area fix would fail every test and pass none.
//
// The two pseudos are probed under SEPARATE names on purpose: .ui-check input
// carries a tick on ::after and its hit area on ::before, and one namespace
// would have let the 10px tick overwrite the 24px target.
const PSEUDOS = ['before', 'after'];
const PSEUDO_GEOMETRY = [
  'content', 'position', 'pointer-events',
  'width', 'height', 'inset', 'top', 'right', 'bottom', 'left',
];

/**
 * Copy every geometry declaration into a probe custom property beside itself, and every
 * `sel::before { … }` rule onto `sel` under `--tsz-before-*`. Why that reads the cascade
 * JSDOM will not resolve: custom properties retain the values for the probe.
 * The probe approximates pseudo-element specificity.
 */
export function probeGeometry(css) {
  const reset = `*{${[
    ...GEOMETRY.map((p) => `--tsz-${p}:${NONE}`),
    // A custom property inherits, so without this a control would read its
    // ANCESTOR's pseudo geometry: .ui-toast--soft::before is a 3px marker, and
    // every button inside the toast would have reported carrying one.
    ...PSEUDOS.flatMap((ps) => PSEUDO_GEOMETRY.map((p) => `--tsz-${ps}-${p}:${NONE}`)),
  ].join(';')}}`;
  return reset + css.replace(RULE, (whole, sel, body) => {
    if (sel.trimStart().startsWith('@')) return whole;
    const extra = [];
    const bases = { before: [], after: [] };
    for (const part of splitSelectorList(sel)) {
      const m = /^(.*?)::?(before|after)$/.exec(part);
      if (m && m[1]) bases[m[2]].push(m[1]);
    }
    const retarget = { before: [], after: [] };
    for (const decl of body.split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim().toLowerCase();
      const value = decl.slice(i + 1).replace(/!important/g, '').trim();
      if (GEOMETRY.includes(prop) || INHERITED.includes(prop)) extra.push(`--tsz-${prop}:${value}`);
      if (PSEUDO_GEOMETRY.includes(prop)) {
        for (const ps of PSEUDOS) if (bases[ps].length) retarget[ps].push(`--tsz-${ps}-${prop}:${value}`);
      }
    }
    const rule = extra.length ? `${sel}{${body};${extra.join(';')}}` : whole;
    return rule + PSEUDOS
      .filter((ps) => bases[ps].length && retarget[ps].length)
      .map((ps) => `${bases[ps].join(',')}{${retarget[ps].join(';')}}`)
      .join('');
  });
}

/** Resolve one probe property for one element, chasing var() through itself. */
export function probe(cs, name) {
  let v = cs.getPropertyValue(`--tsz-${name}`);
  if (v === NONE) return '';
  for (let pass = 0; pass < 8 && v && v.includes('var('); pass++) {
    const next = v.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (m, ref, fallback) => {
      const got = cs.getPropertyValue(ref);
      return got || (fallback != null ? fallback.trim() : m);
    });
    if (next === v) break;
    v = next;
  }
  return (v || '').trim();
}

/** A single CSS length in px, or null when it is anything else. */
export const px = (v) => {
  const m = /^(-?[\d.]+)px$/.exec((v || '').trim());
  return m ? Number(m[1]) : null;
};

/** The nth value of a shorthand, expanded the way CSS expands padding. */
function side(v, which) {
  const parts = (v || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const [t, r = t, b = t, l = r] = parts;
  return px({ top: t, right: r, bottom: b, left: l }[which]);
}

/**
 * The box one pseudo-element of a control generates, or null when it makes none.
 *
 * Out of flow only: an in-flow pseudo is content, and the drawn box already
 * counted it. `pointer-events: none` is a box no pointer can land on, so it is
 * not a target either — everything else the element generates is.
 *
 * Size comes from a declared width/height where there is one, and otherwise
 * from the two insets biting into the containing block, which for an absolutely
 * positioned pseudo is the control's PADDING box. That second form is how the
 * radio's dot is written (`inset: 4px` — an 8px dot in a 16px padding box), and
 * it is the form a hit area takes when it is written as a negative inset.
 */
function pseudoBox(cs, which, paddingBox) {
  const p = (name) => probe(cs, `${which}-${name}`);
  const content = p('content');
  if (!content || content === 'none') return null; // no content, no box
  if (!/^(absolute|fixed)$/.test(p('position'))) return null;
  if (p('pointer-events') === 'none') return null;
  const axis = (declared, near, far, block) => {
    const own = px(p(declared));
    if (own != null) return own;
    const edge = (w) => px(p(w)) ?? side(p('inset'), w);
    const [a, b] = [edge(near), edge(far)];
    return a == null || b == null || block == null ? null : block - a - b;
  };
  return {
    height: axis('height', 'top', 'bottom', paddingBox.height),
    width: axis('width', 'left', 'right', paddingBox.width),
  };
}

/**
 * The target size of one control, with `null` on an axis layout decides.
 *
 * The DRAWN box is padding + border + content, where content is the taller of
 * the resolved line-height and any glyph the control holds. Width is only
 * answered when the box declares it, or when the control's content is a glyph
 * and nothing else — a label's width is a line of text, and that is layout's.
 *
 * The TARGET is that box widened by any pseudo-element the control generates,
 * because a pointer landing on one of those hits the control. The two are
 * reported separately: `drawn` is what a reader sees, and height/width are what
 * a reader can hit, which is the pair 2.5.8 is about.
 */
export function boxOf(el, cs, glyph) {
  const pad = (which) => {
    const long = px(probe(cs, `padding-${which}`));
    return long != null ? long : (side(probe(cs, 'padding'), which) ?? 0);
  };
  const border = (which) => {
    const long = px(probe(cs, `border-${which}-width`));
    if (long != null) return long;
    const short = side(probe(cs, 'border-width'), which);
    if (short != null) return short;
    // `border: 1px solid var(--border)` — the width is the one length in it,
    // and `border: none` is a width of nothing.
    const shorthand = probe(cs, 'border');
    if (/(^|\s)none(\s|$)/.test(shorthand)) return 0;
    const one = /(-?[\d.]+)px/.exec(shorthand);
    return one ? Number(one[1]) : 0;
  };
  // font-size and line-height are inherited by CSS itself, so the computed
  // value is right whenever JSDOM could resolve it, and the probe is the
  // fallback for the var() it could not.
  const fontSize = px(cs.fontSize) ?? px(probe(cs, 'font-size')) ?? 16;
  const lhRaw = px(cs.lineHeight) != null ? cs.lineHeight : probe(cs, 'line-height');
  const lh = px(lhRaw) ?? (Number(lhRaw) ? Number(lhRaw) * fontSize : null);

  const declaredH = px(probe(cs, 'height'));
  const declaredW = px(probe(cs, 'width'));
  const minH = px(probe(cs, 'min-height'));
  const minW = px(probe(cs, 'min-width'));

  // Any text ANYWHERE inside, not just a direct child: the kit wraps a button's
  // label in a span often enough that asking for a direct text node reported
  // every wrapped label as a control with no content at all.
  const hasText = el.textContent.trim() !== '';
  const contentH = Math.max(glyph.h ?? 0, hasText ? (lh ?? fontSize) : 0);
  const chrome = (which) => pad(which) + border(which);

  const height = declaredH != null
    ? declaredH + (probe(cs, 'box-sizing') === 'content-box' ? chrome('top') + chrome('bottom') : 0)
    : Math.max(minH ?? 0, contentH + chrome('top') + chrome('bottom'));

  let width = declaredW;
  if (width == null && !hasText && glyph.w != null) width = glyph.w + chrome('left') + chrome('right');
  if (width != null && minW != null) width = Math.max(width, minW);

  const round = (n) => Math.round(n * 100) / 100;
  const drawn = { height: round(height), width: width == null ? null : round(width) };

  // What a pointer can land on. The containing block of an absolutely
  // positioned pseudo is this control's padding box, which is the border box
  // less its borders — the 1.5px the checkbox draws is the difference between a
  // 24px overlay and a 21px one, and no comment would have caught that.
  const paddingBox = {
    height: drawn.height - border('top') - border('bottom'),
    width: drawn.width == null ? null : drawn.width - border('left') - border('right'),
  };
  let hitH = drawn.height;
  let hitW = drawn.width;
  const unreadable = [];
  for (const which of PSEUDOS) {
    const box = pseudoBox(cs, which, paddingBox);
    if (!box) continue;
    if (box.height == null && box.width == null) { unreadable.push(`::${which}`); continue; }
    if (box.height != null) hitH = Math.max(hitH, box.height);
    // A pseudo can only WIDEN a width already known. It cannot supply one: the
    // target is at least the drawn box, and where that is layout's answer the
    // union of the two is layout's answer as well. Introducing it read the rail's
    // own 3px active marker — the accent bar #475 later took off — as a 3px-wide
    // nav item.
    if (box.width != null && hitW != null) hitW = Math.max(hitW, box.width);
  }

  return { height: round(hitH), width: hitW == null ? null : round(hitW), drawn, unreadable };
}

/** The largest glyph a control holds, in px, or nulls when it holds none. */
export function glyphOf(el, win) {
  let h = null; let w = null;
  for (const svg of el.querySelectorAll('svg')) {
    const cs = win.getComputedStyle(svg);
    const gh = px(cs.height) ?? px(svg.getAttribute('height'));
    const gw = px(cs.width) ?? px(svg.getAttribute('width'));
    if (gh != null) h = Math.max(h ?? 0, gh);
    if (gw != null) w = Math.max(w ?? 0, gw);
  }
  return { h, w };
}


export function windowFor(theme, css) {
  const quiet = new VirtualConsole();
  quiet.on('jsdomError', () => {});
  const dom = new JSDOM(
    `<!doctype html><html lang="en" data-theme="${theme}"><head><style>${css}</style></head><body></body></html>`,
    { pretendToBeVisual: true, virtualConsole: quiet },
  );
  installDomGlobals(dom.window);
  return dom.window;
}
