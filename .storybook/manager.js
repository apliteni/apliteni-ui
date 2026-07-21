import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

// The prism mark + wordmark as the sidebar logo (kit tokens, Poppins).
const LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="126" height="24" viewBox="0 0 126 24">' +
  '<defs><clipPath id="p"><rect x="1" y="2" width="20" height="20" rx="6"/></clipPath></defs>' +
  '<g clip-path="url(#p)">' +
  '<rect x="1" y="2" width="10" height="10" fill="#9b5dff"/><rect x="11" y="2" width="10" height="10" fill="#ff6a3d"/>' +
  '<rect x="1" y="12" width="10" height="10" fill="#3b9dff"/><rect x="11" y="12" width="10" height="10" fill="#16c98a"/>' +
  '</g>' +
  '<text x="29" y="17" font-family="Poppins,system-ui,sans-serif" font-size="15" font-weight="600" fill="#e9e7f0">' +
  'apliteni<tspan fill="#9b5dff">-</tspan>ui</text></svg>';

// The kit's dark palette, so the workbench reads as our design system — not
// stock Storybook. Values mirror src/tokens/tokens.css.
const theme = create({
  base: 'dark',
  brandTitle: 'apliteni-ui',
  brandImage: 'data:image/svg+xml;utf8,' + encodeURIComponent(LOGO),
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

  fontBase: '"Poppins", system-ui, -apple-system, sans-serif',
  fontCode: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});

addons.setConfig({
  theme,
  sidebar: { showRoots: true },
  // Keep the top bar quiet — drop the zoom / remount / fullscreen / copy chrome.
  toolbar: {
    zoom: { hidden: true },
    eject: { hidden: true },
    copy: { hidden: true },
    fullscreen: { hidden: true },
    remount: { hidden: true },
  },
});
