/* Rule: a segmented choice stacked in a settings row starts its first label on the row's
 * text edge.
 *
 * On a phone a settings row stacks, so the choice drops under its label. Its track has the
 * card's own ground and draws no box, so the first word stood the track's padding plus the
 * first pill's to the right of the label above it, 18px at 390px (#845).
 * card.css hangs the choice back by that sum. This gate reads both numbers from the sheets
 * that own them: the track's padding and every phone pill padding from segmented.css,
 * and the tight Theme row's own padding from card.css. A hang that misses one fails.
 *
 * Limits: it reads declarations and computes no layout. The 390px offsets are measured in
 * Chromium and recorded on the pull request. An underline strip is left out: it has no
 * pill padding to hang.
 *
 * why: guidelines/spacing.md#put-text-on-the-column-edge
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const PHONE = '@media (max-width: 560px)';

/** Rules as { selector, body, phone }, where phone says the rule sits in the phone block. */
const rulesOf = (css) => {
  const out = [];
  let depth = 0, at = 0, media = '';
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') {
      const head = css.slice(at, i).trim();
      if (head.startsWith('@')) { media = head; depth += 1; at = i + 1; continue; }
      const end = css.indexOf('}', i);
      out.push({ selector: head, body: css.slice(i + 1, end), phone: depth > 0 && media === PHONE });
      i = end; at = end + 1;
    } else if (css[i] === '}') { depth -= 1; if (!depth) media = ''; at = i + 1; }
  }
  return out;
};
const prop = (body, name) => new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();
/** The inline value of a `padding` shorthand or a `padding-inline`. */
const inline = (body) => {
  const short = prop(body, 'padding');
  if (short) { const parts = short.split(/\s+(?![^(]*\))/); return parts[1] ?? parts[0]; }
  return prop(body, 'padding-inline');
};

export const checkHang = (segCss, cardCss) => {
  const seg = rulesOf(segCss);
  const card = rulesOf(cardCss);
  const problems = [];
  const track = seg.find((r) => r.selector === '.ui-seg' && !r.phone);
  const trackPad = track && prop(track.body, 'padding');
  if (!trackPad) return { problems: ['segmented.css: no padding on the .ui-seg track'], pills: 0 };

  // Every pill padding a stacked row can show: the phone rules, and the sizes that keep theirs.
  const pills = seg.filter((r) => /\bbutton$/.test(r.selector.replace(/(?::not\([^)]*\)\s*)+$/, '')) && !/underline\b(?![^(]*\))/.test(r.selector.replace(/:not\([^)]*\)/g, ''))
    && inline(r.body) && (r.phone || /--sm\b/.test(r.selector)));
  const hangRule = card.find((r) => r.phone && /^\.ui-card__row > \.ui-seg\b/.test(r.selector));
  const hang = hangRule && prop(hangRule.body, 'margin-inline-start');
  if (!hang) return { problems: ['card.css: no phone rule hangs a .ui-card__row > .ui-seg back'], pills: pills.length };
  if (!hang.includes(trackPad)) problems.push(`card.css: the hang ${hang} leaves out the track padding ${trackPad}`);

  // The tight Theme row narrows its pills through one variable, and the hang reads it.
  const tight = card.find((r) => r.phone && /--tight-choice > \.ui-seg/.test(r.selector) && !/button$/.test(r.selector));
  const tightVar = tight && /(--[\w-]+)\s*:/.exec(tight.body)?.[1];
  const tightPill = card.find((r) => r.phone && /--tight-choice > \.ui-seg.*button$/.test(r.selector));
  if (!tightVar) problems.push('card.css: the tight row declares no padding variable on its choice');
  else {
    if (inline(tightPill?.body ?? '') !== `var(${tightVar})`) problems.push(`card.css: the tight row's pills do not take ${tightVar}`);
    if (!hang.includes(`var(${tightVar}`)) problems.push(`card.css: the hang ignores the tight row's ${tightVar}`);
  }
  const fallback = /var\(--[\w-]+,\s*(var\([^()]+\))\)/.exec(hang)?.[1];
  for (const pill of pills) {
    const pad = inline(pill.body);
    if (pad !== fallback) problems.push(`segmented.css: ${pill.selector} pads ${pad}, and the hang takes ${fallback ?? 'nothing'}`);
  }
  return { problems, pills: pills.length };
};

const SEG = read('segmented.css');
const CARD = read('card.css');

test('a stacked choice hangs back by its track and first pill padding', () => {
  const { problems, pills } = checkHang(SEG, CARD);
  // Coverage: the phone pill rule and the small size. A parser that finds none passes nothing.
  assert.equal(pills, 2, `found ${pills} pill paddings a stacked row can show, not 2`);
  assert.deepEqual(problems, []);
});

test('the gate refuses a hang that is gone or misses a padding', () => {
  const hangLine = /margin-inline-start: calc\(-1 \* \(var\(--space-1\) \+ var\(--ui-row-choice-pad, var\(--space-3\)\)\)\);/;
  assert.match(CARD, hangLine, 'the fixture must hold the hang to mutate');
  const cases = {
    'no hang': [SEG, CARD.replace(hangLine, '')],
    'no track padding': [SEG, CARD.replace(hangLine, 'margin-inline-start: calc(-1 * var(--ui-row-choice-pad, var(--space-3)));')],
    'no tight variable': [SEG, CARD.replace(hangLine, 'margin-inline-start: calc(-1 * (var(--space-1) + var(--space-3)));')],
    'a wider phone pill': [SEG.replace('padding: var(--space-2) var(--space-3);', 'padding: var(--space-2) var(--space-4);'), CARD],
  };
  for (const [name, [seg, card]] of Object.entries(cases)) {
    assert.notEqual(seg + card, SEG + CARD, `${name}: the mutation changed nothing`);
    assert.ok(checkHang(seg, card).problems.length > 0, `${name}: the gate passed a broken hang`);
  }
});
