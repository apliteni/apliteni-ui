// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { badge, card } from '../../src/components/index.js';
import { statBand } from '../../src/components/stat.js';
import { sparkline } from '../lib/sparkline.js';

export const TITLE = 'Stat bands';

export const BLURB = 'How a screen shows its key figures, and what a change beside one owes the reader.';

// Every specimen is figures from the finance portal's Company Overview, so the
// halves of a pair differ in one decision and not in their data.
export const SPEC_CSS = `
  <style>
    .gs-stage { background: var(--bg); border-radius: var(--radius-lg); padding: var(--space-4); }
  </style>`;

const stage = (html) => `<div class="gs-stage">${html}</div>`;
const BASIS = 'Change against the previous 12 months';
const INCOME = [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640];

export const RULES = [
  {
    id: 'a-band-not-a-card',
    imperative: 'Put key figures in a stat band, not in a card of parts.',
    doHtml: () => stage(statBand({
      id: 'gs-band-do',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' }, trend: sparkline(INCOME, 'Income, last 12 months') },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
      ],
    })),
    dontHtml: () => stage(card({
      body: '<div class="ui-eyebrow">Income</div>'
        + '<div class="ui-card__title">€ 6,459,401</div>'
        + badge('+47.1%'),
    })),
    doCaption: 'The figure is the largest thing in the card, and the change reads as a change: '
      + 'an arrow, a signed number, and what it is measured against underneath.',
    dontCaption: 'The Overview card rejected in #267, rebuilt from the same kit parts. The figure sits '
      + 'at the card-title step, so the page\'s key numbers are the size of its headings, and the '
      + 'change is a status chip: capitals, 10px, and nothing to say what it is measured against.',
    kit: [{ ref: 'src/styles/stat.css:41', pattern: 'font-size: var(--text-2xl);' }],
  },
  {
    id: 'tone-not-direction',
    imperative: 'Colour a change by whether it is good news, not by which way it points.',
    doHtml: () => stage(statBand({
      id: 'gs-tone-do',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
        { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%' } },
        { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' } },
      ],
    })),
    dontHtml: () => stage(statBand({
      id: 'gs-tone-dont',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'good' } },
        { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: 'good' } },
        { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'bad' } },
      ],
    })),
    doCaption: 'Four figures, four verdicts. Income and Cost both rose and are coloured oppositely, '
      + 'because a rise in income and a rise in cost are not the same news. Unclassified fell, and '
      + 'fewer unclassified rows is the good news, so that fall is the other green. Net cashflow was '
      + 'left undeclared, so it stays grey.',
    dontCaption: 'The same four, coloured by the sign. Three rises, three greens, so a year of cost '
      + 'growth is congratulated — and the cleanup the team did this year is the only thing in red.',
    why: 'Neutral is the band saying nothing about the news, and it is what a change gets when nobody '
      + 'declares a tone. Leave it undeclared when the screen has no verdict to give: a volume nobody '
      + 'scores, a figure whose good direction depends on who is reading it, or one the figures beside it '
      + 'have already accounted for — net cashflow is income less cost, and those two have said whose '
      + 'news it is. An undeclared change still draws its arrow and still says what it is measured '
      + 'against. It is the colour, and only the colour, that is withheld. A caller who would rather say '
      + 'it out loud passes the tone "neutral", which reads the same.',
    kit: [{ ref: 'src/components/stat.js:43', pattern: "delta.tone !== 'neutral'" }],
  },
  {
    id: 'say-the-basis',
    imperative: 'Say what a change is measured against, in text the reader can reach.',
    why: 'A percentage with no basis is a number nobody can check. The rejected card put its basis '
      + 'in a title attribute, which a phone never shows and most screen readers skip. The band says it once '
      + 'in a caption every change points at, or beside the one change measured against something '
      + 'else. A band that shows a change with neither fails stories/stat-basis.test.js, which is '
      + 'why this rule has no drawn don\'t.',
    kit: [{ ref: 'src/components/stat.js:34', pattern: 'aria-describedby' }],
  },
];
