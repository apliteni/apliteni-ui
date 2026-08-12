import '../src/index.css';
import { wireTopbar, applyTheme } from '../src/components/topbar.js';
import { wireNav } from '../src/components/nav.js';
import { wireDrawer } from '../src/components/drawer.js';
import { wireConfirm } from '../src/components/confirm.js';
import { initTabs } from '../src/components/tabs.js';

// Load Poppins once (Storybook manager/preview iframe).
if (!document.getElementById('ui-poppins')) {
  const pre1 = document.createElement('link');
  pre1.rel = 'preconnect'; pre1.href = 'https://fonts.gstatic.com'; pre1.crossOrigin = 'anonymous';
  const link = document.createElement('link');
  link.id = 'ui-poppins'; link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
  document.head.append(pre1, link);
}

// ---- Component inspector (dev-only) -------------------------------------
// Toolbar toggle that boxes every kit component on the rendered story and
// labels it with the factory name. Non-mutating: draws a fixed overlay from
// getBoundingClientRect so it never shifts component layout. Answers
// "what components is this prototype page composed from?" visually.
const UI_MAP = [
  ['.topbar', 'topbar'], ['.ui-footer', 'footer'], ['.ui-hero', 'hero'],
  ['.ui-feature', 'feature'], ['.ui-card', 'card'], ['.ui-callout', 'callout'],
  ['.ui-btn', 'button'], ['.ui-badge', 'badge'], ['.ui-pill', 'pill'], ['.ui-dot', 'statusDot'],
  ['.ui-seg', 'segmented'], ['.ui-tabs', 'tabs'], ['.ui-nav', 'nav'], ['.ui-drawer', 'drawer'],
  ['.ui-confirm', 'confirm'],
  ['.ui-dropdown', 'dropdown'], ['.ui-toast', 'toast'], ['.ui-empty', 'emptyState'],
  ['.ui-table', 'table'], ['.ui-field', 'field'], ['.ui-input', 'input'], ['.ui-textarea', 'textarea'],
  ['.ui-select', 'select'], ['.ui-switch', 'switchToggle'], ['.ui-check', 'checkbox'], ['.ui-snippet', 'snippet'],
];
let _inspectCleanup = null;
function paintInspector(on) {
  if (_inspectCleanup) { _inspectCleanup(); _inspectCleanup = null; }
  document.getElementById('ui-inspect-layer')?.remove();
  if (on !== 'on') return;
  const cs = getComputedStyle(document.documentElement);
  const accent = cs.getPropertyValue('--accent').trim() || '#b479ff';
  const layer = document.createElement('div');
  layer.id = 'ui-inspect-layer';
  Object.assign(layer.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '2147483000' });
  document.body.appendChild(layer);
  const root = document.getElementById('storybook-root') || document.body;
  const paint = () => {
    layer.innerHTML = '';
    const seen = new Set();
    for (const [sel, name] of UI_MAP) {
      root.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        const box = document.createElement('div');
        Object.assign(box.style, {
          position: 'fixed', left: `${r.left}px`, top: `${r.top}px`,
          width: `${r.width}px`, height: `${r.height}px`,
          outline: `1px solid ${accent}`, outlineOffset: '-1px', borderRadius: '4px',
        });
        const tag = document.createElement('span');
        tag.textContent = name;
        Object.assign(tag.style, {
          position: 'absolute', left: '0', top: '0',
          transform: r.top < 16 ? 'none' : 'translateY(-100%)',
          background: accent, color: '#fff', font: '600 10px/1.5 ui-monospace,monospace',
          padding: '1px 5px', borderRadius: '4px 4px 4px 0', whiteSpace: 'nowrap',
        });
        box.appendChild(tag);
        layer.appendChild(box);
      });
    }
  };
  paint();
  const repaint = () => paint();
  window.addEventListener('scroll', repaint, true);
  window.addEventListener('resize', repaint);
  _inspectCleanup = () => {
    window.removeEventListener('scroll', repaint, true);
    window.removeEventListener('resize', repaint);
  };
}

