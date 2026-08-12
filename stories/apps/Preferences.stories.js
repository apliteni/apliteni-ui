import { appShell, ACCOUNT_NAV } from '../../src/components/shell.js';
import { card, switchToggle, accentPicker, segmented } from '../../src/components/index.js';

export default {
  title: 'Apps/Preferences',
  parameters: { layout: 'fullscreen' },
};

// Overview belongs to this demo, not to the kit's default nav — see Access.
const NAV = [{ id: 'overview', icon: 'chart', label: 'Overview' }, ...ACCOUNT_NAV];

// Theme and Language are settings, not navigation — picking one changes what the
// portal will do, not what this page shows. So they stay a segmented strip, which
// says "pressed", and each one carries its own name.
const seg = (name, ariaLabel, opts, active) => segmented({ name, ariaLabel, options: opts, active });

const settingRow = (lab, hint, control) =>
  `<div class="ui-card__row"><div><div class="lab">${lab}</div><div class="hint">${hint}</div></div>${control}</div>`;

export const Default = {
  render: () => appShell({
    nav: NAV,
    active: 'prefs',
    account: { name: 'Ada Lovelace', email: 'ada@apliteni.com' },
    signOutHref: '#logout',
    crumbs: [{ label: 'Account', href: '#' }, { label: 'Preferences' }],
    title: 'Preferences',
    sub: 'How the kit looks and speaks to you. Saved to this browser.',
    body: `
      ${card({ title: 'Appearance', body:
        settingRow('Theme', 'Match the dark palette or a light workspace.', seg('theme', 'Theme', ['Dark', 'Light', 'System'], 0)) +
        settingRow('Accent', 'Pick a sub-theme — four ship with the kit.', accentPicker({ active: 'default' })) +
        settingRow('Language', 'Interface language for the portal.', seg('lang', 'Language', ['English', 'Русский'], 0)) +
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
