// The hero's slogans. The page picks one at random on every load and writes it
// into the h1 before first paint, so nothing flashes. Entry 1 is what a visitor
// without JavaScript sees, which is why it may not depend on the theme.
//
// [brackets] mark the one word or phrase that wears the accent gradient, so a
// slogan's words and its markup cannot drift apart. A themed slogan carries one
// form per theme and follows the toggle live.
//
// Artur picks the shipped set by number on a later round (#463, round r24); the
// numbering here is the numbering he is choosing from, so do not reorder it.

export const SLOGANS = [
  'A UI kit, already [polished]',
  '[Suspiciously] polished',
  'Nobody argues about [padding] anymore',
  'Polished down to the [focus ring]',
  { dark: 'Beautiful in the [dark], too', light: 'Beautiful in the [light], too' },
  'The styling is [decided]',
  'Every decision, [already made]',
  'Dark and light, [four accents]',
  'Your app, [dressed] already',
  'Ship the UI, [skip] the arguing',
  '[Taste], shipped as CSS',
  'One ring on every [control]',
  'The [boring] parts, decided',
  'Looks designed, because it [was]',
  'No [taste] required',
  '[Consistency], without the committee',
  'A kit with [opinions]',
  'Fewer decisions, [better] screens',
  'It already [matches] itself',
  'The [guidelines] ship with it',
];

export const MAX_WORDS = 6;
const THEMES = ['dark', 'light'];

/** The slogan as a reader hears it, with the accent brackets taken off. */
export function sloganText(form) {
  return form.replace(/\[([^\]]*)\]/g, '$1');
}

/** The slogan as the hero renders it: the bracketed part wears the gradient. */
export function sloganHtml(form) {
  return form.replace(/\[([^\]]*)\]/g, '<span class="grad">$1</span>');
}

/** Every rule a single form must pass. Throws, so a bad slogan fails the build
 *  rather than reaching the page. */
export function checkForm(form, where) {
  const at = `slogan ${where}`;
  if (typeof form !== 'string' || !form.trim()) throw new Error(`${at}: empty`);
  if (/[<>]/.test(form)) throw new Error(`${at}: writes markup; use [brackets] for the accent`);
  if (/[–—]/.test(form)) throw new Error(`${at}: uses a dash Artur asked slogans not to use`);
  const marks = form.match(/\[([^\]]*)\]/g) || [];
  if (marks.length !== 1) throw new Error(`${at}: needs exactly one [accent] group, found ${marks.length}`);
  if (!marks[0].slice(1, -1).trim()) throw new Error(`${at}: the [accent] group is empty`);
  const words = sloganText(form).trim().split(/\s+/).length;
  if (words > MAX_WORDS) throw new Error(`${at}: ${words} words, the limit is ${MAX_WORDS}`);
  return form;
}

/** Every rule the list as a whole must pass. */
export function checkSlogans(list = SLOGANS) {
  if (!Array.isArray(list) || !list.length) throw new Error('the slogan list is empty');
  const seen = new Set();
  list.forEach((entry, i) => {
    const n = i + 1;
    if (typeof entry === 'string') {
      checkForm(entry, n);
    } else {
      if (!entry || typeof entry !== 'object') throw new Error(`slogan ${n}: not a slogan`);
      const keys = Object.keys(entry).sort();
      if (keys.join() !== THEMES.slice().sort().join()) {
        throw new Error(`slogan ${n}: a themed slogan needs one form per theme (${THEMES.join(', ')}), got ${keys.join(', ') || 'none'}`);
      }
      // A themed slogan at position 1 would leave a no-JS visitor with a line
      // that cannot follow the theme, because nothing is there to switch it.
      if (n === 1) throw new Error('slogan 1 is what a visitor without JavaScript sees, so it cannot be themed');
      for (const theme of THEMES) checkForm(entry[theme], `${n} (${theme})`);
    }
    for (const text of textsOf(entry)) {
      if (seen.has(text)) throw new Error(`slogan ${n}: "${text}" is already in the list`);
      seen.add(text);
    }
  });
  return list;
}

function textsOf(entry) {
  return typeof entry === 'string' ? [sloganText(entry)] : THEMES.map((t) => sloganText(entry[t]));
}

/** The h1's contents: every slogan ships inside it, and CSS shows one. */
export function sloganMarkup(list = SLOGANS) {
  checkSlogans(list);
  return list.map((entry) => (typeof entry === 'string'
    ? `<span class="s">${sloganHtml(entry)}</span>`
    : `<span class="s">${THEMES.map((t) => `<span class="t t--${t}">${sloganHtml(entry[t])}</span>`).join('')}</span>`
  )).join('');
}

/** Which slogan shows, and which form of a themed one. Both are CSS, so the
 *  first paint already has the right words at the right height, and the theme
 *  toggle switches a themed slogan inside its own crossfade with no script. */
export const SLOGAN_CSS = `
  /* Every slogan is in the h1; this shows one. Without JavaScript that is the
     first, which is why these two rules stand on their own. */
  #slogan .s { display: none; }
  #slogan .s:first-child { display: inline; }
  /* A themed slogan carries one form per theme and follows data-theme. */
  #slogan .t--light { display: none; }
  html[data-theme="light"] #slogan .t--dark { display: none; }
  html[data-theme="light"] #slogan .t--light { display: inline; }
`;

/** The head script: settle the theme, then name the slogan of this load.
 *  It runs before the hero is parsed, which is the whole point. */
export function sloganScript(list = SLOGANS) {
  checkSlogans(list);
  return `
  // Chosen up here because a script placed after the h1 can be beaten to the
  // screen: the browser painted the first slogan and then swapped it for the
  // picked one (#463, round r24). A rule emitted before the hero is parsed
  // cannot be beaten, and the line is never laid out at the wrong height.
  (function () {
    var root = document.documentElement;
    // The chrome script settles the theme much further down the page. Doing it
    // now is what lets the theme-following slogan be right in the first frame;
    // the chrome then computes the same value from the same two sources.
    var saved = null; try { saved = localStorage.getItem('apliteni-ui-theme'); } catch (e) { saved = null; }
    root.setAttribute('data-theme', saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    var pick = Math.floor(Math.random() * ${list.length}) + 1;
    var style = document.createElement('style');
    style.textContent = '#slogan .s:first-child{display:none}#slogan .s:nth-child(' + pick + '){display:inline}';
    document.head.appendChild(style);
  })();
`;
}

/** Fill the hero's three markers: the slogans, the rules that show one, and the
 *  script that chooses. */
export function sloganCopy(template, list = SLOGANS) {
  const facts = {
    SLOGAN: sloganMarkup(list),
    SLOGAN_CSS,
    SLOGAN_JS: sloganScript(list),
  };
  for (const [key, value] of Object.entries(facts)) {
    const marker = `{{${key}}}`;
    if (template.split(marker).length !== 2) throw new Error(`Expected one ${marker}`);
    template = template.replace(marker, value);
  }
  return template;
}
