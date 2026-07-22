import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';
import { SET_GLOBALS, GLOBALS_UPDATED } from '@storybook/core-events';

// The prism mark + wordmark as the sidebar logo (kit tokens, Poppins). The
// wordmark ink flips with the theme so it reads on both dark and light chrome.
const logo = (ink) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="126" height="24" viewBox="0 0 126 24">' +
  '<defs><clipPath id="p"><rect x="1" y="2" width="20" height="20" rx="6"/></clipPath></defs>' +
  '<g clip-path="url(#p)">' +
  '<rect x="1" y="2" width="10" height="10" fill="#9b5dff"/><rect x="11" y="2" width="10" height="10" fill="#ff6a3d"/>' +
  '<rect x="1" y="12" width="10" height="10" fill="#3b9dff"/><rect x="11" y="12" width="10" height="10" fill="#16c98a"/>' +
  '</g>' +
  '<text x="29" y="17" font-family="Poppins,system-ui,sans-serif" font-size="15" font-weight="600" fill="' + ink + '">' +
  'apliteni<tspan fill="#9b5dff">-</tspan>ui</text></svg>';

const brand = (ink) => 'data:image/svg+xml;utf8,' + encodeURIComponent(logo(ink));

const fontBase = '"Poppins", system-ui, -apple-system, sans-serif';
const fontCode = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// The kit's dark palette, so the workbench reads as our design system — not
// stock Storybook. Values mirror src/tokens/tokens.css (dark block).
const dark = create({
  base: 'dark',
  brandTitle: 'apliteni-ui',
  brandImage: brand('#e9e7f0'),
  brandTarget: '_self',

  colorPrimary: '#9b5dff',
  colorSecondary: '#9b5dff',

  appBg: '#16151f',
  appContentBg: '#16151f',
  appPreviewBg: '#16151f',
  appBorderColor: '#332f45',
  appBorderRadius: 10,

  barBg: '#1b1927',
  barTextColor: '#948fa8',
  barHoverColor: '#e9e7f0',
  barSelectedColor: '#9b5dff',

  textColor: '#e9e7f0',
  textMutedColor: '#948fa8',

  inputBg: '#221f2e',
  inputBorder: '#332f45',
  inputTextColor: '#e9e7f0',
  inputBorderRadius: 8,

  fontBase,
  fontCode,
});

// Light block — mirrors src/tokens/tokens.css (the white light app). Sidebar
// takes the soft inset grey so white content panels read as raised.
const light = create({
  base: 'light',
  brandTitle: 'apliteni-ui',
  brandImage: brand('#0c0e13'),
  brandTarget: '_self',

  colorPrimary: '#6a2dcc',
  colorSecondary: '#6a2dcc',

  appBg: '#f5f6f9',
  appContentBg: '#ffffff',
  appPreviewBg: '#ffffff',
  appBorderColor: '#e4e7ee',
  appBorderRadius: 10,

  barBg: '#ffffff',
  barTextColor: '#5c6270',
  barHoverColor: '#0c0e13',
  barSelectedColor: '#6a2dcc',

  textColor: '#1a1e27',
  textMutedColor: '#5c6270',

  inputBg: '#ffffff',
  inputBorder: '#e4e7ee',
  inputTextColor: '#1a1e27',
  inputBorderRadius: 8,

  fontBase,
  fontCode,
});

const CONFIG = {
  sidebar: { showRoots: true },
  // Keep the top bar quiet — drop the zoom / remount / fullscreen / copy chrome.
  toolbar: {
    zoom: { hidden: true },
    eject: { hidden: true },
    copy: { hidden: true },
    fullscreen: { hidden: true },
    remount: { hidden: true },
  },
};

// Follow the preview's Theme toolbar: when the `theme` global flips, re-theme
// the whole manager chrome (sidebar, toolbar, panels) to match, and stamp
// data-sbtheme on the manager root so manager-head.html's custom sidebar CSS
// can adapt its accent tints too.
let current = 'dark';
const apply = (t) => {
  const next = t === 'light' ? 'light' : 'dark';
  if (next === current) return;
  current = next;
  try { document.documentElement.setAttribute('data-sbtheme', next); } catch (e) { /* no-op */ }
  addons.setConfig({ ...CONFIG, theme: next === 'light' ? light : dark });
};

// Initial paint (dark by default; SET_GLOBALS below corrects it from the URL).
document.documentElement.setAttribute('data-sbtheme', 'dark');
addons.setConfig({ ...CONFIG, theme: dark });

addons.register('apliteni/theme-sync', (api) => {
  const channel = api.getChannel();
  if (!channel) return;
  const onGlobals = ({ globals } = {}) => { if (globals && 'theme' in globals) apply(globals.theme); };
  channel.on(SET_GLOBALS, onGlobals);      // fires on load with the URL globals
  channel.on(GLOBALS_UPDATED, onGlobals);  // fires when the toolbar toggles
});
