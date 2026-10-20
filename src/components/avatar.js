import { esc, icon } from './index.js';
import { safeUrl } from '../html.js';
import { avatarHue, avatarInitials } from '../logic/avatar.js';
export { avatarHue, avatarInitials, AVATAR_HUES } from '../logic/avatar.js';

// Avatar — a person's round mark. The letters come from `name`, the hue from a hash of
// `key`, and a photo covers the letter, so a photo that fails to load leaves the letter.
// With no name the mark is the `user` glyph; `empty` is a dashed ring for "no one yet".
// It is decoration beside the name it stands for, so it is hidden from assistive
// technology, and it has no cursor, hover or focus of its own.
// why: docs/components.md#avatar
const cx = (...a) => a.filter(Boolean).join(' ');

/**
 * @param {object} [o]
 * @param {string|number} [o.key]  the app's stable id for the person; picks the hue
 * @param {string} [o.name]        the person's name; empty draws the `user` glyph
 * @param {string} [o.initials]    the letters to draw, when the caller has already chosen them
 * @param {string} [o.src]         a photo URL; the letters show if it fails to load
 * @param {24|32} [o.size]         the mark's size in px
 * @param {boolean} [o.empty]      a dashed ring in place of a person
 * @returns {string} html
 */
export function avatar({ key, name, initials, src, size = 24, empty = false } = {}) {
  const base = ['ui-avatar', size === 32 && 'ui-avatar--32'];
  if (empty) return `<span class="${esc(cx(...base, 'ui-avatar--empty'))}" aria-hidden="true"></span>`;
  const letters = initials || avatarInitials(name);
  if (!letters) return `<span class="${esc(cx(...base, 'ui-avatar--anon'))}" aria-hidden="true">${icon('user')}</span>`;
  const hue = avatarHue(key ?? name ?? letters);
  const img = src ? `<img src="${esc(safeUrl(src))}" alt="" loading="lazy">` : '';
  return `<span class="${esc(cx(...base, `ui-avatar--h${hue}`))}" data-initials="${letters.length}" aria-hidden="true">${esc(letters)}${img}</span>`;
}
