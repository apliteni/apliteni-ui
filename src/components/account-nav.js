// The one account navigation definition, and the one way to hand it to a sink
// that interpolates raw. It lives here rather than in shell.js because both
// shell.js and topbar.js need it and shell.js already imports topbar.js — the
// other direction would be a cycle. shell.js re-exports ACCOUNT_NAV, which is
// the published name docs/library.md documents.
// why: docs/specification.md#the-page-shell
import { esc } from './index.js';

// nav.js item objects. Labels are raw text — every nav primitive escapes, so a
// pre-escaped `&amp;` would come out as `&amp;amp;`. `key` means credentials;
// `plug` means integration. These two are the kit's default, so each is a live
// link on a consumer's /account page — a screen the kit does not ship belongs
// in the caller's own nav, not here.
export const ACCOUNT_NAV = [
  { id: 'prefs', icon: 'gear', label: 'Preferences' },
  { id: 'access', icon: 'key', label: 'Access & agents' },
];

// topbar()'s account menu speaks [id, icon, label, href?, target?] tuples, and
// it interpolates every field raw — the label, the href and the target alike.
// Escape all three on the way in rather than sending the menu a string the rail
// would have escaped a second time.
export const toMenuTuple = (it) => [
  esc(it.id ?? ''), it.icon, esc(it.label || ''),
  it.href ? esc(it.href) : it.href,
  it.target ? esc(it.target) : it.target,
];

// What accountMenu() falls back to. Derived on call, not frozen at import, so
// the menu and the rail cannot answer differently about the same definition.
export const accountMenuNav = () => ACCOUNT_NAV.map(toMenuTuple);

// One reader, one pair of initials. The rail (shell.js) and the topbar's
// account menu (topbar.js) both draw an avatar for the same person, and each
// computed it for itself: the rail preferred the display name, the menu only
// ever read the email's local part. So the /account preset — the one screen
// with both on it — said "AL" in the rail and "A" in the topbar. This lives
// beside ACCOUNT_NAV for the same reason ACCOUNT_NAV lives here: both files
// need it and shell.js already imports topbar.js.
//
// The display name is what a reader recognises, so it wins; the address is the
// fallback. `?` is what nobody at all comes out as.
export const initials = (name, email) => {
  const from = String(name ?? '').trim() || String(email ?? '').split('@')[0] || '';
  const parts = from.split(/[\s._-]+/).filter(Boolean).map((w) => w[0]);
  return (parts.slice(0, 2).join('') || '?').toUpperCase();
};
