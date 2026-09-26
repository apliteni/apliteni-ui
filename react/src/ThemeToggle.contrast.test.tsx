// Measures source CSS in JSDOM, not antialiased pixels or host overrides.
// Browser captures separately check the 17px glyph at 1×.
import { afterEach, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { ThemeToggle } from './ThemeToggle';
// @ts-expect-error -- shared, independently tested vanilla contrast arithmetic.
import { composite, desugar, effectiveBackground, kitCssFor, parseColour, ratio, substitute, tokensFor } from '../../stories/lib/contrast.js';

const localSheets = Object.keys(import.meta.glob('./**/*.css'));
afterEach(() => { cleanup(); document.querySelector('[data-glyph-test]')?.remove(); });

for (const theme of ['light', 'dark']) {
  it(`theme glyphs match control ink and clear 3:1 in ${theme}`, () => {
    const style = document.createElement('style');
    style.dataset.glyphTest = '';
    style.textContent = kitCssFor(theme).css + localSheets.map(path =>
      desugar(substitute(readFileSync(new URL(path, import.meta.url), 'utf8'), tokensFor(theme)))).join('\n');
    document.head.appendChild(style);
    let measured = 0;
    const glyphs = new Set<string>();
    for (const choice of ['dark', 'light', 'auto']) {
      document.documentElement.setAttribute('data-theme-choice', choice);
      const { container, unmount } = render(<ThemeToggle />);
      document.documentElement.setAttribute('data-theme', theme);
      const button = container.querySelector('button')!;
      const svg = button.querySelector('svg')!;
      expect(svg).not.toBeNull();
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      glyphs.add(svg.innerHTML);
      for (const state of ['', 'hover', 'focus-visible', 'active']) {
        button.setAttribute('data-ui-state', state);
        const cs = getComputedStyle(svg);
        const ink = parseColour(cs.color);
        expect(ink, 'glyph ink resolves').not.toBeNull();
        const bg = effectiveBackground(svg, window);
        expect(bg, 'solid background resolves').not.toBe('IMAGE');
        let opacity = 1;
        for (let el: Element | null = svg; el; el = el.parentElement) {
          opacity *= Number.parseFloat(getComputedStyle(el).opacity || '1');
        }
        const contrast = ratio(composite([ink[0], ink[1], ink[2], ink[3] * opacity], bg), bg);
        expect(contrast, `${choice}/${state || 'rest'} contrast`).toBeGreaterThanOrEqual(3);
        expect(cs.color, 'same ink as the control, not a fainter accent').toBe(getComputedStyle(button).color);
        measured++;
      }
      unmount();
    }
    expect(glyphs.size, 'three distinct theme glyphs').toBe(3);
    expect(measured, 'all choices × interaction states measured').toBe(12);
  }, 30_000);
}
