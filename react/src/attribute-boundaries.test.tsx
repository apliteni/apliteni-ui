// The React components that pass a URL through the kit's safeUrl never draw a link that
// carries a script, data or vbscript URL, however it is spelt (#429: these cases were
// held against the vanilla factories in src/components/attribute-boundaries.test.js).
// React blocks a javascript: URL on its own, but it lets data: and vbscript: through,
// so a component that writes an href without safeUrl is not covered by this file.
import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Footer } from './Footer';
import { NavTabs } from './NavTabs';
import { TopBar } from './TopBar';
import { Card } from './primitives/Card';

afterEach(cleanup);

const SCRIPTED = ['javascript:alert(1)', ' \u0001JaVa\tScRiPt:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)'];
const LINKS: [string, (href: string) => ReactElement][] = [
  ['NavTabs', (href) => <NavTabs items={[{ id: 'a', label: 'Link', href }]} active="b" />],
  ['Footer legal link', (href) => <Footer legalLinks={[{ label: 'Link', href }]} />],
  ['Footer column link', (href) => <Footer columns={[{ title: 'Col', links: [{ label: 'Link', href }] }]} />],
  ['Footer social link', (href) => <Footer social={[{ label: 'GitHub', href, icon: 'github' }]} />],
  ['Footer brand', (href) => <Footer brandHref={href} />],
  ['TopBar brand', (href) => <TopBar brandHref={href} />],
  ['Card', (href) => <Card href={href} title="Link" />],
];

const hrefs = (el: Element) => [...el.querySelectorAll('[href]')].map((a) => a.getAttribute('href') ?? '');

describe('a link never carries a scripted URL', () => {
  for (const [name, build] of LINKS) {
    it.each(SCRIPTED)(`${name}: %j`, (href) => {
      const found = hrefs(render(build(href)).container);
      expect(found.length, `${name} drew no link, so this case checks nothing`).toBeGreaterThan(0);
      for (const value of found) expect(value).not.toMatch(/javascript:|data:|vbscript:/i);
    });
  }

  it('keeps an ordinary URL as the caller wrote it', () => {
    for (const [name, build] of LINKS) {
      expect(hrefs(render(build('/path?q=1')).container), name).toContain('/path?q=1');
      cleanup();
    }
  });
});
