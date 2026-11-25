import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import axe from 'axe-core';
import { SearchField } from './SearchField';

// Vite rewrites a literal new URL(..., import.meta.url) into an asset URL, so the
// path goes through a variable, the way Field.test.tsx reads the kit.
const readRepo = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

afterEach(cleanup);

// The field owns no CSS, so what it renders is the whole of what it is: the
// group the kit's stylesheet styles, the glyph slot, and one native control on
// .ui-input. A class dropped here is a field that stops being painted.
it('is a group, a glyph slot and one native search input', () => {
  const { container } = render(<SearchField ariaLabel="Search invoices" />);
  const group = container.firstElementChild!;
  expect(group.tagName).toBe('DIV');
  expect(group.className).toBe('ui-input-group');
  const [glyph, control] = Array.from(group.children);
  expect(group.children).toHaveLength(2);
  expect(glyph.className).toBe('ui-input-group__icon');
  expect(glyph.querySelectorAll('svg')).toHaveLength(1);
  // The glyph names nothing: the control carries the name.
  expect(glyph.textContent).toBe('');
  expect(control.tagName).toBe('INPUT');
  expect(control.getAttribute('type')).toBe('search');
  expect(control.className.split(/\s+/)).toContain('ui-input');
});

it('is a searchbox named by ariaLabel, with no visible label', () => {
  const { container } = render(<SearchField ariaLabel="Search invoices" placeholder="Vendor" />);
  expect(screen.getByRole('searchbox', { name: 'Search invoices' })).toBe(container.querySelector('input'));
  expect(container.querySelector('label')).toBeNull();
  expect(container.textContent).toBe('');
});

// The kit's recorded answer, not an omission: src/styles/input.css explains why a
// search field draws one glyph and not two, and #517 was decided to keep it.
it('draws no clear button and leaves the browser none to draw', () => {
  const { container } = render(<SearchField ariaLabel="Search invoices" defaultValue="Northwind" />);
  expect(container.querySelector('button')).toBeNull();
  expect(container.querySelectorAll('svg')).toHaveLength(1);
  const css = readRepo('../../src/styles/input.css');
  expect(css).toMatch(/\.ui-input\[type="search"\]::-webkit-search-cancel-button\s*\{[^}]*display:\s*none/);
});

// Nothing here paints a focus indicator, so the field has to be reaching the kit's.
it('keeps the kit ring on its one focusable part', async () => {
  const { container } = render(<SearchField ariaLabel="Search invoices" />);
  await userEvent.tab();
  const field = container.querySelector('input')!;
  expect(document.activeElement).toBe(field);
  expect(field.className.split(/\s+/)).toContain('ui-input');
  expect(readRepo('../../src/styles/input.css'))
    .toMatch(/\.ui-input:focus-visible,[\s\S]{0,200}?\{[^}]*outline:\s*var\(--ring\);[^}]*outline-offset:\s*var\(--ring-offset\)/);
});

it('forwards its ref, its className and the native input props', async () => {
  const ref = createRef<HTMLInputElement>();
  const typed: string[] = [];
  render(<SearchField ref={ref} ariaLabel="Search invoices" className="rx-wide" disabled={false}
    autoComplete="off" name="q" onChange={e => typed.push(e.currentTarget.value)} />);
  const field = screen.getByRole('searchbox');
  expect(ref.current).toBe(field);
  // Joined onto the kit class, never in place of it.
  expect(field.className.split(/\s+/).sort()).toEqual(['rx-wide', 'ui-input']);
  expect(field.getAttribute('autocomplete')).toBe('off');
  expect(field.getAttribute('name')).toBe('q');
  await userEvent.type(field, 'ab');
  expect(typed).toEqual(['a', 'ab']);
});

// A caller cannot turn it into some other field: `type` and the glyph are fixed,
// and `aria-label` cannot be set past the required name.
it('ignores a type or an aria-label a caller spreads over it', () => {
  const props = { type: 'password', 'aria-label': 'Password' } as Record<string, unknown>;
  render(<SearchField ariaLabel="Search invoices" {...props} />);
  const field = screen.getByRole('searchbox', { name: 'Search invoices' });
  expect(field.getAttribute('type')).toBe('search');
});

