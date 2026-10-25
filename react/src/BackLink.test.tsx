// Shape gate for <BackLink>.
//
// Every case below was compared with the vanilla backLink() until #429 removed it. The
// shape both agreed on is stored as a snapshot, written in the commit where the
// comparison last passed. One difference was deliberate and is asserted by name at the
// foot of this file: the chevron goes through <Icon>, which wraps the svg in a span.
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { BackLink, type BackLinkProps } from './BackLink';
import { classesOfEl } from './test/classlist';

afterEach(cleanup);

/** The shape the link is held to, read off a rendered link. */
function shape(a: Element) {
  const svg = a.querySelector('svg');
  return {
    tag: a.tagName,
    classes: classesOfEl(a),
    href: a.getAttribute('href'),
    name: a.getAttribute('aria-label'),
    text: a.querySelector('.ui-back__label')?.textContent ?? null,
    // The arrow says "back" on screen and says nothing to a screen reader.
    glyphs: a.querySelectorAll('svg').length,
    glyphHidden: svg?.getAttribute('aria-hidden') ?? null,
    // Nothing in the markup walks the history.
    handlers: /onclick|history/i.test(a.outerHTML),
  };
}

/** Render one case and hold its shape; a case with nowhere to go renders nothing. */
function held(opts: BackLinkProps) {
  const { container } = render(<BackLink {...opts} />);
  const a = container.querySelector('a');
  expect(a ? shape(a) : { empty: container.innerHTML === '' }).toMatchSnapshot();
}

const CASES: [string, BackLinkProps][] = [
  ['a destination and a name', { href: '/invoices', label: 'Invoices' }],
  ['a query in the address', { href: '/invoices?status=open&page=3', label: 'Invoices' }],
  ['an ampersand in the name', { href: '/access', label: 'Access & agents' }],
  ['no name at all', { href: '/x' }],
  ['an empty name', { href: '/x', label: '' }],
  ['a name of spaces', { href: '/x', label: '   ' }],
  ['the word Back', { href: '/x', label: 'Back' }],
  ['the word back, lowercase', { href: '/x', label: 'back' }],
  ['a name that already says Back to', { href: '/invoices', label: 'Back to Invoices' }],
  ['a name that says back to, lowercase', { href: '/invoices', label: 'back to Invoices' }],
  ['a name that says BACK TO with its own spacing', { href: '/invoices', label: 'BACK TO  Invoices ' }],
  ['a name that says Back to across a tab', { href: '/invoices', label: 'Back to\tInvoices' }],
  ['a name that is only Back to', { href: '/x', label: 'Back to' }],
  ['a name that is Back to Back', { href: '/x', label: 'Back to Back' }],
  ['a destination whose own name starts with Back', { href: '/x', label: 'Backups' }],
  ['a destination called Back office', { href: '/x', label: 'Back office' }],
  ['a destination called Back toys', { href: '/x', label: 'Back toys' }],
  ['a long name', { href: '/reconciliation', label: 'Reconciliation & settlement reports' }],
  // Nowhere to go: the component renders null.
  ['no address', { label: 'Invoices' }],
  ['an empty address', { href: '', label: 'Invoices' }],
  ['an address of spaces', { href: '   ', label: 'Invoices' }],
  ['nothing at all', {}],
  // What an untyped JSON body or a router hands a caller. Cast, because BackLinkProps
  // would reject them — a caller typed `any` would not.
  ['an address that is an object', { href: {} as unknown as string, label: 'Invoices' }],
  ['an address that is a list', { href: [] as unknown as string, label: 'Invoices' }],
];

for (const [name, opts] of CASES) {
  it(`keeps the shape the vanilla back link agreed on: ${name}`, () => {
    held(opts);
  });
}

// Each one is read as javascript: by the URL parser the browser uses, so none is a
// straw man.
const SCRIPTS = [
  'javascript:history.back()', 'JavaScript:history.go(-1)', '  javascript:void 0',
  '\tjavascript:history.back()', '\u0001javascript:history.back()',
  'java\tscript:history.back()', 'java\nscript:history.back()', 'javascript\r:history.back()',
  'j\r\nava\tscript:history.back()',
];

for (const href of SCRIPTS) {
  it(`a script is not a destination, however it is spelt: ${JSON.stringify(href)}`, () => {
    expect(new URL(href, 'https://kit.test/').protocol).toBe('javascript:');
    held({ href, label: 'Invoices' });
  });
}

it('the accessible name contains the visible text, as WCAG 2.5.3 asks', () => {
  for (const label of ['Invoices', 'Payouts', 'Access & agents']) {
    cleanup();
    const { container } = render(<BackLink href="/x" label={label} />);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('aria-label')).toBe(`Back to ${label}`);
    expect(a.getAttribute('aria-label')).toContain(a.querySelector('.ui-back__label')!.textContent);
  }
});

it('keeps `ui-back` on the root, so `.ui-app__main > .ui-back` holds', () => {
  const { container } = render(
    <main className="ui-app__main"><BackLink href="/invoices" label="Invoices" /></main>);
  expect(container.querySelector('.ui-app__main > .ui-back')).not.toBeNull();
});

it('a class of the caller’s is added, never substituted', () => {
  const { container } = render(<BackLink href="/x" label="Invoices" className="mt-0" />);
  expect(classesOfEl(container.querySelector('a')!)).toEqual(['mt-0', 'ui-back']);
});

it('draws the anchor a caller names, and passes that element its own props', () => {
  // Standing in for a router <Link>: a plain <a> with a prop of its own.
  const Link = ({ to, ...rest }: { to: string } & React.ComponentPropsWithoutRef<'a'>) => (
    <a data-to={to} {...rest} />
  );
  const { container } = render(
    <BackLink as={Link} to="/invoices" href="/invoices" label="Invoices" />);
  const a = container.querySelector('a')!;
  expect(a.getAttribute('data-to')).toBe('/invoices');
  const plain = render(<BackLink href="/invoices" label="Invoices" />).container.querySelector('a')!;
  expect(shape(a)).toEqual(shape(plain));
});

it('the chevron is <Icon>, which is one wrapper span more than the vanilla factory wrote', () => {
  const { container } = render(<BackLink href="/x" label="Invoices" />);
  const a = container.querySelector('a')!;
  const wrapper = a.querySelector('svg')!.parentElement!;
  expect(wrapper.tagName).toBe('SPAN');
  expect(wrapper.getAttribute('aria-hidden')).toBe('true');
  expect(wrapper.className, 'it carries no class, so it matches no rule in back.css').toBe('');
});
