// The one account navigation definition, and the one way to hand it to a sink
// that interpolates raw. It lives here rather than in shell.js because both
// shell.js and topbar.js need it and shell.js already imports topbar.js — the
// other direction would be a cycle. shell.js re-exports ACCOUNT_NAV, which is
// the published name docs/components.md documents.
// why: docs/components.md#the-page-shell
import { esc } from './index.js';
import { avatarInitials } from '../logic/avatar.js';
import { ACCOUNT_NAV } from '../logic/account-nav.js';

export { ACCOUNT_NAV };

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
// The displayed name alone supplies the letters. The part draws its user glyph
// when no name is shown.
export const initials = (name) => avatarInitials(name);
