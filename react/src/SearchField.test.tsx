import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import axe from 'axe-core';
import { input } from '@apliteni/apliteni-ui';
import { SearchField } from './SearchField';

// Vite rewrites a literal new URL(..., import.meta.url) into an asset URL, so the
// path goes through a variable, the way Field.test.tsx reads the kit.
const readRepo = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

afterEach(cleanup);

/** Tag, sorted attributes and children of a tree, so two renderers compare. */
function structure(el: Element): unknown {
  return {
    tag: el.tagName,
    attrs: Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value.trim()]).sort()),
    children: Array.from(el.childNodes).map(n => n instanceof Element ? structure(n) : n.textContent),
  };
}

it('renders the vanilla search input group, attribute for attribute', () => {
  const { container } = render(
    <SearchField ariaLabel="Search invoices" placeholder="Vendor" defaultValue="Northwind" name="q" />);
  const reference = document.createElement('div');
  reference.innerHTML = input({
    type: 'search', icon: 'search', ariaLabel: 'Search invoices',
    placeholder: 'Vendor', value: 'Northwind', name: 'q',
  });
  expect(structure(container.firstElementChild!)).toEqual(structure(reference.firstElementChild!));
});

it('is a searchbox named by ariaLabel, with no visible label', () => {
  const { container } = render(<SearchField ariaLabel="Search invoices" placeholder="Vendor" />);
  expect(screen.getByRole('searchbox', { name: 'Search invoices' })).toBe(container.querySelector('input'));
  expect(container.querySelector('label')).toBeNull();
  // The glyph is the only other node, and it says nothing: the group's text is empty.
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
    autoComplete="off" onChange={e => typed.push(e.currentTarget.value)} />);
  const field = screen.getByRole('searchbox');
  expect(ref.current).toBe(field);
  expect(field.className.split(/\s+/).sort()).toEqual(['rx-wide', 'ui-input']);
  expect(field.getAttribute('autocomplete')).toBe('off');
  await userEvent.type(field, 'ab');
  expect(typed).toEqual(['a', 'ab']);
});

it('takes the toolbar row rule, so it is the control that grows', () => {
  const { container } = render(<div className="ui-toolbar"><SearchField ariaLabel="Search invoices" /></div>);
  const group = container.querySelector('.ui-toolbar > .ui-input-group');
  expect(group).not.toBeNull();
  expect(readRepo('../../src/styles/layout.css'))
    .toMatch(/\.ui-toolbar > \.ui-input-group \{[^}]*flex: 1 1 6rem/);
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
