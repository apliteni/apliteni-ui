/** How many hues a person's mark can take. One per `--person-N` token. */
export const AVATAR_HUES = 8;

/**
 * Which hue a person gets: FNV-1a, 32 bit, over the UTF-8 bytes of the app's stable
 * key, modulo the number of hues. The kit ships it so two apps give one person one hue.
 */
export function avatarHue(key) {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(String(key ?? ''))) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % AVATAR_HUES;
}

/**
 * The letters of a mark: the first letter of the first word and of the last word, so a
 * one-word name gives one letter. Empty when there is no name to read.
 */
export function avatarInitials(name) {
  const words = String(name ?? '').normalize('NFC').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const first = (w) => segmenter ? segmenter.segment(w)[Symbol.iterator]().next().value.segment : Array.from(w)[0];
  const letters = words.length === 1 ? [first(words[0])] : [first(words[0]), first(words[words.length - 1])];
  return letters.join('').toLocaleUpperCase();
}
