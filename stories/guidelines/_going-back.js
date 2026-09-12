// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { button } from '../../src/components/index.js';
import { backLink } from '../../src/components/back.js';
import { breadcrumbs, sidebarNav } from '../../src/components/nav.js';

export const TITLE = 'Going back';

export const BLURB = 'When a page gets a way back up, where it sits, and what it says.';

// The specimens are the top of a page — the link, and the title under it — so
// the stage draws a title in the page's own face at a size that fits the
// panel. A <p>, not an <h1>: one guideline page must not carry a dozen h1s.
export const SPEC_CSS = `
  <style>
    .gb-head { display: flex; flex-direction: column; gap: var(--space-3); }
    .gb-head > .ui-btn { align-self: flex-start; }
    .gb-title { margin: 0; font: 700 21px/1.15 var(--font-display); letter-spacing: var(--tracking-tight);
      color: var(--strong); }
    .gb-titlerow { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
    .gb-page { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-5); align-items: start; }
  </style>`;

const stage = (html) => `<div class="gl-stage">${html}</div>`;
const head = (above, title, action = '') => stage(`<div class="gb-head">${above}`
  + `<div class="gb-titlerow"><p class="gb-title">${title}</p>${action}</div></div>`);
const back = (label) => backLink({ href: '#', label });

// A rail folded to its icons, so a specimen can show which row is lit beside the
// page it belongs to at the width of one panel.
const RAIL = [
  { id: 'dashboard', icon: 'chart', label: 'Dashboard', href: '#' },
  { id: 'invoices', icon: 'doc', label: 'Invoices', href: '#' },
  { id: 'payouts', icon: 'card', label: 'Payouts', href: '#' },
];
const withRail = (id, active, above) => stage(`<div class="gb-page">`
  + sidebarNav({ items: RAIL, active, activeIs: 'section', collapsed: true, ariaLabel: `${id} sidebar` })
  + `<div class="gb-head">${above}<p class="gb-title">INV-1001</p></div></div>`);

