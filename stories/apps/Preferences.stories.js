import { accountShell } from './_accountShell.js';
import { card, switchToggle, accentPicker } from '../../src/components/index.js';

export default {
  title: 'Apps/Preferences',
  parameters: { layout: 'fullscreen' },
};

const seg = (name, opts, active) =>
  `<div class="ui-seg" data-seg="${name}">${opts.map((o, i) => `<button${i === active ? ' class="is-active"' : ''} aria-selected="${i === active}">${o}</button>`).join('')}</div>`;

const settingRow = (lab, hint, control) =>
  `<div class="ui-card__row"><div><div class="lab">${lab}</div><div class="hint">${hint}</div></div>${control}</div>`;

export const Default = {
  render: () => accountShell({
    active: 'prefs',
    crumb: 'Preferences',
    title: 'Preferences',
    sub: 'How the strategy portal looks and speaks to you. Saved to this browser.',
    body: `
      ${card({ title: 'Appearance', body:
        settingRow('Theme', "Match the deck's dark palette or a light workspace.", seg('theme', ['Dark', 'Light', 'System'], 0)) +
        settingRow('Accent', 'Pick a colour — Phoenix is the strategy default this cycle.', accentPicker({ active: 'default' })) +
        settingRow('Language', 'Interface language for the portal.', seg('lang', ['English', 'Русский'], 0)) +
        settingRow('Reduce motion', 'Turn off the animated deck transitions.', switchToggle({ checked: false })),
      })}
      ${card({ title: 'Notifications', body:
        settingRow('Strategy digest', 'A weekly summary when the strategy changes.', switchToggle({ checked: true })) +
        settingRow('Agent activity', 'Email me when an agent first connects.', switchToggle({ checked: true })) +
        settingRow('Product news', 'Occasional updates about new surfaces.', switchToggle({ checked: false })),
      })}
    `,
  }),
};
