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

// The arrow is read off the sign the caller already printed, so the figure and
// the glyph beside it cannot disagree. U+2212 and the en dash are minus signs
// too: a formatter that typesets its negatives uses one of them, not a hyphen.
const directionOf = (text) => (/^[-−–]/.test(text) ? 'down' : /^\+/.test(text) ? 'up' : 'flat');
const GLYPH = { up: 'arrowUp', down: 'arrowDown', flat: 'minus' };

// `tone` says whether the change is good news, and nothing else. It is never
// inferred from the direction: costs going up and unclassified rows going down
// are both real, and a band that paints every rise green is editorialising.
const deltaHtml = (delta, basisId) => {
  if (!delta) return '';
  if (delta.value == null || delta.value === '') {
    return `<dd class="ui-stat__delta ui-stat__delta--none">${esc(delta.none || 'No earlier figure')}</dd>`;
  }
  const text = String(delta.value);
  const dir = GLYPH[delta.direction] ? delta.direction : directionOf(text);
  const own = delta.basis ? ` <span class="ui-stat__basis">${esc(delta.basis)}</span>` : '';
  const describedby = !delta.basis && basisId ? ` aria-describedby="${basisId}"` : '';
  return `<dd class="ui-stat__delta"${describedby}>${icon(GLYPH[dir])}<span class="ui-stat__change">${esc(text)}</span>${own}</dd>`;
};

export function stat({ label = '', value = '', delta, trend = '', tile = false, basisId } = {}) {
  const tone = delta && STAT_TONES.includes(delta.tone) && delta.tone !== 'neutral' ? delta.tone : '';
  const cls = cx('ui-stat', tone && `ui-stat--${tone}`, tile && 'ui-card ui-card--pad-sm');
  // `trend` is trusted markup — an <svg> the caller drew. The kit sizes and
  // colours it and draws no chart of its own.
  return `<div class="${cls}">`
    + `<dt class="ui-stat__label">${esc(label)}</dt>`
    + `<dd class="ui-stat__value">${esc(value)}</dd>`
    + deltaHtml(delta, basisId)
    + (trend ? `<dd class="ui-stat__trend">${trend}</dd>` : '')
    + '</div>';
}

// `basis` is what every change in the band is measured against, said once under
// the figures. A figure whose change is measured against something else carries
// its own `delta.basis` instead, and that one is printed beside the change.
export function statBand({ stats = [], variant = 'band', basis = '', label, id } = {}) {
  const v = STAT_VARIANTS.includes(variant) ? variant : 'band';
  const base = id ? esc(id) : `ui-stats-${++seq}`;
  const basisId = basis ? `${base}-basis` : '';
  const cls = cx('ui-stats', `ui-stats--${v}`, v === 'band' && 'ui-card');
  const named = label ? ` role="group" aria-label="${esc(label)}"` : '';
  const items = stats.map((s) => stat({ ...s, tile: v === 'tiles', basisId })).join('');
  return `<div class="${cls}"${named}>`
    + `<dl class="ui-stats__list">${items}</dl>`
    + (basis ? `<p class="ui-stats__basis" id="${basisId}">${esc(basis)}</p>` : '')
    + '</div>';
}