export const RULES = [
  {
    id: 'below-a-list',
    imperative: 'Give a page a back link only when it sits under another page.',
    doHtml: () => head(back('Invoices'), 'Invoice INV-1001'),
    dontHtml: () => head(back('Dashboard'), 'Invoices'),
    doCaption: 'A record opened from the invoice list. There is one page above it, and the link goes there.',
    dontCaption: 'Invoices is a section the sidebar reaches. Nothing sits above it, so the link has to '
      + 'guess where the reader came from, and it names a page that is one click away in the rail.',
    why: 'The sidebar is how a reader moves between sections, and it is on every page. A back link '
      + 'is for the one move the sidebar cannot make: from a record up to the list it belongs to.',
  },
  {
    id: 'name-it',
    imperative: 'Name the page it goes to. Never just “Back”.',
    doHtml: () => head(back('Invoices'), 'Invoice INV-1001'),
    dontHtml: () => head(back('Back'), 'Invoice INV-1001'),
    doCaption: 'The destination, spelled the way the sidebar spells it. A screen reader hears '
      + '“Back to Invoices”, because the arrow is decoration.',
    dontCaption: 'A direction with no place in it. In a screen reader\'s list of the page\'s links it '
      + 'could lead anywhere, and after a reload nobody can check where before pressing it.',
    why: 'The arrow and the position above the title already say “back”, so the words are free to say '
      + 'where. The UK government design system keeps a bare Back for a short form that runs in a '
      + 'straight line, and asks for “Go back to” a named page once the journey branches. A portal of '
      + 'lists and records is the branching case.',
    except: 'A step in a form that runs over several screens goes back a step, not up a level, and says '
      + '“Back”. That is a button in the form, not this link.',
    kit: [{ ref: 'src/components/back.js:54', pattern: 'BARE} to ${name}' }],
  },
  {
    id: 'address-not-history',
    imperative: 'Link to the parent’s address, with its state in it. Leave the history to the browser.',
    why: 'A link that steps back through the history does nothing on a page opened in a new tab, from a '
      + 'bookmark or from a shared address, and it cannot be opened in a new tab itself. The browser\'s '
      + 'Back button already walks the history, and it stays the way to wherever the reader actually '
      + 'was. The back link goes up: to the list this record belongs to, with the filters, the sort and '
      + 'the page the reader left written into the address, so going up costs them nothing. The UK '
      + 'government design system asks the same of its own back link: “in the state they last saw it”. '
      + 'backLink() takes an address and nothing else, and refuses a javascript: one. There is nothing '
      + 'to photograph here, which is why this rule has no pair.',
    except: 'A reader who arrived from somewhere other than the parent — a search, a link in another '
      + 'record — still gets a link to the parent. It is where the page lives, and the browser\'s Back '
      + 'button still knows where they were.',
    kit: [{ ref: 'src/components/back.js:26', pattern: 'const SCRIPTED = /^javascript:/i' }],
  },
  {
    id: 'one-or-the-other',
    imperative: 'Put it above the title, in the trail’s place. Draw a trail or a back link, never both.',
    doHtml: () => head(back('Invoices'), 'Invoice INV-1001'),
    dontHtml: () => head(
      breadcrumbs({
        items: [{ label: 'Finance', href: '#' }, { label: 'Invoices', href: '#' }, { label: 'INV-1001' }],
        ariaLabel: 'Trail beside a back link',
      }) + back('Invoices'),
      'Invoice INV-1001',
    ),
    doCaption: 'One line above the title, starting where the title starts. It is the first thing a '
      + 'reader\'s eye meets on the way into the page, and the last on the way out.',
    dontCaption: 'The trail and the link answer the same question — what is this page under — so the '
      + 'space above the title answers it twice, and the current page is named three times.',
    why: 'A trail earns its place when there is more than one level worth jumping to, and a back link '
      + 'when the only useful way up is one step. The UK government design system puts the rest in a '
      + 'line: “Never use the back link component together with the Breadcrumbs component.” Handed '
      + 'both, appShell() draws the link and leaves the trail out.',
    kit: [{ ref: 'src/components/shell.js:182', pattern: '${up || (crumbs.length' }],
  },
  {
    id: 'section-lit',
    imperative: 'Keep the section lit in the sidebar, and call it by the same name.',
    doHtml: () => withRail('lit', 'invoices', back('Invoices')),
    dontHtml: () => withRail('unlit', null, back('Invoice list')),
    doCaption: 'The row the reader came from is still lit, and the link says the same word. Two signals '
      + 'naming one place.',
    dontCaption: 'Nothing is lit, so the rail has stopped saying where the reader is — and the link '
      + 'calls the place by a second name.',
    why: 'A record opened from a list is still in that list\'s section. Leaving the row lit keeps the '
      + 'rail true. Marking it aria-current="true" rather than "page" keeps it true for a screen reader '
      + 'too, which would otherwise announce the list as the page on screen. appShell() does both when '
      + 'it is handed a back link.',
    kit: [{ ref: 'src/components/nav.js:108', pattern: "const current = activeIs === 'section'" }],
  },
  {
    id: 'quiet',
    imperative: 'Keep it quiet. It is the way out, not what the page is for.',
    doHtml: () => head(back('Invoices'), 'Invoice INV-1001', button({ label: 'Send', variant: 'primary', size: 'sm' })),
    dontHtml: () => head(
      button({ label: 'Back to invoices', variant: 'primary', size: 'sm', icon: 'arrowLeft' }),
      'Invoice INV-1001',
      button({ label: 'Send', variant: 'primary', size: 'sm' }),
    ),
    doCaption: 'Dim ink, no box until the pointer is on it, and smaller than the title under it. The '
      + 'page\'s own action keeps the colour.',
    dontCaption: 'Two filled buttons, and the louder-placed one takes the reader away from the record '
      + 'they opened.',
    why: 'The back link is on every record page, and a reader looks at it once. Painted in the accent '
      + 'or in the host\'s link colour it competes with the title and the page\'s action on every screen, '
      + 'which is the complaint that opened #270. .ui-back paints --dim, and its colour rule outranks a '
      + 'host a:link, so a page that colours its links leaves this one alone.',
    kit: [{ ref: 'src/styles/back.css:31', pattern: '.ui-back[href] { color: var(--dim); }' }],
  },
];