// The row rule is the reason the field carries no width of its own. Both halves
// are read from the kit's sheet, because JSDOM resolves neither flex nor @media.
it('takes the toolbar row rule at both of its widths', () => {
  const { container } = render(<div className="ui-toolbar"><SearchField ariaLabel="Search invoices" /></div>);
  expect(container.querySelector('.ui-toolbar > .ui-input-group')).not.toBeNull();
  const css = readRepo('../../src/styles/layout.css');
  expect(css).toMatch(/\.ui-toolbar > \.ui-input-group \{[^}]*flex: 1 1 6rem/);
  // One column: the field takes the line instead of sharing it with two chips.
  expect(css).toMatch(/@media \(max-width: 560px\) \{\s*\.ui-toolbar > \.ui-input,\s*\.ui-toolbar > \.ui-input-group \{[^}]*flex-basis: 100%/);
});

// A caller sizes the whole group, icon included, when the field should fit its
// expected input instead of growing across the row.
it('sizes the group when width is set, and leaves the width to the row otherwise', () => {
  const sized = render(<SearchField ariaLabel="Search sales" width="24ch" />).container.firstElementChild as HTMLElement;
  expect(sized.style.width).toBe('24ch');
  expect(sized.style.flex).toMatch(/none|0 0 auto/);
  cleanup();
  const plain = render(<SearchField ariaLabel="Search invoices" />).container.firstElementChild as HTMLElement;
  expect(plain.getAttribute('style')).toBeNull();
});

it('passes axe with no visible label', async () => {
  const { container } = render(<SearchField ariaLabel="Search invoices" placeholder="Vendor" />);
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(results.violations.map(v => v.id)).toEqual([]);
});

// ---- the small size, #822 ---------------------------------------------------
// Reads which rules of one kit sheet reach a rendered element, and under which media
// condition. Limits: JSDOM resolves no @media and no layout, so this proves where a
// declaration applies, not the pixels. The 32px and 40px heights are measured in a
// browser for the pull request, against the Toolbar at the small size story.
function declared(file: string, el: Element) {
  const style = document.createElement('style');
  style.textContent = readRepo(`../../src/styles/${file}`);
  document.head.append(style);
  const found: { media: string | null; prop: string; value: string }[] = [];
  const walk = (rules: CSSRuleList, media: string | null) => {
    for (const rule of Array.from(rules)) {
      if ('media' in rule) walk((rule as CSSMediaRule).cssRules, (rule as CSSMediaRule).media.mediaText);
      else if ('selectorText' in rule && el.matches((rule as CSSStyleRule).selectorText)) {
        // From the text, because JSDOM empties a longhand that a var() shorthand sets.
        for (const pair of (rule as CSSStyleRule).style.cssText.split(/;\s*/).filter(Boolean)) {
          const at = pair.indexOf(':');
          found.push({ media, prop: pair.slice(0, at).trim(), value: pair.slice(at + 1).trim() });
        }
      }
    }
  };
  try { walk(style.sheet!.cssRules, null); } finally { style.remove(); }
  return (prop: string) => found.filter(d => d.prop === prop).map(d => `${d.media ?? 'all'} ${d.value}`);
}

const FINE = 'not (pointer: coarse)';
const COARSE = '(pointer: coarse)';
const smallRow = (size?: 'sm') => render(<div className="ui-toolbar ui-toolbar--split">
  <SearchField ariaLabel="Search invoices" size={size} />
  <div className="ui-dropdown"><button className="ui-dropdown__trigger">Any currency</button></div>
  <fieldset className="ui-filter-bar"><fieldset className="ui-filter-bar__chip">
    <button className="ui-dropdown__trigger">Pending</button><button className="ui-filter-bar__remove">×</button>
  </fieldset></fieldset>
  <button className="ui-btn ui-btn--sm">New invoice</button>
</div>).container;

it('takes the small class only from size="sm"', () => {
  const field = (size?: 'sm') => { cleanup(); render(<SearchField ariaLabel="Search invoices" size={size} />); return screen.getByRole('searchbox'); };
  expect(field('sm').className.split(/\s+/).sort()).toEqual(['ui-input', 'ui-input--sm']);
  expect(field().className).toBe('ui-input');
});

it('is 32px with the dense rows\' text to a mouse, and 40px with 16px text on a touch screen', () => {
  const read = declared('input.css', smallRow('sm').querySelector('input')!);
  // A chip's height on touch, with the base 16px text that iOS does not zoom. #832
  expect(read('min-height')).toEqual([`${FINE} var(--btn-height-sm)`, `${COARSE} var(--ui-filter-row-h, 40px)`]);
  expect(read('height')).toEqual([`${COARSE} var(--ui-filter-row-h, 40px)`]);
  expect(read('font-size')).toEqual(['all var(--text-base)', `${FINE} var(--text-sm)`]);
  expect(read('line-height')).toEqual([`${FINE} var(--leading-tight)`]);
  // The one-line field corner, also on the small field. #874
  expect(read('border-radius')).toEqual(['all var(--radius-lg)', `${FINE} var(--radius-lg)`]);
  // The group's 42px glyph inset outranks the small field's side padding.
  expect(read('padding-left')).toContain('all 42px');
  cleanup();
  const full = declared('input.css', smallRow().querySelector('input')!);
  expect(full('min-height')).toEqual([]);
  expect(full('font-size')).toEqual(['all var(--text-base)']);
});

it('stands a small row\'s button at the chip height on a touch screen, and no full row', () => {
  const button = (size?: 'sm') => { cleanup(); return declared('filter-bar.css', smallRow(size).querySelector('.ui-btn')!)('min-height'); };
  expect(button('sm')).toEqual([`${COARSE} var(--ui-filter-row-h)`]);
  expect(button()).toEqual([]);
});

// A create row directly above that bar stands at its height too, and only there. #832
it('stands a create row\'s button above a small row at the chip height on a touch screen', () => {
  const rows = (size?: 'sm', apart = false) => { cleanup(); return render(<>
    <div className="ui-toolbar"><button className="ui-btn ui-btn--sm">New invoice</button></div>
    {apart && <p>Between</p>}
    <div className="ui-toolbar"><SearchField ariaLabel="Search invoices" size={size} /></div>
  </>).container.querySelector('.ui-btn')!; };
  expect(declared('filter-bar.css', rows('sm'))('min-height')).toEqual([`${COARSE} var(--ui-filter-row-h)`]);
  expect(declared('filter-bar.css', rows())('min-height')).toEqual([]);
  expect(declared('filter-bar.css', rows('sm', true))('min-height')).toEqual([]);
});

it('stands its toolbar and filter bar at the small row to a mouse', () => {
  const row = smallRow('sm');
  for (const el of [row.firstElementChild!, row.querySelector('.ui-filter-bar')!]) {
    expect(declared('filter-bar.css', el)('--ui-filter-row-h')).toContain(`${FINE} var(--btn-height-sm)`);
  }
  expect(declared('filter-bar.css', row.querySelector('.ui-filter-bar__chip .ui-dropdown__trigger')!)('min-height'))
    .toContain(`${FINE} calc(var(--btn-height-sm) - 2px)`);
  cleanup();
  const full = smallRow();
  for (const el of [full.firstElementChild!, full.querySelector('.ui-filter-bar')!]) {
    expect(declared('filter-bar.css', el)('--ui-filter-row-h').filter(d => d.startsWith(FINE))).toEqual([]);
  }
});

it('stops a small field at a small panel\'s width, and gives the line back at one column', () => {
  const read = declared('layout.css', smallRow('sm').querySelector('.ui-input-group')!);
  expect(read('max-width')).toEqual([`${FINE} var(--panel-sm)`, '(max-width: 560px) none']);
  cleanup();
  expect(declared('layout.css', smallRow().querySelector('.ui-input-group')!)('max-width')).toEqual([]);
});

it('gives a toolbar trigger a chip\'s height on a touch screen', () => {
  const read = declared('layout.css', smallRow('sm').querySelector('.ui-toolbar > .ui-dropdown')!);
  expect(read('min-height')).toEqual(['(pointer: coarse) var(--ui-filter-row-h)']);
});

// Artur's "fix alignment" on #822 and #826. In a browser the text and glyph centres of the
// small row met within 1.54px after these three rules, against 4.29px before. Limits: this
// reads the rules that move a centre, not the centres. A new control in the row needs
// its own line here.
it('puts the text and the glyphs of a small row on one centre', () => {
  const row = smallRow('sm');
  // An inline svg sat on its slot's baseline, 2px below the field's centre, at every size
  // and in every glyph group, a TextField's among them (#826).
  const glyph = (group: Element) => declared('input.css', group.querySelector('.ui-input-group__icon svg')!)('display');
  expect(glyph(row)).toEqual(['all block']);
  expect(glyph(render(<SearchField ariaLabel="Search invoices" />).container)).toEqual(['all block']);
  const other = render(<div className="ui-input-group"><span className="ui-input-group__icon"><svg /></span><input className="ui-input" /></div>);
  expect(glyph(other.container)).toEqual(['all block']);
  // The trigger takes the button's line, so the two baselines meet: `normal` set it 0.3px low.
  const trigger = row.querySelector('.ui-toolbar > .ui-dropdown > .ui-dropdown__trigger')!;
  const button = declared('button.css', row.querySelector('.ui-btn')!)('line-height');
  expect(declared('dropdown.css', trigger)('line-height')).toEqual(button.filter(d => d.startsWith('all ')));
  // A chip is a fieldset, so its trigger fills it on every pointer: the touch chip's text sat 2px high.
  expect(declared('filter-bar.css', row.querySelector('.ui-filter-bar__chip .ui-dropdown__trigger')!)('min-height'))
    .toContain('all calc(var(--ui-filter-row-h) - 2px - 2 * var(--space-1))');
});
