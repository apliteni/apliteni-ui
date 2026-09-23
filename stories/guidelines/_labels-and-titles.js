// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { badge, card } from '../../src/components/index.js';

export const TITLE = 'Labels and titles';

export const BLURB = 'Body ink for words; hierarchy through size, weight and spacing, with a closed list of exceptions.';

const stage = (html) => `<div class="gl-stage">${html}</div>`;

const figure = (label, value, chip) => `<div>
  <div class="ui-eyebrow">${label}</div>
  <div style="font:600 var(--text-xl)/1.2 var(--font-display);color:var(--strong);margin:var(--space-1) 0 var(--space-2)">${value}</div>
  ${chip}</div>`;

const band = (a, b) => stage(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
  ${figure(a[0], '€4.81M', badge(a[1], 'success'))}${figure(b[0], '14', badge(b[1], 'danger'))}</div>`);

export const caseDo = () => band(['Income', '+12% on last year'], ['Invoices waiting', '3 overdue']);
export const caseDont = () => band(['INCOME', '+12% ON LAST YEAR'], ['INVOICES WAITING', '3 OVERDUE']);

// Inside the shell's main column, so the h1 takes the page title's rank.
const page = (cardHtml) => stage(`<div class="ui-app__main" style="padding:0;--ui-app-main:100%">
  <h1>Overview</h1>${cardHtml}</div>`);

export const rankDo = () => page(card({ title: 'Monthly cashflow', sub: 'Income and expenses by month.' }));
export const rankDont = () => page(`<div class="ui-card"><h1>Monthly cashflow</h1>
  <div class="ui-card__sub">Income and expenses by month.</div></div>`);

export const eyebrowDo = () => stage(`<div class="ui-card"><div class="ui-eyebrow">Last 30 days</div>
  <h2 class="ui-card__title">Top contractors</h2><div class="ui-card__sub">Paid out, by counterparty.</div></div>`);
export const eyebrowDont = () => stage(`<div class="ui-card"><div class="ui-eyebrow">Top contractors</div>
  <div class="ui-card__sub">Paid out, by counterparty.</div></div>`);

const inkSample = (ink) => stage(card({ body: ['xs', 'sm', 'base'].map(size =>
  `<p style="font-size:var(--text-${size});color:var(--${ink});margin-bottom:var(--space-3)">Updated 23 Sep · ready to export</p>`,
).join('') }));

export const RULES = [
  {
    id: 'text-ink',
    imperative: 'Use body ink for words at every size; build hierarchy with size, weight and spacing.',
    why: 'A description, timestamp or label still has to be read. Muted text can pass contrast checks and still look like decoration, especially at small sizes. Making a line secondary must not make its information harder to read.',
    doHtml: () => inkSample('text'),
    dontHtml: () => inkSample('muted'),
    doCaption: 'The same sentence at xs, sm and base in body ink. Size separates the ranks.',
    dontCaption: 'The same sizes in muted ink. Passing contrast does not make fading a hierarchy cue.',
    kit: [{ ref: 'src/styles/base.css:123', pattern: 'color: var(--text);' }],
  },
  {
    id: 'text-ink-exceptions',
    imperative: 'Keep muted and dim ink only for the three named exception classes.',
    why: 'A closed list lets a reviewer distinguish intended state or placeholder ink from words faded merely to rank them. Extend the list by opening an issue, never by treating “decorative” as a fourth class.',
    except: 'Only: (1) glyphs that are not words, such as an arrow, chevron or dismiss mark; (2) colour reporting off, unset, disabled or archived state; (3) a slot with no value, such as an empty field or cell placeholder. An unselected option, “No earlier figure” sentence, count, timestamp, keyboard shortcut, enabled action or empty-state instruction is still information, not an exception.',
    kit: [{ ref: 'src/styles/muted-ink.test.js:1', pattern: 'Every muted/dim colour path' }],
  },
  {
    id: 'sentence-case',
    imperative: 'Write every label in sentence case, and never set it in capitals by style.',
    why: 'Capitals are slower to read (Carbon, USWDS), take more room per letter, and make a label louder than the figure it names.',
    except: 'A word that is capitals in itself — an acronym, a currency code, a key name — is typed that way: USD, API, Esc.',
    doCaption: 'Written in sentence case and shown as written.',
    dontCaption: 'The same labels in capitals: the figures lose to their own captions.',
    doHtml: caseDo,
    dontHtml: caseDont,
    kit: [
      { ref: 'src/styles/base.css:117', pattern: 'in sentence case like every' },
      { ref: 'src/components/topbar.js:44', pattern: 'the kit writes the word for it' },
      { ref: 'stories/guidelines/letter-case.test.js:1', pattern: 'text is never set in capitals by style' },
    ],
  },
  {
    id: 'title-rank',
    imperative: 'Set a card title one rank under the page title and one above the body.',
    why: 'A card title as large as the page title splits the page in two, and one the size of the body stops reading as a title.',
    doCaption: 'The page title at --text-2xl, the card title at --text-lg.',
    dontCaption: 'The card titled with a second h1: two page titles, and nothing says which one the page is.',
    doHtml: rankDo,
    dontHtml: rankDont,
    kit: [
      { ref: 'src/styles/layout.css:398', pattern: 'rank: page-title' },
      { ref: 'src/styles/card.css:57', pattern: 'rank: card-title' },
    ],
  },
  {
    id: 'title-is-heading',
    imperative: 'Make a card title a heading one level under the page title, and let the class set its look.',
    why: 'A title in a div is not in the page outline, so a reader moving by heading skips every card on the page.',
    except: 'A card inside a section that has an h2 of its own takes level 3.',
    kit: [
      { ref: 'src/components/index.js:63', pattern: 'const h = [2, 3, 4, 5, 6]' },
      { ref: 'react/src/primitives/Card.tsx:9', pattern: 'const Heading' },
    ],
  },
  {
    id: 'eyebrow-names-the-kind',
    imperative: 'Put an eyebrow above a title to say what kind of thing it is, never in place of the title.',
    why: 'An eyebrow alone is a caption with nothing under it to caption, and the card is left without a title anyone can find.',
    doCaption: 'The eyebrow says which period; the title says what is shown.',
    dontCaption: 'The eyebrow is the only title: label size, and no heading behind it.',
    doHtml: eyebrowDo,
    dontHtml: eyebrowDont,
    kit: [
      { ref: 'src/styles/base.css:120', pattern: 'rank: label' },
    ],
  },
];
