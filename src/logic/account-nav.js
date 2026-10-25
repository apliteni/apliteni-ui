// The one account navigation definition: the kit's default rows for a consumer's
// /account page. Labels are raw text, because every nav primitive escapes. `key` means
// credentials; `plug` means integration. A screen the kit does not ship belongs in the
// caller's own nav, not here. The vanilla shell and the React AppShell both read it.
// why: docs/components.md#the-page-shell
export const ACCOUNT_NAV = [
  { id: 'prefs', icon: 'gear', label: 'Preferences' },
  { id: 'access', icon: 'key', label: 'Access & agents' },
];
