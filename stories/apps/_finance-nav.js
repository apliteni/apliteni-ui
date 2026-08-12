// The finance portal's own nav — a demo portal's, not the kit's, which is why
// it lives here beside the screens that draw it and not in src/. Two screens
// draw it (Empty states and Finance report), and each used to carry a copy with
// a comment asking the reader to keep it in step with the other. That is the
// drift #127 is about, so the demo layer does not get to reproduce it.
export const FINANCE_NAV = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#', target: '_top' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#', target: '_top' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#', target: '_top' },
  { id: 'prefs', icon: 'gear', label: 'Preferences', href: '#', target: '_top' },
];

// Who is signed in on both screens. One reader, said once.
export const FINANCE_READER = { name: 'Ada Lovelace', email: 'ada@apliteni.com' };
