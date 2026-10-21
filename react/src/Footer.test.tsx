import { render, cleanup, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { Footer } from './Footer';

afterEach(cleanup);

const COLUMNS = [
  { title: 'Product', links: [{ label: 'Deck', href: '#deck' }, { label: 'GitHub', href: 'https://example.com/a', target: '_blank' }] },
  { title: 'Company', links: [{ label: 'About', href: '#about' }] },
  { title: 'Help', links: [{ label: 'Contact', href: '#contact' }] },
];
const SOCIAL = [
  { label: 'GitHub', href: 'https://example.com/g', icon: 'github' as const },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' as const },
  { label: 'Email', href: 'mailto:hi@example.com', icon: 'mail' as const },
];
const LEGAL_LINKS = [{ label: 'Privacy', href: '#privacy' }, { label: 'Terms', href: '#terms' }];

for (const variant of ['full', 'slim', 'app'] as const) {
  it(`renders the ${variant} footer with its legal row`, () => {
    const { container } = render(<Footer variant={variant} legal="© 2026 Apliteni"
      legalLinks={LEGAL_LINKS} switcher={<button type="button">Pick</button>}
      columns={COLUMNS} social={SOCIAL} tagline="One strategy." />);
    const root = container.querySelector('footer')!;
    expect(root).toHaveClass('ui-footer', `ui-footer--${variant}`);
    expect(root.querySelector('.ui-footer__legal')).toHaveTextContent('© 2026 Apliteni');
    expect(root.querySelector('.ui-footer__switcher button')).toHaveTextContent('Pick');
    expect(screen.getByRole('navigation', { name: 'Legal' })).toBeInTheDocument();
    expect(root.querySelector('.ui-footer__top') !== null).toBe(variant === 'full');
  });
}

it('renders the brand, social links and three link columns in the full variant', () => {
  const { container } = render(<Footer columns={COLUMNS} social={SOCIAL} tagline="One strategy." legal="x" />);
  expect(container.querySelector('.ui-footer__brand .brand')).toBeInTheDocument();
  expect(container.querySelector('.ui-footer__tagline')).toHaveTextContent('One strategy.');
  expect(container.querySelectorAll('.ui-footer__social')).toHaveLength(3);
  expect(container.querySelectorAll('.ui-footer__col')).toHaveLength(3);
});

it('paints the LinkedIn mark with the same solid weight as the other brand marks', () => {
  const { container } = render(<Footer social={SOCIAL} legal="x" />);
  const github = container.querySelector<SVGElement>('[aria-label="GitHub"] svg')!;
  const linkedin = container.querySelector<SVGElement>('[aria-label="LinkedIn"] svg')!;
  expect(linkedin.getAttribute('fill')).toBe(github.getAttribute('fill'));
});

it('draws no switcher box when the slot is empty', () => {
  const { container } = render(<Footer variant="slim" legal="x" />);
  expect(container.querySelector('.ui-footer__switcher')).toBeNull();
});

it('names the column links as a Footer navigation with h2 titles', () => {
  render(<Footer columns={COLUMNS} legal="x" />);
  expect(screen.getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Product', 'Company', 'Help']);
});

it('gives an external link rel=noreferrer', () => {
  render(<Footer columns={COLUMNS} legal="x" />);
  expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('rel', 'noreferrer');
});

it('replaces a script address with #', () => {
  render(<Footer columns={[{ title: 'T', links: [{ label: 'Bad', href: 'javascript:alert(1)' }] }]} legal="x" />);
  expect(screen.getByRole('link', { name: 'Bad' })).toHaveAttribute('href', '#');
});

it('escapes the product word and keeps the lockup name', () => {
  const { container } = render(<Footer word="<b>x</b>" legal="x" />);
  const brand = container.querySelector('a.brand')!;
  expect(brand.querySelector('b')).toBeNull();
  expect(brand.getAttribute('aria-label')).toBe('Apliteni <b>x</b>');
});

it('takes a lockup of the caller’s in place of the kit’s', () => {
  const { container } = render(<Footer brand={<a className="brand" href="/x">Mine</a>} legal="x" />);
  expect(container.querySelectorAll('a.brand')).toHaveLength(1);
  expect(container.querySelector('a.brand')!.textContent).toBe('Mine');
});

it('takes React link and legal content in place of the column data and legal text', () => {
  const { container } = render(<Footer columns={COLUMNS}
    links={<div className="ui-footer__col"><a href="/custom">Custom</a></div>}
    legal={<strong>Custom legal</strong>} />);
  expect(screen.getByRole('navigation', { name: 'Footer' })).toHaveTextContent('Custom');
  expect(screen.queryByText('Deck')).toBeNull();
  expect(container.querySelector('.ui-footer__legal strong')).toHaveTextContent('Custom legal');
});

it('hides the brand block when brand is false', () => {
  const { container } = render(<Footer brand={false} columns={COLUMNS} />);
  expect(container.querySelector('.ui-footer__brand')).toBeNull();
  expect(container.querySelector('.ui-footer__nav')).toBeInTheDocument();
});

it('adds the caller’s class and keeps the kit’s', () => {
  const { container } = render(<Footer variant="app" className="mt-0" legal="x" />);
  expect(Array.from(container.querySelector('footer')!.classList).sort()).toEqual(['mt-0', 'ui-footer', 'ui-footer--app']);
});
