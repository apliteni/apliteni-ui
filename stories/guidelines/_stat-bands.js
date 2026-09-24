import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('stat-bands.md', new URL('../../guidelines/stat-bands.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { badge, card } from '../../src/components/index.js';
import { statBand } from '../../src/components/stat.js';
import { sparkline } from '../lib/sparkline.js';

// Every specimen is figures from the finance portal's Company Overview, so the
// halves of a pair differ in one decision and not in their data.
export const SPEC_CSS = `
  <style>
    .gs-stage { background: var(--bg); border-radius: var(--radius-lg); padding: var(--space-4); }
  </style>`;

const stage = (html) => `<div class="gs-stage">${html}</div>`;
const BASIS = 'Change against the previous 12 months';
const INCOME = [412, 455, 430, 498, 520, 505, 560, 548, 590, 610, 587, 640];

export const RULES = withSpecimens(content.rules, [
{ id: 'a-band-not-a-card', doHtml: () => stage(statBand({
      id: 'gs-band-do',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%' }, trend: sparkline(INCOME, 'Income, last 12 months') },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%' } },
      ],
    })), dontHtml: () => stage(card({
      body: '<div class="ui-eyebrow">Income</div>'
        + '<div class="ui-card__title">€ 6,459,401</div>'
        + badge('+47.1%'),
    })) },
{ id: 'tone-not-direction', doHtml: () => stage(statBand({
      id: 'gs-tone-do',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'bad' } },
        { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%' } },
        { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'good' } },
      ],
    })), dontHtml: () => stage(statBand({
      id: 'gs-tone-dont',
      basis: BASIS,
      stats: [
        { label: 'Income', value: '€ 6,459,401', delta: { value: '+47.1%', tone: 'good' } },
        { label: 'Cost', value: '€ 4,127,880', delta: { value: '+12.4%', tone: 'good' } },
        { label: 'Net cashflow', value: '+€ 2,331,521', delta: { value: '+168.0%', tone: 'good' } },
        { label: 'Unclassified', value: '€ 84,210', delta: { value: '−61.8%', tone: 'bad' } },
      ],
    })) },
{ id: 'say-the-basis' }
]);
