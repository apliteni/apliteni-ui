import { loadGuideline, withSpecimens } from './_markdown.js';
const content = await loadGuideline('file-drop.md', new URL('../../guidelines/file-drop.md', import.meta.url));
export const TITLE = content.title;
export const BLURB = content.blurb;
// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { icon } from '../../src/assets/icons.js';

// Each pair is drawn at the width of a panel, because that is where a drop row
// lives: beside the list it feeds, not on a page of its own. The target is
// absolute, so every specimen that shows one holds it inside a frame.
export const SPEC_CSS = `
  <style>
    .gf-frame { background: var(--bg); border-radius: var(--radius-md); box-shadow: inset 0 0 0 1px var(--border);
      padding: var(--space-4); }
    .gf-panel { background: var(--surface); border-radius: var(--radius-md); box-shadow: inset 0 0 0 1px var(--border);
      padding: var(--space-4); }
    .gf-panel + .gf-rows, .gf-rows + .gf-panel { margin-top: var(--space-3); }
    .gf-head { font: 600 13px/1.5 var(--font-sans); color: var(--strong); margin-bottom: var(--space-3); }
    .gf-rows__row { display: flex; justify-content: space-between; gap: var(--space-4);
      font: 400 13px/1.6 var(--font-sans); color: var(--text); padding-block: var(--space-1); }
    /* The kit ring, shown at rest, because a specimen cannot be focused. */
    .gf-ring { box-shadow: var(--ring); outline: 2px solid transparent; }
    /* The faults the page draws. They are written here because nothing in the kit
       emits them: the tall box is what a product draws for itself, and the kit's
       own field-sized picker is styled by the React workspace's sheet, which this
       Storybook does not load. */
    .gf-box { display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
      padding: var(--space-6); border: 1px dashed var(--field-edge); border-radius: var(--radius-md);
      font: 400 13px/1.6 var(--font-sans); color: var(--text); text-align: center; }
    .gf-box__glyph { display: flex; padding: var(--space-3); border-radius: var(--radius-md); background: var(--surface-3); }
    .gf-box__glyph svg { width: 24px; height: 24px; }
    .gf-box .ui-btn { margin-top: var(--space-2); }
    .gf-card { margin-top: var(--space-3); background: var(--surface); border-radius: var(--radius-md);
      box-shadow: inset 0 0 0 1px var(--border); padding: var(--space-4);
      font: 400 13px/1.6 var(--font-sans); color: var(--text); }
    .gf-card .ui-drop__bar { flex: none; max-width: none; width: 100%; margin-top: var(--space-2); }
    .gf-repeat { margin: var(--space-2) 0 0; font: 400 13px/1.6 var(--font-sans); color: var(--text); }
  </style>`;

const btn = (label, { size = 'sm', variant = 'secondary', glyph, ring } = {}) =>
  `<button type="button" class="ui-btn ui-btn--${variant}${size === 'md' ? '' : ` ui-btn--${size}`}${ring ? ' gf-ring' : ''}">`
  + `${glyph ? `<span aria-hidden="true" style="display:inline-flex">${icon(glyph)}</span>` : ''}`
  + `<span class="ui-btn__label-slot"><span class="ui-btn__label">${label}</span></span></button>`;

const NOTE = 'PDF or CSV, up to 10 MB';
const note = () => `<p class="ui-drop__note">${NOTE}</p>`;
const bar = (percent) => `<span class="ui-drop__bar"><span style="width:${percent}%"></span></span>`;
const MARKS = { uploading: 'clock', done: 'circleCheck', error: 'circleAlert' };
const state = (words, kind = 'done') =>
  `<span class="ui-drop__state${kind === 'error' ? ' ui-drop__error' : ''}">${icon(MARKS[kind])}`
  + `<span class="ui-drop__word">${words}</span></span>`;
const target = () => '<div class="ui-drop__target">Drop to upload</div>';

/** The row at rest: the picker and the accepted types, and nothing else. */
const restRow = (extra = '') =>
  `<div class="ui-drop__row">${btn('Upload', { glyph: 'upload' })}${note()}${extra}</div>`;

/** The row once a file is in hand. A refused file drops its size, as the component does. */
const fileRow = (parts, { size = true } = {}) => `<div class="ui-drop__row"><div class="ui-drop__file">
  <span class="ui-drop__name">statement-08.pdf</span>${size ? '<span class="ui-drop__size">248 KB</span>' : ''}${parts}</div></div>`;

/** Three statements already received, so a row has the list it feeds above it. */
const RECEIVED = [['statement-07.pdf', '241 KB'], ['statement-06.pdf', '236 KB']];
const rows = () => `<div class="gf-rows">${RECEIVED
  .map(([name, size]) => `<div class="gf-rows__row"><span>${name}</span><span>${size}</span></div>`)
  .join('')}</div>`;

const panel = (body) => `<div class="gf-panel"><div class="gf-head">Statements</div>${body}</div>`;

/** The tall box this page is about, drawn as a product draws it. */
const bigBox = () => `<div class="gf-box">
  <span class="gf-box__glyph">${icon('upload')}</span>
  <div>Drop a file here</div>
  <div>or choose one from your device</div>
  ${btn('Choose file')}
</div>`;

export const RULES = withSpecimens(content.rules, [
  {
    id: 'one-row',
    doHtml: () => panel(`${rows()}<div class="ui-drop">${restRow()}</div>`),
    dontHtml: () => panel(`${rows()}${bigBox()}`),
  },
  {
    id: 'on-drag',
    doHtml: () => `<div class="gf-frame">${panel(
      `<div class="ui-drop">${rows()}${restRow()}${target()}</div>`,
    )}${rows()}</div>`,
    dontHtml: () => `<div class="gf-frame ui-drop">${panel(
      `${rows()}${restRow()}`,
    )}${rows()}${target()}</div>`,
  },
  {
    id: 'in-the-row',
    doHtml: () => panel(`${rows()}<div class="ui-drop">${fileRow(
      `${state('Uploading', 'uploading')}${bar(40)}${btn('Remove', { size: 'xs', variant: 'ghost' })}`,
    )}</div>`),
    dontHtml: () => panel(`<div class="ui-drop">${restRow()}</div>
      <div class="gf-card">statement-08.pdf<br>248 KB — 40%${bar(40)}</div>${rows()}`),
  },
  {
    id: 'failure',
    doHtml: () => panel(`${rows()}<div class="ui-drop">${fileRow(
      `${state('Larger than 10 MB', 'error')}${btn('Retry', { size: 'xs' })}`
      + btn('Remove', { size: 'xs', variant: 'ghost' }), { size: false },
    )}</div>`),
    dontHtml: () => panel(`${rows()}<div class="ui-drop"><div class="ui-drop__row">
      ${state('Upload failed', 'error')}${btn('Upload', { glyph: 'upload' })}</div></div>`),
  },
  {
    id: 'button-path',
    doHtml: () => panel(`${rows()}<div class="ui-drop"><div class="ui-drop__row">${btn('Upload', { glyph: 'upload', ring: true })}${note()}</div></div>`),
    dontHtml: () => panel(`${rows()}<div class="ui-drop"><div class="ui-drop__row">
      <p class="ui-drop__note">Drag a file here</p></div></div>`),
  },
  {
    id: 'limits-once',
    doHtml: () => panel(`${rows()}<div class="ui-drop">${restRow()}</div>`),
    dontHtml: () => panel(`${rows()}<div class="ui-drop">${restRow()}</div>
      <p class="gf-repeat">${NOTE}</p>
      <p class="gf-repeat">${state(NOTE, 'error')}</p>`),
  },
  { id: 'which-shape' },
]);
