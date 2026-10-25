/* Rule: the finance report's figures are the kit's stat band, and so is the skeleton
 * that holds their place. The band owns the fold, measured and pinned in
 * src/styles/stat.test.js, so what is left to hold here is that the screen uses it and
 * brings no layout of its own. The React half of stories/apps/finance-kpis.test.js (#429).
 * why: docs/components.md#stat-bands */
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { StatBand } from './primitives/StatBand';
import * as Report from '../../stories/apps/FinanceReport.stories.tsx';

const mount = (story: unknown) => {
  const Story = () => (story as { render: () => ReactElement }).render();
  const box = document.body.appendChild(document.createElement('div'));
  act(() => createRoot(box).render(<Story />));
  return box;
};

describe('the finance report figures', () => {
  it('are a stat band, one figure per term', () => {
    const band = mount(Report.Default).querySelector('.ui-stats');
    expect(band, 'the screen no longer draws its figures with the kit band').not.toBeNull();
    expect([...band!.querySelectorAll('dt')].map((d) => d.textContent)).toEqual(['Money in', 'Money out', 'Net result']);
  });

  it('bring no layout of their own', () => {
    for (const story of [Report.Default, Report.Loading]) {
      const html = mount(story).innerHTML;
      expect(html, 'a style block is back beside the band').not.toMatch(/<style/);
      expect(html, 'the screen is folding the figures itself again').not.toMatch(/@container|@media/);
    }
  });

  it('keep the skeleton in the band it stands in for', () => {
    const figures = mount(Report.Default);
    const loading = mount(Report.Loading);
    const band = loading.querySelector('.ui-stats');
    expect(band, 'the loading figures are not in a band, so they fold differently from what replaces them').not.toBeNull();
    expect(band!.className, 'the skeleton sits in a different layout from the figures that replace it')
      .toBe(figures.querySelector('.ui-stats')!.className);
    // Either both carry a caption line or neither does, and `.ui-stats__basis` is
    // confirmed live first, against a band built with an explicit caption.
    const sanity = document.createElement('div');
    sanity.innerHTML = renderToStaticMarkup(<StatBand id="fk-sanity" basis="sanity" stats={[{ label: 'A', value: '1' }]} />);
    const captions = (root: Element) => root.querySelectorAll('.ui-stats__basis').length;
    expect(captions(sanity), '.ui-stats__basis no longer matches the caption a band with a basis draws').toBe(1);
    expect(captions(figures), 'the report totals carry no caption (round r32), so its band must draw none').toBe(0);
    expect(captions(loading), 'the skeleton reserves a different number of caption lines than the figures carry').toBe(captions(figures));
    expect(band!.querySelectorAll('.ui-stats__list > .ui-stat').length, 'the skeleton reserves a different number of figures than arrive')
      .toBe(figures.querySelectorAll('.ui-stat').length);
  });
});
