/**
 * Where a stylesheet paints the accent, and how loudly.
 *
 * Shared by the React showcase's gate and the vanilla specimen's, because the calculation
 * is one calculation; each workspace keeps its own coverage check, which is what
 * AGENTS.md asks for.
 *
 * The thing being caught is a line — a border, an outline or a cast — drawn from the
 * accent. The first version of that check matched the text its author expected
 * (`var(--accent)` written inline), so an edge painted through a custom property, or from
 * `--accent-strong`, went through green. These read the declaration instead: every
 * `--accent*` token counts, and a value is followed through the custom properties the
 * same sheet declares before it is judged.
 */

/** A property that draws a line or a cast rather than ink or a ground. */
const LINE = /^(?:border[\w-]*|outline[\w-]*|box-shadow)$/;
const ACCENT_TOKEN = /var\(\s*(--accent[\w-]*)\s*\)/g;
const VAR_REF = /var\(\s*(--[\w-]+)\s*(?:,|\))/g;

/** Every `--name: value` the sheet declares, last one wins, as the cascade would. */
export function customProperties(css) {
  const out = new Map();
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) out.set(name, value.trim());
  return out;
}

/**
 * Does this value end up painting an accent token? Follows `var()` through the sheet's
 * own custom properties, so `--saved-edge: color-mix(… var(--accent) …)` read back by
 * `border-color: var(--saved-edge)` is the same answer as writing it inline.
 */
export function paintsAccent(value, properties, seen = new Set()) {
  if (new RegExp(ACCENT_TOKEN.source).test(value)) return true;
  for (const [, name] of value.matchAll(new RegExp(VAR_REF.source, 'g'))) {
    if (seen.has(name) || !properties.has(name)) continue;
    seen.add(name);
    if (paintsAccent(properties.get(name), properties, seen)) return true;
  }
  return false;
}

/** Every declaration in `css` that draws a line from the accent, however it is spelled. */
export function accentLines(css) {
  const properties = customProperties(css);
  const found = [];
  for (const [, property, value] of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const name = property.trim().toLowerCase();
    if (!LINE.test(name)) continue;
    if (!paintsAccent(value, properties)) continue;
    found.push({ property: name, value: value.trim() });
  }
  return found;
}

/**
 * The accent's share of a `color-mix`, as a percentage, whichever side it is written on.
 * `color-mix(in srgb, var(--accent) 55%, transparent)` and
 * `color-mix(in srgb, transparent 45%, var(--accent))` are the same colour and the same
 * number here; the first version of this check read only the first spelling.
 */
export function accentMixes(css) {
  const out = [];
  for (const match of css.matchAll(/color-mix\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
    const parts = match[1].split(',').map((p) => p.trim());
    if (parts.length < 3) continue;
    const sides = parts.slice(1).map((side) => {
      const percent = /(\d+(?:\.\d+)?)%\s*$/.exec(side);
      return { colour: side.replace(/\s*\d+(?:\.\d+)?%\s*$/, '').trim(), percent: percent ? Number(percent[1]) : null };
    });
    const accentAt = sides.findIndex((s) => /^var\(\s*--accent[\w-]*\s*\)$/.test(s.colour));
    if (accentAt === -1) continue;
    const other = sides[1 - accentAt];
    const mine = sides[accentAt];
    let share;
    if (mine.percent != null && other.percent != null) share = (mine.percent / (mine.percent + other.percent)) * 100;
    else if (mine.percent != null) share = mine.percent;
    else if (other.percent != null) share = 100 - other.percent;
    else share = 50;
    out.push({ at: match[0], percent: share });
  }
  return out;
}

/** `.ui-card--accent` in src/styles/card.css — the loudest accent edge the kit draws. */
export const KIT_ACCENT_MIX = 22;

/**
 * The whole judgement over one sheet: no accent line at all, and no accent mix louder
 * than the kit's own edge. Returns the sentences a reader can act on, empty when clean.
 */
export function accentOffences(css, where) {
  const problems = accentLines(css).map(({ property, value }) =>
    `${where}: \`${property}: ${value}\` draws a line from the accent. The accent is ink on a `
    + 'name here; a line strong enough to carry the signal is an outlined box.');
  for (const mix of accentMixes(css)) {
    if (mix.percent <= KIT_ACCENT_MIX) continue;
    problems.push(`${where}: \`${mix.at}\` puts the accent at ${Math.round(mix.percent)}%, `
      + `louder than the ${KIT_ACCENT_MIX}% of the kit's own accent edge.`);
  }
  return problems;
}
