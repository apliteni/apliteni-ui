/**
 * How a match is worth more than another match.
 *
 * Six ways a query can meet an item, scored so that the whole beats the part
 * and the name beats the note. The numbers are a ladder and not a measurement —
 * what matters is the order, which is why src/components/command-palette.test.js
 * asserts the ORDER of the results rather than any of these values.
 *
 * cmdk's command-score is the other published answer: one continuous score
 * built out of SCORE_CONTINUE_MATCH 1, SCORE_SPACE_WORD_JUMP 0.9,
 * SCORE_NON_SPACE_WORD_JUMP 0.8 and SCORE_CHARACTER_JUMP 0.17. It ranks
 * beautifully and cannot be explained to a reader who asks why their item is
 * third. A ladder can: the kit's palettes hold tens of items, not thousands.
 */
export const SCORE = {
  exact: 100,
  prefix: 90,
  wordStart: 80,
  contains: 70,
  keyword: 60,
  description: 40,
  subsequence: 20,
};

export const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();

// Every character of `q`, in order, somewhere in `s` — "nc" finding "New
// campaign". The weakest match the kit accepts, and the only one that can pair
// a two-letter query with a twenty-letter label.
function subsequence(s, q) {
  let at = 0;
  for (const ch of q) {
    at = s.indexOf(ch, at);
    if (at === -1) return false;
    at += 1;
  }
  return true;
}

// A word here starts after a space or one of the separators a product name uses,
// so "camp" reaches the second word of "New campaign" and the "utm" in
// "url-utm_source".
const wordStarts = (s) => s.split(/[\s/\-_.:,]+/).filter(Boolean);

function scoreField({ label, description, keywords }, q) {
  const name = norm(label);
  if (!name && !description && !(keywords || []).length) return 0;
  if (name === q) return SCORE.exact;
  if (name.startsWith(q)) return SCORE.prefix;
  if (wordStarts(name).some((w) => w.startsWith(q))) return SCORE.wordStart;
  if (name.includes(q)) return SCORE.contains;
  for (const k of keywords || []) {
    const key = norm(k);
    if (key === q || key.startsWith(q)) return SCORE.keyword;
  }
  if (norm(description).includes(q)) return SCORE.description;
  if (subsequence(name, q)) return SCORE.subsequence;
  return 0;
}

/**
 * What one item is worth against one query. 0 means it is not a result.
 *
 * An empty query scores everything the same, so a palette nobody has typed into
 * shows what the caller passed, in the caller's order — which is where a
 * product puts the four things somebody actually does here.
 *
 * A query with a space in it has to match as a whole OR token by token, every
 * token landing somewhere: "new camp" reaches "New campaign" as a whole, and
 * "camp new" reaches it one token at a time. The weakest token decides, because
 * a result is only as good as the part of the query it answers worst.
 */
export function scoreCommand(item, query) {
  const q = norm(query);
  if (!q) return 1;
  const whole = scoreField(item, q);
  const tokens = q.split(' ');
  if (tokens.length < 2) return whole;
  let weakest = Infinity;
  for (const t of tokens) {
    const s = scoreField(item, t);
    if (!s) { weakest = 0; break; }
    weakest = Math.min(weakest, s);
  }
  return Math.max(whole, weakest === Infinity ? 0 : weakest);
}

/**
 * The items that answer `query`, best first.
 *
 * Ties keep the caller's order — that is the whole of the kit's ordering
 * opinion, and it is what lets a product put its four most-used commands at the
 * top of the list it passes and have them stay there.
 */
export function rankCommands(items, query) {
  return (items || [])
    .map((item, i) => ({ item, i, score: scoreCommand(item, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.item);
}

/**
 * The groups that answer `query`, best group first, each holding its own ranked
 * rows and nothing that scored zero.
 *
 * A group is carried by its best row, and the caller's order breaks the tie at
 * both levels — so a palette nobody has typed into is exactly the list that was
 * passed in. cmdk ranks groups the same way; the tie-break is the kit's, and it
 * is what keeps a heading from moving under a reader who has typed nothing.
 */
export function rankGroups(groups, query) {
  return (groups || [])
    .map((g, i) => {
      const items = rankCommands(g.items || [], query);
      const best = items.length ? scoreCommand(items[0], query) : 0;
      return { group: { ...g, items }, i, best };
    })
    .filter((g) => g.group.items.length > 0)
    .sort((a, b) => b.best - a.best || a.i - b.i)
    .map((g) => g.group);
}

/** The label for the key that opens it, on the platform the caller is on. */
export function paletteHotkey(platform = typeof navigator === 'undefined' ? '' : navigator.platform) {
  return /mac|iphone|ipad|ipod/i.test(String(platform || '')) ? '⌘K' : 'Ctrl K';
}
