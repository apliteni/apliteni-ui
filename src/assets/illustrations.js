// Duotone spot illustrations for empty states (132×110). Feather-style line
// work in the current accent (`.ui-illo__stroke` + soft `.ui-illo__fill`) with
// a small Apliteni-green spark (`.ui-illo__spark`). Returned as full <svg>
// markup so the portal can server-render them with no framework — same idiom
// as icons.js. Colours come from empty.css, so they track the active accent.

// A 4-point sparkle placed at (x, y) — the brand-green accent detail.
const spark = (x, y) =>
  `<path class="ui-illo__spark" transform="translate(${x} ${y})" d="M0 0c.6 4 2.6 6 6.5 7-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.8 5.9-2.6 6.5-7z"/>`;

const svg = (inner) =>
  `<svg class="ui-illo" width="132" height="110" viewBox="0 0 132 110" fill="none" aria-hidden="true">${inner}</svg>`;

const ILLO = {
  // A member card with an avatar — People, contributors, team.
  people: svg(`
    <rect class="ui-illo__fill" x="22" y="34" width="70" height="56" rx="9"/>
    <rect class="ui-illo__stroke" x="34" y="24" width="70" height="56" rx="9"/>
    <circle class="ui-illo__stroke" cx="69" cy="45" r="9"/>
    <path class="ui-illo__stroke" d="M53 70c0-9 7-13 16-13s16 4 16 13"/>
    ${spark(104, 20)}`),

  // A document under a magnifier — Invoices, filtered lists with no match.
  invoices: svg(`
    <rect class="ui-illo__fill" x="28" y="26" width="58" height="70" rx="7"/>
    <rect class="ui-illo__stroke" x="40" y="16" width="58" height="70" rx="7"/>
    <path class="ui-illo__stroke" d="M52 34h34M52 48h34M52 62h22"/>
    <circle class="ui-illo__stroke" cx="92" cy="76" r="14"/>
    <path class="ui-illo__stroke" d="M102 86l11 11"/>
    ${spark(112, 18)}`),

  // A statement with an exchange glyph — Transactions, payouts, ledgers.
  transactions: svg(`
    <rect class="ui-illo__fill" x="24" y="32" width="72" height="56" rx="9"/>
    <rect class="ui-illo__stroke" x="34" y="22" width="72" height="56" rx="9"/>
    <path class="ui-illo__stroke" d="M46 40h26M46 52h34M46 64h18"/>
    <path class="ui-illo__stroke" d="M96 46h14l-5-5M110 60H96l5 5"/>
    ${spark(112, 20)}`),

  // A magnifier over a couple of rows — search / no results.
  search: svg(`
    <circle class="ui-illo__fill" cx="58" cy="50" r="30"/>
    <circle class="ui-illo__stroke" cx="58" cy="50" r="30"/>
    <path class="ui-illo__stroke" d="M48 44h20M48 54h12"/>
    <path class="ui-illo__stroke" d="M80 72l17 17"/>
    ${spark(96, 16)}`),

  // A robot head — Agents, connections, integrations.
  agents: svg(`
    <rect class="ui-illo__fill" x="30" y="38" width="64" height="48" rx="13"/>
    <rect class="ui-illo__stroke" x="40" y="30" width="64" height="48" rx="13"/>
    <circle class="ui-illo__stroke" cx="60" cy="54" r="4"/>
    <circle class="ui-illo__stroke" cx="84" cy="54" r="4"/>
    <path class="ui-illo__stroke" d="M60 66h24"/>
    <path class="ui-illo__stroke" d="M72 30v-8M72 16v.01"/>
    ${spark(108, 24)}`),

  // A classic inbox tray — generic fallback for "nothing here yet".
  inbox: svg(`
    <path class="ui-illo__fill" d="M30 52h72l-9 28a7 7 0 0 1-6.6 5H45.6a7 7 0 0 1-6.6-5z"/>
    <path class="ui-illo__stroke" d="M30 52l9-24a7 7 0 0 1 6.6-4.5h40.8A7 7 0 0 1 93 28l9 24"/>
    <path class="ui-illo__stroke" d="M30 52h20l4 11h24l4-11h20"/>
    ${spark(108, 20)}`),
};

// illo(name) → SVG markup. Unknown names fall back to the neutral inbox tray.
export const illo = (name) => ILLO[name] || ILLO.inbox;
export const illoNames = Object.keys(ILLO);
