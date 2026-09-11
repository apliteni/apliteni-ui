// Parity gate for <StatBand>: the vanilla statBand() is the source of truth.
// why: CONTRIBUTING.md#react-components-react
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
    figures: [...root.querySelectorAll('.ui-stat')].map((f) => {
      const d = f.querySelector('.ui-stat__delta');
      const ref = d?.getAttribute('aria-describedby');
      return {
        classes: classesOfEl(f).join(' '),
        tags: [...f.children].map((c) => `${c.tagName}.${c.className}`),
        label: f.querySelector('dt')?.textContent,
        value: f.querySelector('.ui-stat__value')?.textContent,
        delta: d && d.textContent?.replace(/\s+/g, ' ').trim(),
        glyph: d?.querySelector('svg')?.innerHTML ?? null,
        describedBy: ref ? doc.getElementById(ref)?.textContent ?? `missing #${ref}` : null,
        trend: !!f.querySelector('.ui-stat__trend svg'),
      };
    }),
  };
}

function vanilla(props: StatBandProps) {
  const host = document.createElement('div');
  host.innerHTML = statBand({ ...props, stats: props.stats.map((s) => ({ ...s, trend: s.trend ? SVG : '' })) });
  document.body.append(host);
  return host.firstElementChild as Element;
}

const SVG = '<svg width="200" height="32" aria-hidden="true"></svg>';
const TREND = <svg width="200" height="32" aria-hidden="true" />;
const FOUR: StatBandProps['stats'] = [
  { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' }, trend: TREND },
  { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
  { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: 'good' }, trend: TREND },
  { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' } },
];

const CASES: [string, StatBandProps][] = [
  ['a band with a shared basis', { stats: FOUR, basis: 'Change against the previous 12 months', id: 'kpi' }],
  ['tiles', { stats: FOUR, variant: 'tiles', basis: 'x', id: 't' }],
  ['open, named', { stats: FOUR, variant: 'open', label: 'Cashflow', id: 'o' }],
  ['every kind of change', {
    id: 'k',
    basis: 'Against last year',
    stats: [
      { label: 'Margin', value: '36%', delta: { value: '−3.9 pts', tone: 'bad', basis: 'against the 40% target' } },
      { label: 'New', value: '€ 1', delta: { value: null } },
      { label: 'Worded', value: '€ 1', delta: { value: '', none: 'New this year' } },
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
      const expected = shape(vanilla(props));
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
