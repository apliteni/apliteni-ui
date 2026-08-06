import { appShell } from './_appShell.js';
import { card, switchToggle, accentPicker } from '../../src/components/index.js';
import { tabs } from '../../src/components/tabs.js';

export default {
  title: 'Apps/Preferences',
  parameters: { layout: 'fullscreen' },
};

const settingRow = (lab, hint, control) =>
  `<div class="ui-card__row"><div><div class="lab">${lab}</div><div class="hint">${hint}</div></div>${control}</div>`;

// A setting whose choice has something behind it — each option gets a panel
// saying what picking it does, so the tab strip announces a panel it really has.
// The row stacks instead of sitting the control on the right, because a tab
// strip plus its panel is a block, not a chip.
const settingTabs = (name, lab, hint, ariaLabel, active, items) =>
  `<div class="ui-card__row" style="display:block">
     <div class="lab">${lab}</div><div class="hint" style="margin-bottom:10px">${hint}</div>
     ${tabs({ name, ariaLabel, active, items })}
   </div>`;

const blurb = (t) => `<p style="color:var(--dim);font:400 13.5px/1.6 Poppins;margin:0">${t}</p>`;

const THEMES = [
  { label: 'Dark', panel: blurb('The deck palette — deep indigo surfaces, tuned for reading at night.') },
  { label: 'Light', panel: blurb('An all-white workspace, for daylight and for printing.') },
  { label: 'System', panel: blurb('Follows this device, and changes with it when the device does.') },
];

const LANGUAGES = [
  { label: 'English', panel: blurb('Menus, buttons and dates read in English.') },
  { label: 'Русский', panel: blurb('Меню, кнопки и даты — на русском.') },
];

export const Default = {
  render: () => appShell({
    active: 'prefs',
    crumb: 'Account / Preferences',
    title: 'Preferences',
    sub: 'How the kit looks and speaks to you. Saved to this browser.',
    body: `
      ${card({ title: 'Appearance', body:
        settingTabs('pref-theme', 'Theme', 'Match the dark palette or a light workspace.', 'Theme', 0, THEMES) +
        settingRow('Accent', 'Pick a sub-theme — four ship with the kit.', accentPicker({ active: 'default' })) +
        settingTabs('pref-lang', 'Language', 'Interface language for the portal.', 'Language', 0, LANGUAGES) +
        settingRow('Reduce motion', 'Turn off animated transitions.', switchToggle({ checked: false, label: 'Reduce motion' })),
      })}
      ${card({ title: 'Notifications', body:
        settingRow('Weekly digest', 'A summary when things change.', switchToggle({ checked: true, label: 'Weekly digest' })) +
        settingRow('Agent activity', 'Email me when an agent first connects.', switchToggle({ checked: true, label: 'Agent activity' })) +
        settingRow('Product news', 'Occasional updates about new components.', switchToggle({ checked: false, label: 'Product news' })),
      })}
    `,
  }),
};
