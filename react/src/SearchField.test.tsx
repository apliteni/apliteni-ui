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
    .toMatch(/\.ui-input:focus-visible,[\s\S]{0,200}?\{[^}]*outline:\s*2px solid transparent;[^}]*box-shadow:\s*var\(--ring\)/);
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

it('passes axe with no visible label', async () => {
  const { container } = render(<SearchField ariaLabel="Search invoices" placeholder="Vendor" />);
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(results.violations.map(v => v.id)).toEqual([]);
});
