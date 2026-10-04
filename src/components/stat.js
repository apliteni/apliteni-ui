// Stat band — a row of key figures, as an HTML string.
// why: docs/specification.md#stat-bands
//
// A band is a <dl>: each figure is a <div> holding its label as a <dt> and its
// value, change and trend as <dd>s, which is the grouping HTML allows inside a
// description list and the one a screen reader reads as "term, then its values".
import { esc } from './index.js';
import { icon } from '../assets/icons.js';

export const STAT_VARIANTS = ['band', 'tiles', 'open'];
export const STAT_TONES = ['good', 'bad', 'neutral'];

const cx = (...a) => a.filter(Boolean).join(' ');
let seq = 0;

// The arrow is read off the sign the caller printed, so the figure and the
// glyph beside it cannot disagree. U+2212, the en dash and an accounting
// bracket are negatives too: a formatter that typesets its figures uses them.
const directionOf = (text) => {
  const t = text.trim();
  return /^[-−–(]/.test(t) ? 'down' : /^\+/.test(t) ? 'up' : 'flat';
};
const GLYPH = { up: 'arrowUp', down: 'arrowDown', flat: 'minus' };
const hasChange = (delta) => delta && delta.value != null && delta.value !== '';

// One row and one line: the caption, the change, then what it is measured
// against. Nothing to compare draws no row. why: docs/specification.md#stat-bands
const contextRow = (caption, delta, basisId) => {
  if (!hasChange(delta)) return caption ? `<dd class="ui-stat__caption">${esc(caption)}</dd>` : '';
  // The space is read where the CSS gap is only drawn: "of income+1.2 pts" else.
  const lead = caption ? `<span class="ui-stat__caption">${esc(caption)}</span> ` : '';
  const text = String(delta.value);
  const dir = GLYPH[delta.direction] ? delta.direction : directionOf(text);
  // Never dropped: a basis is passed when the band's caption does not cover this figure.
  const own = delta.basis ? ` <span class="ui-stat__basis">${esc(delta.basis)}</span>` : '';
  const describedby = !own && basisId ? ` aria-describedby="${basisId}"` : '';
  return `<dd class="ui-stat__delta"${describedby}>${lead}${icon(GLYPH[dir])}`
    + `<span class="ui-stat__change">${esc(text)}</span>${own}</dd>`;
};

// `tone` says whether the change is good news, and nothing else. It is never
// inferred from the direction: costs going up and unclassified rows going down
// are both real, and a band that paints every rise green is editorialising.
// A figure with no change has no news to colour.
const figure = ({ label = '', value = '', caption = '', delta, trend = '' }, tile, basisId) => {
  const tone = hasChange(delta) && STAT_TONES.includes(delta.tone) && delta.tone !== 'neutral' ? delta.tone : '';
  const cls = cx('ui-stat', tone && `ui-stat--${tone}`, tile && 'ui-card ui-card--pad-sm');
  // `trend` is trusted markup — an <svg> the caller drew. The kit sizes and
  // colours it and draws no chart of its own.
  return `<div class="${cls}">`
    + `<dt class="ui-stat__label">${esc(label)}</dt>`
    + `<dd class="ui-stat__value">${esc(value)}</dd>`
    + contextRow(caption, delta, basisId)
    + (trend ? `<dd class="ui-stat__trend">${trend}</dd>` : '')
    + '</div>';
};

// `basis` is the band's caption: what every change is measured against, said
// once before the list the way a table's <caption> is, in every layout — under
// a row of tiles it would read as a note on the last card.
// why: docs/specification.md#stat-bands
export function statBand({ stats = [], variant = 'tiles', basis = '', label, id } = {}) {
  const v = STAT_VARIANTS.includes(variant) ? variant : 'tiles';
  const base = id ? esc(id) : `ui-stats-${++seq}`;
  const basisId = basis ? `${base}-basis` : '';
  const cls = cx('ui-stats', `ui-stats--${v}`, v === 'band' && 'ui-card');
  const named = label ? ` role="group" aria-label="${esc(label)}"` : '';
  const items = stats.map((s) => figure(s, v === 'tiles', basisId)).join('');
  return `<div class="${cls}"${named}>`
    + (basis ? `<p class="ui-stats__basis" id="${basisId}">${esc(basis)}</p>` : '')
    + `<dl class="ui-stats__list">${items}</dl>`
    + '</div>';
}
