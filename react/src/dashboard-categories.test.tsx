/* Rule: the dashboard's spend-by-category block is the kit Chart, drawn between
 * the figures and the exceptions table, with its legend on so the four
 * fabricated categories are named, and its chart-and-table switch present.
 * why: #850 round 42 — the owner approved option A as rendered */
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as Dashboard from '../../stories/apps/FinanceDashboard.stories.tsx';

const mount = (story: unknown) => {
  const Story = () => (story as { render: () => ReactElement }).render();
  const box = document.body.appendChild(document.createElement('div'));
  act(() => createRoot(box).render(<Story />));
  return box;
};

test('the dashboard draws a spend-by-category chart between its figures and its exceptions table', () => {
  const doc = mount(Dashboard.Default);
  const body = doc.querySelector('.ui-app__body');
  assert.ok(body, 'the dashboard has no app body');

  const kids = [...body!.children];
  const stats = kids.findIndex((el) => el.classList.contains('ui-stats'));
  const spend = kids.findIndex((el) => el.classList.contains('ui-card') && el.querySelector('.ui-chart--stacked-columns'));
  const table = kids.findIndex((el) => el.querySelector('.ui-table'));
  assert.ok(stats >= 0 && spend >= 0 && table >= 0,
    'the figures, the chart card and the exceptions table must all be direct children of the body');
  assert.equal(spend, stats + 1, 'the spend-by-category block is not directly after the figures');
  assert.equal(table, spend + 1, 'the exceptions table does not directly follow the spend-by-category block');
});

test('the spend chart names its four categories in the legend and offers the chart-and-table switch', () => {
  const doc = mount(Dashboard.Default);
  const spend = [...doc.querySelectorAll('.ui-card')].find((card) => card.querySelector('.ui-chart--stacked-columns'));
  assert.ok(spend, 'the dashboard has no spend-by-category chart card');

  const names = [...spend!.querySelectorAll('.ui-chart__legend .ui-chart__key')].map((key) => key.textContent!.trim());
  assert.deepEqual(names, ['Payroll', 'Hosting', 'Marketing', 'Office'],
    'the legend does not name the four fabricated categories');
  assert.ok(spend!.querySelector('.ui-seg'), 'the spend chart offers no chart-and-table switch');
});
