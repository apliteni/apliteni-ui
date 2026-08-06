import { card, button, badge, pill, icon, segmented } from '../../src/components/index.js';
import { pad, grid } from '../_gallery.js';

export default {
  title: 'Components/Card',
  parameters: { layout: 'fullscreen' },
};

export const Variants = {
  render: () => pad(grid(2,
    card({ title: 'Default card', sub: 'Filled surface, generous radius, no borders — the deck groups with surface, not outlines.', body: button({ label: 'Action', variant: 'secondary', size: 'sm' }) }),
    card({ variant: 'accent', title: 'Accent card', icon: 'sparkle', sub: 'Tinted with the purple accent and a hairline ring — for the highlighted plan or upsell.', body: button({ label: 'Upgrade', variant: 'primary', size: 'sm' }) }),
    card({ variant: 'live', title: `Live surface ${badge('Live', 'live')}`, sub: 'Green-tinted, for an active/confirmed state such as a connected agent.', body: pill('Connected', 'live') }),
    card({ title: 'With icon chip', icon: 'shield', sub: 'A leading icon chip anchors the header for feature and settings cards.' }),
  )),
};

export const SettingRows = {
  render: () => pad(`<div style="max-width:560px">${card({
    title: 'Appearance',
    body: `
      <div class="ui-card__row"><div><div class="lab">Theme</div><div class="hint">Match the deck's dark palette or a light workspace.</div></div>
        ${segmented({ name: 'theme', options: ['Dark', 'Light', 'System'], active: 0, ariaLabel: 'Theme' })}</div>
      <div class="ui-card__row"><div><div class="lab">Language</div><div class="hint">Interface language for the portal.</div></div>
        ${segmented({ name: 'lang', options: ['EN', 'RU'], active: 0, ariaLabel: 'Language' })}</div>
      <div class="ui-card__row"><div><div class="lab">Reduce motion</div><div class="hint">Disable the animated deck transitions.</div></div>
        <label class="ui-switch"><input type="checkbox" aria-label="Reduce motion"><span class="ui-switch__track"></span></label></div>`,
  })}</div>`),
};

const navCard = (ic, title, sub, tag = 'a') =>
  `<${tag} class="ui-card ui-card--interactive"${tag === 'a' ? ' href="#" style="text-decoration:none"' : ''}>
     <div class="ui-card__title"><span class="ui-card__icon">${icon(ic)}</span>${title}</div>
     <div class="ui-card__sub" style="margin-bottom:0">${sub}</div>
   </${tag}>`;

export const Interactive = {
  render: () => pad(grid(3,
    navCard('layers', 'Deck', 'The animated strategy deck.'),
    navCard('compass', 'Text', 'The readable long-form version.'),
    navCard('plug', 'Agents', 'Connect an agent over MCP.'),
  )),
};
