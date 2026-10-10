// A readout a React story renders as a picture has to stay open.
//
// A picture whose host is wired is live: a pointer crossing its chart re-fills and
// re-places it, leaving takes it down, and nothing brings it back. The page then
// shows its "do" without the readout the caption describes. So every story is
// mounted, every picture walked over with a pointer, focus and Escape, and each
// has to come out open and unchanged.
//
// The vanilla gate (stories/tooltip-specimens.test.js) feeds HTML strings to
// wireTooltip(); React stories mount, and their wiring is the component's own.
// Same contract, its own coverage count.
//
// why: docs/components.md#the-react-tooltip
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { ReactElement } from 'react';

type Story = { render?: (args: unknown, ctx: unknown) => ReactElement; args?: Record<string, unknown> };
type StoryModule = { default?: Story } & Record<string, unknown>;

// The glob Storybook uses (react/.storybook/main.ts), so a new story file is in
// the gate the moment it exists.
const modules = import.meta.glob<StoryModule>('./**/*.stories.tsx', { eager: true });
const files = Object.keys(modules).sort();

afterEach(cleanup);

// Every mark a readout's host holds, crossed the way a pointer and a keyboard
// would cross them, then the host left and Escape pressed. jsdom lays nothing
// out, so this reads the open state and the markup, never where a readout lands —
// Tooltip.test.tsx holds that with supplied rects.
function walk(host: Element) {
  for (const mark of host.querySelectorAll('[data-tip-value]')) {
    fireEvent.mouseOver(mark);
    fireEvent.focus(mark);
    fireEvent.blur(mark);
  }
  fireEvent.mouseOut(host);
  fireEvent.keyDown(document.body, { key: 'Escape' });
}

it('a readout a React story renders as a picture is still open after the page is used', () => {
  const problems: string[] = [];
  let specimens = 0;
  let live = 0;

  for (const file of files) {
    const mod = modules[file];
    const def = mod.default || {};
    for (const [name, story] of Object.entries(mod)) {
      if (name === 'default' || !story || typeof story !== 'object') continue;
      const renderStory = (story as Story).render || def.render;
      if (typeof renderStory !== 'function') continue;
      const args = { ...def.args, ...(story as Story).args };
      // Stories use hooks, so the render fn has to BE a component.
      const Mounted = () => renderStory(args, { globals: { theme: 'dark', accent: 'default' }, args });
      const { container } = render(<Mounted />);

      // Subject: the picture. The React/Tooltip state stories open a live inline
      // readout at mount on purpose — a real trigger with its real focus ring,
      // which a picture cannot show — and using the page closes them.
      const opened: Element[] = [];
      for (const picture of container.querySelectorAll('[data-tip-picture]')) {
        specimens += 1;
        const tip = picture.querySelector('[data-tip]');
        if (!tip?.classList.contains('is-open')) {
          problems.push(`  ${file} → ${name}: a picture holds no open readout at all`);
          continue;
        }
        opened.push(tip);
        const before = tip.outerHTML;
        walk(picture);
        if (!tip.classList.contains('is-open')) {
          problems.push(`  ${file} → ${name}: the open readout "${tip.textContent}" was closed by using the page`);
        } else if (tip.outerHTML !== before) {
          problems.push(`  ${file} → ${name}: the open readout "${tip.textContent}" was re-filled or moved`);
        }
      }

      // The live readouts on the same page do answer, or the walk above proved nothing.
      for (const host of container.querySelectorAll('[data-tip-host]')) {
        const tip = host.querySelector('[data-tip]');
        const mark = host.querySelector('[data-tip-value]');
        if (!tip || !mark || opened.includes(tip)) continue;
        fireEvent.mouseOver(mark);
        if (tip.classList.contains('is-open')) live += 1;
        fireEvent.mouseOut(host);
      }
      cleanup();
    }
  }

  expect(specimens, `found ${specimens} pictures — a specimen went live, or the sweep is broken`).toBeGreaterThanOrEqual(3);
  expect(live, 'no wired readout opened under a pointer, so the walk over the open ones tested nothing').toBeGreaterThan(0);
  expect(problems.join('\n'), 'A readout rendered open did not stay open').toBe('');
});
