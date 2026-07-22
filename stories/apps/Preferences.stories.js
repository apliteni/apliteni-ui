import { appShell } from './_appShell.js';
import { card, switchToggle, accentPicker, segmented } from '../../src/components/index.js';

export default {
  title: 'Apps/Preferences',
  parameters: { layout: 'fullscreen' },
};

const seg = (name, opts, active) => segmented({ name, options: opts, active });

const settingRow = (lab, hint, control) =>
  `<div class="ui-card__row"><div><div class="lab">${lab}</div><div class="hint">${hint}</div></div>${control}</div>`;

export const Default = {
  render: () => appShell({
    active: 'prefs',
    crumb: 'Account / Preferences',
    title: 'Preferences',
    sub: 'How the kit looks and speaks to you. Saved to this browser.',
    body: `
      ${card({ title: 'Appearance', body:
        settingRow('Theme', 'Match the dark palette or a light workspace.', seg('theme', ['Dark', 'Light', 'System'], 0)) +
        settingRow('Accent', 'Pick a sub-theme — four ship with the kit.', accentPicker({ active: 'default' })) +
        settingRow('Language', 'Interface language for the portal.', seg('lang', ['English', 'Русский'], 0)) +
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
