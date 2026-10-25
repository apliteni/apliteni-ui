// A dropdown row's status chip: the badge's own size, a soft fill told apart from the
// panel without an edge, text that clears 4.5:1, and body ink outside the status and
// the tick. #429 moved this from stories/dropdown-state-contrast.test.js, which walked
// the vanilla Dropdown stories, to the React ones.
//
// Subjects: every React Dropdown story, plus one fixture that draws every tone, because
// the stories show no `state` chip and a tone with no subject is a tone nobody measures.
// Measured through the source cascade in JSDOM: no layout, no browser pseudo-class, no
// anti-aliased pixel.
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Dropdown } from './Dropdown';
import { Badge } from './primitives/Badge';
import * as stories from './Dropdown.stories';
// @ts-expect-error -- shared, independently tested vanilla contrast arithmetic.
import { kitCssFor, effectiveBackground, parseColour, ratio, rgbOf, substitute } from '../../stories/lib/contrast.js';

afterEach(() => { cleanup(); document.querySelector('style[data-chip-test]')?.remove(); });

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement };
const SUBJECTS: [string, () => ReactElement][] = [
  ...Object.entries(stories as Record<string, Story>)
    .filter(([name, story]) => name !== 'default' && typeof story?.render === 'function')
    .map(([name, story]) => [name, () => { const Story = () => story.render!({}, {}); return <Story />; }] as [string, () => ReactElement]),
  ['every tone', () => <Dropdown defaultOpen ariaLabel="Channels" items={[
    { label: 'In-app', value: 'app', badge: { text: 'On', tone: 'live' }, selected: true },
    { label: 'Email', value: 'mail', badge: { text: 'Off', tone: 'state' } },
    { label: 'Webhook', value: 'hook', badge: { text: 'Beta', tone: 'accent' } },
    { label: 'Digest', value: 'digest', badge: 'Archive' },
    { label: 'Slack', value: 'slack', badge: 'New' },
  ]} />],
];

function sheet(theme: string) {
  const style = document.createElement('style');
  style.dataset.chipTest = '';
  style.textContent = kitCssFor(theme).css;
  document.head.appendChild(style);
  document.documentElement.setAttribute('data-theme', theme);
}

function measureChip(chip: Element) {
  const style = getComputedStyle(chip);
  const ground = effectiveBackground(chip, window);
  const panel = effectiveBackground(chip.closest('.ui-dropdown__panel')!, window);
  expect(ratio(parseColour(style.color), ground), 'chip text >= 4.5:1').toBeGreaterThanOrEqual(4.5);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const visible = !['none', 'hidden', ''].includes(style[`border${side}Style`]);
    expect(!visible || parseFloat(style[`border${side}Width`]) === 0, 'no chip edge').toBe(true);
  }
  const separation = ratio(ground, panel);
  expect(separation >= 1.15 && separation <= 1.35, 'soft fill remains distinguishable without a strong boundary').toBe(true);
  return separation;
}

const separation: Record<string, number> = {};
const measured: Record<string, number> = { light: 0, dark: 0 };

describe('a dropdown chip is a soft badge', () => {
  it('finds the React Dropdown stories', () => {
    expect(SUBJECTS.length, 'the stories and the tone fixture').toBeGreaterThan(5);
  });

  for (const theme of ['light', 'dark']) {
    for (const [name, build] of SUBJECTS) {
      it(`${name}, ${theme}`, () => {
        sheet(theme);
        const { vars } = kitCssFor(theme);
        const { container } = render(<>{build()}<Badge>Reference</Badge></>);
        const reference = getComputedStyle(container.querySelector('.ui-badge')!);
        for (const chip of container.querySelectorAll('.ui-dropdown__badge:not(.is-live)')) {
          separation[theme] = measureChip(chip);
          measured[theme]++;
        }
        for (const chip of container.querySelectorAll('.ui-dropdown__badge')) {
          const style = getComputedStyle(chip);
          for (const prop of ['fontSize', 'fontWeight', 'borderRadius', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'] as const) {
            expect(style[prop], `${name}: standard badge ${prop}`).toBe(reference[prop]);
          }
        }
        const bodyInk = rgbOf(substitute(vars.get('--text'), vars));
        for (const label of container.querySelectorAll('.ui-dropdown__item.is-selected .ui-dropdown__label, .ui-dropdown__badge.is-accent, .ui-dropdown__badge.is-neutral')) {
          expect(getComputedStyle(label).color, `${name}: body ink outside status and tick`).toBe(bodyInk);
        }
      });
    }
  }

  // Reads what the cases above recorded, so it stays below them.
  it('covers every non-live chip the subjects draw, and the two themes separate alike', () => {
    for (const theme of ['light', 'dark']) {
      // Seven today: the EOL, New and Beta chips in the stories and the four in the tone fixture.
      expect(measured[theme], `the non-live chips measured in ${theme}`).toBeGreaterThanOrEqual(7);
    }
    expect(Math.abs(separation.light - separation.dark), 'dark fill separation roughly matches light').toBeLessThan(0.05);
  });

  for (const theme of ['light', 'dark']) {
    it(`rejects a missing fill and a strong edge in ${theme}`, () => {
      sheet(theme);
      const { container } = render(SUBJECTS[SUBJECTS.length - 1][1]());
      const chip = container.querySelector('.ui-dropdown__badge.is-state') as HTMLElement;
      expect(chip).not.toBeNull();
      chip.style.background = 'transparent';
      expect(() => measureChip(chip)).toThrow(/soft fill/);
      chip.style.background = '';
      chip.style.border = '1px solid currentColor';
      expect(() => measureChip(chip)).toThrow(/no chip edge/);
    });
  }
});
