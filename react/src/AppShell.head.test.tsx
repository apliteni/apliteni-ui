import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

// The compact head's tests. They stand apart from AppShell.test.tsx, which is at its line cap
// in .smells.json.
const props = { sections: [{ href: '/', label: 'Tasks', icon: 'home' }], pathname: '/', title: 'Tasks', account: { name: 'Ann Lee', email: 'ann@example.com' }, onSignOut: () => {} };
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
afterEach(cleanup);

// A compact head stands New task at the end of the title row, so the toolbar is the next
// row (#866). The rule is the vanilla sheet's, so /css consumers get it too.
it('puts the actions at the end of the title row in a compact head', () => {
  render(<AppShell {...props} head="compact" tools={<button type="button">Customize</button>} actions={<button type="button">New task</button>} />);
  const row = screen.getByRole('main').querySelector('.ui-app__title-row')!;
  expect(row).toHaveClass('ui-app__title-row--compact');
  expect([...row.querySelectorAll('button')].map(b => b.textContent)).toEqual(['Customize', 'New task']);
  expect(document.querySelector('.ui-react-app__actions')).toBeNull();
  expect(read('../../src/styles/layout.css')).toMatch(/\.ui-app__title-row--compact,\s*\.ui-app__title-row--compact:not\(:has\(\+ \.ui-app__sub\)\) \{ margin-bottom: var\(--space-2\); \}/);
});

it('keeps the actions row without a compact head', () => {
  const { unmount } = render(<AppShell {...props} actions={<button type="button">New task</button>} />);
  expect(document.querySelector('.ui-react-app__actions')).toHaveTextContent('New task');
  expect(document.querySelector('.ui-app__title-row--compact')).toBeNull();
  unmount();
});
