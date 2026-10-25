import { esc } from '../html.js';

// Tiny highlighters. Each escapes first, then wraps the tokens its language
// shows, using the class names in styles/code.css (.k .f .s .u .c). Shell is
// ported from viz/account.mjs; JSON and TypeScript were added for the snippets
// the kit's own docs show.
//
// Every pattern runs over ESCAPED text, so a quoted string ends at &quot; and a
// shell URL stops at any entity. The group order is the class order beside it.
//
// They are small on purpose — they colour short documentation snippets, not
// arbitrary programs. Known limits: no nested template expressions, no regex
// literals, and in TypeScript a `//` inside a string reads as a comment unless a
// `:` precedes it, which is what keeps a URL in a string whole.
const LANGUAGES = {
  shell: {
    pattern: /(#[^\n]*)|(&quot;(?:[^&]|&(?!quot;))*&quot;|'[^']*')|(https?:\/\/[^\s"'&]+)|(\B--?[A-Za-z][\w-]*)|(^[a-z][\w.-]*)/gm,
    classes: ['c', 's', 'u', 'f', 'k'],
  },
  // A key is a string followed by a colon, matched by lookahead so the colon
  // stays unpainted. Keys, string values and scalars take three different
  // classes, because a number that looks exactly like a key is not highlighting.
  json: {
    pattern: /(&quot;(?:[^&]|&(?!quot;))*&quot;)(?=\s*:)|(&quot;(?:[^&]|&(?!quot;))*&quot;)|(\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    classes: ['k', 's', 'f'],
  },
  ts: {
    pattern: /(\/\*[\s\S]*?\*\/|(?<![:/])\/\/[^\n]*)|(&quot;(?:[^&]|&(?!quot;))*&quot;|'[^']*'|`[^`]*`)|(\b(?:import|export|from|const|let|var|function|return|async|await|class|extends|implements|interface|type|enum|new|if|else|for|while|of|in|as|default|readonly|void)\b)|(\b(?:true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g,
    classes: ['c', 's', 'k', 'f'],
  },
};

/** The languages codeTokens and hlCode understand, so a gate can discover them. */
export const codeLanguages = Object.keys(LANGUAGES);

const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"' };
// The exact inverse of esc: every & in escaped text starts one of these four.
const unesc = (text) => text.replace(/&(amp|lt|gt|quot);/g, (_, name) => ENTITY[name]);

/**
 * A language's tokens, as `[{ cls, text }]` with `cls` null between tokens and
 * `text` the original unescaped source. Concatenating `text` returns `raw`, so a
 * React caller renders the spans from the same string it copies instead of
 * keeping a second hand-written copy in step. hlCode joins the same tokens into
 * HTML; neither can drift from the other. An unrecognised `lang` is read as
 * shell, the way the kit reads every other unknown option name.
 *
 * No pattern ever matches inside an entity — `#`, `h`, `-`, `/`, `*`, a digit and
 * `^[a-z]` do not occur in `&amp;`, `&lt;`, `&gt;` or `&quot;`, no keyword is one
 * of `amp`, `lt`, `gt` or `quot`, and every alternative either stops before `&` or
 * consumes a whole `&quot;` — so each slice is entity-complete and
 * `esc(unesc(slice))` returns the slice unchanged. hlCode's output is therefore
 * byte-identical to wrapping the matches in place, which
 * src/logic/code.test.js holds for every language, against a copy
 * of the one-pass implementation hlShell had before #474.
 */
export function codeTokens(raw, lang = 'shell') {
  const { pattern, classes } = LANGUAGES[lang] || LANGUAGES.shell;
  const escaped = esc(raw);
  const out = [];
  let at = 0;
  pattern.lastIndex = 0;
  for (const match of escaped.matchAll(pattern)) {
    if (match.index > at) out.push({ cls: null, text: unesc(escaped.slice(at, match.index)) });
    out.push({ cls: classes[match.slice(1).findIndex(Boolean)], text: unesc(match[0]) });
    at = match.index + match[0].length;
  }
  if (at < escaped.length) out.push({ cls: null, text: unesc(escaped.slice(at)) });
  return out;
}

export const hlCode = (raw, lang = 'shell') =>
  codeTokens(raw, lang).map(({ cls, text }) => (cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text))).join('');

export const hlShell = (raw) => hlCode(raw, 'shell');
