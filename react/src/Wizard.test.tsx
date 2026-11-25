import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Wizard, type WizardFinal, type WizardStep } from './Wizard';
// @ts-expect-error -- untyped JS module, shared across the contrast gates.
import { AA_LARGE, AA_TEXT, colourOf, ratio, tokensFor } from '../../stories/lib/contrast.js';

// Limits: JSDOM has no layout, so this reads the roles, names, states, focus and the
// stylesheet's text. How the marks look is the story's and the contrast walk's to show.
afterEach(cleanup);

const steps = (states: WizardStep['state'][]): WizardStep[] => ['Sources', 'Rows', 'Documents'].map((label, i) =>
  ({ id: label.toLowerCase(), label, state: states[i], content: <p>{label} text</p> }));
const final = (over: Partial<WizardFinal> = {}): WizardFinal =>
  ({ label: 'Finish', action: 'Close month', onAction: () => {}, reason: 'Complete all three checks first.', ...over });
const rows = () => within(screen.getByRole('list', { name: 'Month checks' })).getAllByRole('button', { name: /, step \d+ of \d+$/ });

// The name starts with the visible words, so a voice command that says them reaches the
// step (axe's label-content-name-mismatch). stories/three-column.test.js runs that rule.
it('names each step by its visible words, its state and its place, in an ordered list', () => {
  render(<Wizard label="Month checks" steps={steps(['done', 'blocked', 'todo'])} final={final()} />);
  expect(screen.getByRole('list', { name: 'Month checks' }).tagName).toBe('OL');
  expect(rows().map(row => row.getAttribute('aria-label'))).toEqual([
    '1. Sources, Done, step 1 of 4', '2. Rows, Blocked, step 2 of 4', '3. Documents, To do, step 3 of 4', '4. Finish, To do, step 4 of 4']);
  // The state is a word as well as a mark, so it never rests on colour alone.
  expect(rows().map(row => row.querySelector('.ui-wizard__state')?.textContent)).toEqual(['Done', 'Blocked', 'To do', 'To do']);
  expect(rows().map(row => row.querySelector('.ui-wizard__mark')?.className.split('--')[1])).toEqual(['done', 'blocked', 'todo', 'todo']);
});

it('marks only the step to work on as the current step', () => {
  render(<Wizard label="Month checks" steps={steps(['done', 'current', 'todo'])} final={final()} />);
  expect(rows().map(row => row.getAttribute('aria-current'))).toEqual([null, 'step', null, null]);
});