/** @type { import('@storybook/html').Preview } */
const preview = {
  parameters: {
    layout: 'centered',
    backgrounds: { disable: true }, // theme decorator owns the canvas colour
    options: {
      storySort: {
        order: [
          'Foundations', ['Colors', 'Signal contrast', 'Typography', 'Spacing & Radius', 'Elevation', 'Backgrounds', 'Motion', 'Iconography', 'Brand', 'Brand primitives'],
          'Guidelines', ['Destructive actions'],
          'Components', ['Button', 'Badge & Status', 'Card', 'Segmented Control', 'Tabs', 'Inputs', 'Switch & Checkbox', 'Dropdown', 'Navigation', 'Drawer', 'Confirm', 'Table', 'Callout & Toast', 'Feedback', 'Code Snippet', 'Topbar'],
          'Apps', ['Landing Page', 'Sign In (OAuth2)', 'Consent', 'Preferences', 'Access & Agents', 'Account preset'],
        ],
      },
    },
    controls: { expanded: true, matchers: { color: /(background|color)$/i } },
    // Low-noise a11y: gate on real WCAG 2.0/2.1 A+AA failures only, not
    // best-practice heuristics (e.g. `region`, which just flags story content
    // living outside a landmark inside the Storybook iframe). Colour contrast is
    // owned by the design tokens, verified visually — not by axe in an iframe.
    // Same rule set the CI gate runs (stories/a11y.test.js), so the panel and CI
    // never disagree.
    a11y: {
      context: '#storybook-root',
      options: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      },
    },
  },

  globalTypes: {
    // No `toolbar` block, so Storybook draws no dropdown for this one: with two
    // values a menu is pure overhead, and the toolbar tool registered in
    // manager.js flips the same global in one click. The global and its default
    // are unchanged — everything that reads `theme` still reads `theme`.
    theme: {
      description: 'Deck theme',
      defaultValue: 'dark',
    },
    inspect: {
      description: 'Component inspector',
      defaultValue: 'off',
      toolbar: {
        title: 'Inspect',
        icon: 'search',
        items: [
          { value: 'off', title: 'Inspector off' },
          { value: 'on', title: 'Show components' },
        ],
        dynamicTitle: true,
      },
    },
    accent: {
      description: 'Accent sub-theme',
      defaultValue: 'default',
      toolbar: {
        title: 'Accent',
        icon: 'paintbrush',
        items: [
          { value: 'default', title: 'Nebula (purple)' },
          { value: 'phoenix', title: 'Phoenix (ember)' },
          { value: 'ocean', title: 'Ocean (azure)' },
          { value: 'emerald', title: 'Emerald (jade)' },
        ],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (story, ctx) => {
      const theme = ctx.globals.theme || 'dark';
      const accent = ctx.globals.accent || 'default';
      applyTheme(theme, document.documentElement);
      if (accent === 'default') document.documentElement.removeAttribute('data-accent');
      else document.documentElement.setAttribute('data-accent', accent);
      // Paint the whole canvas with the theme bg so centered/padded stories read true.
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      const root = document.getElementById('storybook-root') || document.body;
      root.style.background = bg;
      document.body.style.background = bg;

      const wrap = document.createElement('div');
      const out = story();
      if (typeof out === 'string') wrap.innerHTML = out; else wrap.append(out);
      // Wire interactive behaviours after render.
      requestAnimationFrame(() => {
        wireTopbar(wrap); wireNav(wrap); wireDrawer(wrap); wireConfirm(wrap); initTabs(wrap);
        // Repaint the inspector overlay after layout settles (or clear it when off).
        requestAnimationFrame(() => paintInspector(ctx.globals.inspect));
      });
      return wrap;
    },
  ],
};

export default preview;
