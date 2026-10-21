import { esc, icon } from './index.js';
import { safeUrl } from '../html.js';
import { avatarHue, avatarInitials } from '../logic/avatar.js';
export { avatarHue, avatarInitials, AVATAR_HUES } from '../logic/avatar.js';

// Avatar — a person's round mark. The letters come from `name`, the hue from a hash of
// `key`, and a photo covers the letter. A photo that fails to load removes itself, so the
// letter shows and not the browser's broken-image glyph.
// With no name the mark is the `user` glyph; `empty` is a dashed ring for "no one yet".
// It is decoration beside the name it stands for, so it is hidden from assistive
// technology, and it has no cursor, hover or focus of its own.
// why: docs/components.md#avatar
const cx = (...a) => a.filter(Boolean).join(' ');
const wiredDocs = new WeakSet();

function wireAvatarPhotos(doc) {
  if (!doc || wiredDocs.has(doc)) return;
  wiredDocs.add(doc);
  doc.querySelectorAll('.ui-avatar > img[data-avatar-photo]').forEach((img) => {
    if (!img.complete) return;
    if (img.naturalWidth > 0) img.classList.add('is-loaded');
    else img.remove();
  });
  doc.addEventListener('load', (event) => {
    if (event.target?.matches?.('.ui-avatar > img[data-avatar-photo]')) event.target.classList.add('is-loaded');
  }, true);
  doc.addEventListener('error', (event) => {
    if (event.target?.matches?.('.ui-avatar > img[data-avatar-photo]')) event.target.remove();
  }, true);
}

if (typeof document !== 'undefined') wireAvatarPhotos(document);

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
  if (typeof document !== 'undefined') wireAvatarPhotos(document);
  const base = ['ui-avatar', size === 32 && 'ui-avatar--32'];
  if (empty) return `<span class="${esc(cx(...base, 'ui-avatar--empty'))}" aria-hidden="true"></span>`;
  const letters = initials || avatarInitials(name);
  if (!letters) return `<span class="${esc(cx(...base, 'ui-avatar--anon'))}" aria-hidden="true">${icon('user')}</span>`;
  const hue = avatarHue(key ?? name ?? letters);
  const img = src ? `<img data-avatar-photo src="${esc(safeUrl(src))}" alt="" loading="lazy">` : '';
  return `<span class="${esc(cx(...base, `ui-avatar--h${hue}`))}" data-initials="${letters.length}" aria-hidden="true">${esc(letters)}${img}</span>`;
}