it('opens one step, the step to work on, and a press opens another', () => {
  render(<Wizard label="Month checks" steps={steps(['done', 'current', 'todo'])} final={final()} />);
  expect(rows().map(row => row.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false', 'false']);
  expect(screen.getByRole('region', { name: /Rows/ })).toHaveTextContent('Rows text');
  fireEvent.click(rows()[0]);
  expect(rows().map(row => row.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false', 'false']);
  expect(screen.getByText('Rows text').closest('[role="region"]')).not.toBeVisible();
  expect(screen.getByText('Sources text')).toBeVisible();
});

it('keeps the final action off and says why until every earlier step is done', () => {
  const onAction = vi.fn();
  const { rerender } = render(<Wizard label="Month checks" steps={steps(['done', 'done', 'blocked'])} final={final({ onAction })} />);
  const off = screen.getByRole('button', { name: 'Close month' });
  expect(off).toBeDisabled();
  expect(off).toHaveAccessibleDescription('Complete all three checks first.');
  expect(rows()[3]).toHaveAttribute('aria-label', '4. Finish, To do, step 4 of 4');
  rerender(<Wizard label="Month checks" steps={steps(['done', 'done', 'done'])} final={final({ onAction })} />);
  const on = screen.getByRole('button', { name: 'Close month' });
  expect(on).toBeEnabled();
  expect(on).toHaveClass('ui-btn--primary');
  expect(screen.queryByText('Complete all three checks first.')).toBeNull();
  expect(rows()[3]).toHaveAttribute('aria-current', 'step');
  fireEvent.click(on);
  expect(onAction).toHaveBeenCalledTimes(1);
  rerender(<Wizard label="Month checks" steps={steps(['done', 'done', 'done'])} final={final({ onAction, done: true, content: <p role="status">October is closed.</p> })} />);
  expect(screen.queryByRole('button', { name: 'Close month' })).toBeNull();
  expect(rows()[3]).toHaveAttribute('aria-label', '4. Finish, Done, step 4 of 4');
  expect(screen.getByRole('status')).toHaveTextContent('October is closed.');
});

it('with no steps before it, the final step is the step to work on', () => {
  render(<Wizard label="Month checks" steps={[]} final={final()} />);
  expect(rows()).toHaveLength(1);
  expect(rows()[0]).toHaveAttribute('aria-label', '1. Finish, Current, step 1 of 1');
  expect(screen.getByRole('button', { name: 'Close month' })).toBeEnabled();
});

it('moves focus with Up, Down, Home and End, and wraps at the ends', () => {
  render(<Wizard label="Month checks" steps={steps(['current', 'todo', 'todo'])} final={final()} />);
  rows()[0].focus();
  const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key });
  press('ArrowDown'); expect(rows()[1]).toHaveFocus();
  press('End'); expect(rows()[3]).toHaveFocus();
  press('ArrowDown'); expect(rows()[0]).toHaveFocus();
  press('ArrowUp'); expect(rows()[3]).toHaveFocus();
  press('Home'); expect(rows()[0]).toHaveFocus();
  // A move does not open a step: Enter or Space presses the button.
  expect(rows()[0]).toHaveAttribute('aria-expanded', 'true');
});

it('opens and focuses the next step when the step to work on moves on', () => {
  const { rerender } = render(<Wizard label="Month checks" steps={steps(['current', 'todo', 'todo'])} final={final()} />);
  rows()[0].focus();
  rerender(<Wizard label="Month checks" steps={steps(['done', 'current', 'todo'])} final={final()} />);
  expect(rows()[1]).toHaveAttribute('aria-expanded', 'true');
  expect(rows()[1]).toHaveFocus();
});

it('leaves focus where it is when the reader works outside the wizard', () => {
  const { rerender } = render(<><button type="button">Elsewhere</button>
    <Wizard label="Month checks" steps={steps(['current', 'todo', 'todo'])} final={final()} /></>);
  screen.getByRole('button', { name: 'Elsewhere' }).focus();
  rerender(<><button type="button">Elsewhere</button>
    <Wizard label="Month checks" steps={steps(['done', 'current', 'todo'])} final={final()} /></>);
  expect(rows()[1]).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
});

it('follows the open step it is given and reports a press', () => {
  const onOpenChange = vi.fn();
  render(<Wizard label="Month checks" steps={steps(['done', 'current', 'todo'])} final={final()} open="sources" onOpenChange={onOpenChange} />);
  expect(rows()[0]).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(rows()[2]);
  expect(onOpenChange).toHaveBeenCalledWith('documents');
  expect(rows()[0]).toHaveAttribute('aria-expanded', 'true');
});

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Wizard.css'), 'utf8');

// Limits: the stylesheet's values, not painted pixels. The ground is the open step's
// tint, and the inks are the step's words and the marks that can stand on it.
it('keeps the open step\'s words and marks legible on its tint, in both themes and every accent', () => {
  const ground = /\.ui-wizard \.ui-wizard__step\.is-active \{[^}]*background: ([^;]+);/.exec(css)?.[1];
  expect(ground).toBe('color-mix(in srgb, var(--accent) 14%, var(--surface))');
  const accents = ['default', ...new Set([...readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/tokens/accents.css'), 'utf8')
    .matchAll(/\[data-accent="([\w-]+)"\]/g)].map(m => m[1]))];
  expect(accents.length).toBeGreaterThanOrEqual(4);
  const low: string[] = [];
  for (const theme of ['light', 'dark']) for (const accent of accents) {
    const vars = tokensFor(theme, accent);
    const behind = colourOf(ground!, vars);
    for (const [ink, floor] of [['--text', AA_TEXT], ['--strong', AA_TEXT], ['--muted', AA_LARGE], ['--accent', AA_LARGE], ['--signal-solid-danger', AA_LARGE]] as const) {
      const r = ratio(colourOf(`var(${ink})`, vars), behind);
      if (!(r >= floor)) low.push(`${theme}/${accent} ${ink} ${r.toFixed(2)}:1`);
    }
  }
  expect(low).toEqual([]);
});

it('strokes the status marks at 1.5 CSS px or wider', () => {
  const px = (state: string) => {
    const m = css.match(new RegExp(`\\.ui-wizard__mark--${state} svg \\{ width: var\\(--space-(\\d+)\\);[^}]*stroke-width: ([\\d.]+);`))!;
    return Number(m[2]) * Number(m[1]) * 4 / 24;
  };
  expect(px('done')).toBeGreaterThanOrEqual(1.5);
  expect(px('blocked')).toBeGreaterThanOrEqual(1.5);
  expect(css).toMatch(/\.ui-wizard__mark--todo \{ border: 1\.5px solid/);
  expect(css).toMatch(/\.ui-wizard__mark--current \{ border: 1\.5px solid/);
});
