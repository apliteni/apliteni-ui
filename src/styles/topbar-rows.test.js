// Rule: a phone top bar keeps every control inside two rows. Row one holds the
// brand, the theme switch and the account, and ends at the 12px inset; row two holds
// the view and version switches, 8px apart, and a long version label ends in an
// ellipsis rather than pushing them together.
//
// Chromium checks the shipped stylesheet on the React TopBar's markup at phone widths.
// This does not measure other consumers or custom fonts. It is opt-in, because
// Playwright is no dependency here: TOPBAR_ROWS=1 with UI_PLAYWRIGHT (and optionally
// UI_CHROME). The vanilla shell half retired with the vanilla shell: the React
// AppShell draws its own band, .ui-app__bar, which this rule does not cover.
// why: docs/components.md#react-top-bar
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markup } from '../../stories/lib/react-markup.js';

const VERSIONS = [
  { value: 'phoenix.2026.002', label: 'phoenix.2026.002', badge: 'live' },
  { value: 'phoenix.2026.001', label: 'phoenix.2026.001', badge: 'archive' },
];
const VIEWS = [{ id: 'deck', label: 'Deck' }, { id: 'text', label: 'Text' }];
const bar = (signedOut) => markup(({ h, kit }) => h(kit.TopBar, {
  view: h(kit.ViewSwitch, { items: VIEWS, active: 'deck' }),
  version: h(kit.VersionSwitcher, { versions: VERSIONS, value: VERSIONS[0].value, onChange() {} }),
  theme: h(kit.ThemeToggle),
  account: signedOut ? undefined : h(kit.AccountMenu, { name: 'Ada Lovelace', email: 'ada@apliteni.com' }),
}));

test('phone topbars keep every control inside two rows', { skip: process.env.TOPBAR_ROWS !== '1' }, async () => {
  const { kitStylesheet, playwright } = await import('../../stories/lib/tap-zone.js');
  const subjects = [{ name: 'Full', html: await bar(false) }, { name: 'Signed out', html: await bar(true) }];
  // A consumer's version label can be far longer than the story's 16 characters.
  const long = 'phoenix.2026.002.release-candidate';
  const full = subjects.find(({ html }) => html.includes('class="vsw"') && html.includes('phoenix.2026.002'));
  assert.ok(full, 'a subject with a version switch must be measured');
  subjects.push({ name: `${full.name} (long label)`, html: full.html.replaceAll('phoenix.2026.002', long), long: true });
  const pw = await playwright();
  assert.ok(pw, 'TOPBAR_ROWS requires UI_PLAYWRIGHT');
  const browser = await pw.chromium.launch({ executablePath: process.env.UI_CHROME || undefined });
  const css = kitStylesheet();
  let measured = 0;
  let drifted = 0;
  let longMutated = 0;
  try {
    for (const subject of subjects) for (const width of [320, 390]) for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 600 }, hasTouch: true });
      await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body>${subject.html}</body></html>`);
      const measure = () => page.evaluate(() => {
        const box = (selector) => {
          const element = document.querySelector(`.topbar ${selector}`);
          if (!element) return null;
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { name: selector.slice(1), left, right, top, bottom };
        };
        return { width: innerWidth, scroll: document.documentElement.scrollWidth,
          first: ['.brand', '.toggle', '.acct'].map(box).filter(Boolean), second: ['.dtsw', '.vsw'].map(box).filter(Boolean) };
      });
      const fits = (m) => m.scroll === m.width
        && [...m.first, ...m.second].every(r => r.left >= 0 && r.right <= m.width)
        && Math.min(...m.second.map(r => r.top)) >= Math.max(...m.first.map(r => r.bottom));
      // Row one ends at the 12px inset: the account (when drawn) is on it, and the theme
      // switch is 8px before the account, or on the inset when no account is drawn.
      const grouped = (m) => {
        const [toggle, account] = ['toggle', 'acct'].map(n => m.first.find(r => r.name === n));
        if (!toggle) return false;
        const end = account ? account.right : toggle.right;
        const gap = account ? account.left - toggle.right : 0;
        return Math.abs(end - (m.width - 12)) < 0.5 && Math.abs(gap - (account ? 8 : 0)) < 0.5;
      };
      // The two switches on row two keep 8px between them, whatever the version label says.
      const apart = (m) => m.second.length < 2 || m.second[1].left - m.second[0].right >= 8 - 0.5;
      const all = (m) => fits(m) && grouped(m) && apart(m);
      assert.ok(all(await measure()), `${subject.name} ${width}px ${theme}: both rows must fit and row one must end at the inset`);
      measured++;
      if (subject.long) {
        const clipped = await page.evaluate(() => { const c = document.querySelector('.topbar .vsw__btn .cur'); return c.scrollWidth > c.clientWidth; });
        assert.ok(clipped, 'the long label must end in an ellipsis');
        // Letting the label keep its full width brings the overlap back.
        await page.addStyleTag({ content: '.topbar__in > .vsw, .vsw__btn { max-width: none !important; } .vsw__btn .cur { min-width: auto !important; overflow: visible !important; }' });
        assert.equal(apart(await measure()), false, 'the unshrunk label mutation must fail');
        longMutated++;
        await page.reload();
        await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body>${subject.html}</body></html>`);
      }
      // Removing the phone layout must restore the failure this check detects.
      await page.addStyleTag({ content: '.topbar__in { display: flex !important; flex-wrap: nowrap !important; }' });
      assert.equal(fits(await measure()), false, 'the one-row mutation must fail');
      await page.reload();
      await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body>${subject.html}</body></html>`);
      // Letting the version switch span the two auto columns brings the drift back.
      await page.addStyleTag({ content: '.topbar__in > .vsw { grid-area: 2 / 3 / 3 / 5 !important; }' });
      if (!grouped(await measure())) drifted++;
      await page.close();
    }
    assert.equal(longMutated, 4, 'the long label was measured at both widths and themes');
    assert.ok(drifted >= 2, 'the spanning mutation must break row one in Full and Signed out');
    assert.equal(measured, subjects.length * 4, 'every subject, phone width and theme was measured');
  } finally { await browser.close(); }
});
