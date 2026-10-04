// Parity gate for <StatBand>: the vanilla statBand() is the source of truth.
// React components must match the vanilla class names.
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { statBand } from '@apliteni/apliteni-ui';
import { StatBand, type StatBandProps } from './StatBand';
import { classesOfEl } from '../test/classlist';

afterEach(cleanup);

/** What both implementations have to agree on, read off a rendered band. */
function shape(root: Element) {
  const doc = root.ownerDocument;
  return {
    classes: classesOfEl(root),
    role: root.getAttribute('role'),
    label: root.getAttribute('aria-label'),
    list: root.querySelector(':scope > dl')?.className,
    basis: root.querySelector('.ui-stats__basis')?.textContent ?? null,
    // The caption leads the band in both implementations, or neither.
    captionLeads: root.firstElementChild?.className === 'ui-stats__basis',
    figures: [...root.querySelectorAll('.ui-stat')].map((f) => {
      const d = f.querySelector('.ui-stat__delta');
      const ref = d?.getAttribute('aria-describedby');
      return {
        classes: classesOfEl(f).join(' '),
        tags: [...f.children].map((c) => `${c.tagName}.${c.className}`),
        label: f.querySelector('dt')?.textContent,
        value: f.querySelector('.ui-stat__value')?.textContent,
        caption: f.querySelector('.ui-stat__caption')?.textContent ?? null,
        delta: d && d.textContent?.replace(/\s+/g, ' ').trim(),
        // The order of the words inside the row, so a caption that moved past the
        // change — or a basis drawn beside one — is a difference between the two
        // sides. The glyph is left out: React wraps it and the factory does not.
        rowParts: [...(d?.querySelectorAll('.ui-stat__caption, .ui-stat__change, .ui-stat__basis') ?? [])]
          .map((c) => c.className),
        glyph: d?.querySelector('svg')?.innerHTML ?? null,
        describedBy: ref ? doc.getElementById(ref)?.textContent ?? `missing #${ref}` : null,
        trend: !!f.querySelector('.ui-stat__trend svg'),
      };
    }),
  };
}

// Read in the document, so its caption id resolves, then taken out again: left
// in, the React band's `aria-describedby` would resolve to the vanilla caption
// and a wrong id on the React side would pass.
function vanillaShape(props: StatBandProps) {
  const host = document.createElement('div');
  host.innerHTML = statBand({ ...props, stats: props.stats.map((s) => ({ ...s, trend: s.trend ? SVG : '' })) });
  document.body.append(host);
  const out = shape(host.firstElementChild as Element);
  host.remove();
  return out;
}

const SVG = '<svg width="200" height="32" aria-hidden="true"></svg>';
const TREND = <svg width="200" height="32" aria-hidden="true" />;
// The four verdicts a caller can give — good, bad, undeclared, good on a fall —
// so parity covers each of them rather than only the ones that paint green.
const FOUR: StatBandProps['stats'] = [
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' }, trend: TREND },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%' }, trend: TREND },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' } },
];

const CASES: [string, StatBandProps][] = [
  ['the default layout, with a shared basis', { stats: FOUR, basis: 'Change against the previous 12 months', id: 'kpi' }],
  ['band', { stats: FOUR, variant: 'band', basis: 'x', id: 'b' }],
  ['tiles', { stats: FOUR, variant: 'tiles', basis: 'x', id: 't' }],
  ['open, named', { stats: FOUR, variant: 'open', label: 'Cashflow', id: 'o' }],
  // Context that is not a change. The band is mixed on purpose: `tags` carries
  // each figure's rows and `rowParts` the order inside one, so a caption that
  // opened a second row — the defect #512's review measured — fails here.
  ['a mixed band: captions, changes, and both at once', {
    id: 'c',
    basis: 'Against last year',
    stats: [
      { label: 'Gross margin', value: '36.1%', caption: 'of revenue' },
      { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' }, trend: TREND },
      { label: 'Operating margin', value: '12.4%', caption: 'of revenue', delta: { value: '+1.2 pts', tone: 'good' } },
      // The caption takes the basis's place, and the change points at the band.
      { label: 'Net margin', value: '8.0%', caption: 'of revenue', delta: { value: '−3.9 pts', tone: 'bad', basis: 'against the 40% target' } },
      // Nothing to compare: the caption stays, and nothing is added after it.
      { label: 'Refunds', value: '€ 0', caption: 'of revenue', delta: { value: null } },
      { label: 'Fees', value: '€ 0', delta: { value: null } },
    ],
  }],
  // A band with no caption of its own: the branch where the kit has nothing to
  // point a change at, which is where a caption used to cost the caller their
  // basis. Both sides must print it.
  ['a captioned figure in a band with no caption of its own', {
    id: 'n',
    stats: [
      { label: 'Operating margin', value: '12.4%', caption: 'of revenue', delta: { value: '+1.2 pts', tone: 'good', basis: 'against the 40% target' } },
      { label: 'Net margin', value: '8.0%', delta: { value: '−3.9 pts', tone: 'bad', basis: 'against the 40% target' } },
    ],
  }],
  ['every kind of change', {
    id: 'k',
    basis: 'Against last year',
    stats: [
      { label: 'Margin', value: '36%', delta: { value: '−3.9 pts', tone: 'bad', basis: 'against the 40% target' } },
      { label: 'New', value: '€ 1', delta: { value: null } },
      { label: 'Toned, but nothing to compare', value: '€ 1', delta: { value: null, tone: 'bad' } },
      { label: 'Empty', value: '€ 1', delta: { value: '' } },
      { label: 'Flat', value: '€ 1', delta: { value: '0.0%' } },
      { label: 'Forced', value: '€ 1', delta: { value: '4%', direction: 'down' } },
      { label: 'Hyphen', value: '€ 1', delta: { value: '-4%', tone: 'neutral' } },
      { label: 'Bare', value: '€ 1' },
    ],
  }],
];

describe('StatBand renders what statBand() renders', () => {
  for (const [name, props] of CASES) {
    it(name, () => {
      const expected = vanillaShape(props);
      const { container } = render(<StatBand {...props} />);
      expect(shape(container.firstElementChild as Element)).toEqual(expected);
    });
  }
});

it('a figure can be a link, and two unnamed bands never share a caption id', () => {
  const { container } = render(<>
    <StatBand basis="a" stats={[{ label: 'Income', value: <a href="/income">€ 1</a>, delta: { value: '+1%' } }]} />
    <StatBand basis="b" stats={[{ label: 'Cost', value: '€ 2', delta: { value: '+2%' } }]} />
  </>);
  expect(container.querySelector('.ui-stat__value a')?.getAttribute('href')).toBe('/income');
  const ids = [...container.querySelectorAll('.ui-stats__basis')].map((p) => p.id);
  expect(new Set(ids).size).toBe(2);
});

// React-only composition: several views can share one caption without duplicating it.
it('references a shared caption, with a local basis taking precedence', () => {
  const { container } = render(<>
    <p id="shared-basis">Compared with August 2026</p>
    <StatBand stats={FOUR} basisId="shared-basis" />
    <StatBand stats={FOUR} basisId="shared-basis" basis="Compared with last year" id="local-band" />
  </>);
  const bands = container.querySelectorAll('.ui-stats');
  expect(bands[0].querySelector('.ui-stats__basis')).toBeNull();
  expect([...bands[0].querySelectorAll('.ui-stat__delta')].every(delta => delta.getAttribute('aria-describedby') === 'shared-basis')).toBe(true);
  expect([...bands[1].querySelectorAll('.ui-stat__delta')].every(delta => delta.getAttribute('aria-describedby') === 'local-band-basis')).toBe(true);
});
