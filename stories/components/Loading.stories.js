import { skeleton, skeletonTable, busyRegion, setBusy, deniedState } from '../../src/components/loading.js';
import { button, card } from '../../src/components/index.js';
import { pad, grid, specimen } from '../_gallery.js';

export default {
  title: 'Components/Loading & denied',
  parameters: { layout: 'fullscreen' },
};

const inCard = (html) => card({ body: html });
const col = (html, w = 520) => `<div style="max-width:${w}px">${html}</div>`;

// The default region: a polite live region, aria-busy, and a three-bar
// skeleton. The sr-only line inside it is the only thing spoken — the bars are
// aria-hidden, because a shimmer is a picture of content rather than content.
export const Default = {
  render: () => pad(col(inCard(busyRegion({ label: 'Loading your report…', lines: 3 })))),
};

// The shapes. `lines` as an array gives explicit widths where the ragged edge
// of real prose matters; `height` makes one solid block for a chart or a map.
export const Shapes = {
  render: () => pad(grid(2,
    specimen('skeleton() — three bars', inCard(skeleton({ lines: 3 }))),
    specimen('skeleton({ lines: [...] }) — measured widths', inCard(skeleton({ lines: ['100%', '88%', '94%', '41%'] }))),
    specimen('skeleton({ height }) — one block', inCard(skeleton({ lines: 1, height: '140px' }))),
    specimen('skeletonTable({ rows, cols })', inCard(skeletonTable({ rows: 4, cols: 4 }))),
  )),
};

// Denied. Same layout language as the empty state, because to a reader they are
// the same event — what you came for is not here. The lock says which one, and
// `need` names the missing scope verbatim so the reader can ask for it by name.
export const Denied = {
  render: () => pad(col(inCard(deniedState({
    title: 'You don’t have access to this report',
    sub: 'Finance reports are visible to the finance and admin roles. Your token reads the account only.',
    need: 'reports.read',
    actions: [
      { label: 'Request access', variant: 'primary', icon: 'mail' },
      { label: 'Back to overview', variant: 'secondary' },
    ],
  })))),
};

// Denied without an ask. Some doors have no doorbell, and inventing a "Request
// access" button that files nothing is worse than saying so.
export const DeniedNoAction = {
  name: 'Denied — nothing to ask',
  render: () => pad(col(inCard(deniedState({
    title: 'This workspace is not yours',
    sub: 'Ask an owner to invite you, then this page will load.',
  })))),
};

// The transition, live. This is the whole point of the component and the only
// specimen that can show it: one region stays in the document, its body swaps
// and its sr-only line is rewritten. Rewriting the text of a live region that
// is ALREADY there is what assistive tech acts on — inserting a fresh
// role="status" together with its text is the silent version of this screen.
//
// The region below announces "Loading 6 payouts…", then whichever of the two
// endings you press for. Turn a screen reader on and press them.
export const Transitions = {
  name: 'Transition — loading → loaded / denied',
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:40px;min-height:100vh';
    const ROWS = [
      ['1162', '2026-06-30', '11,871.49'],
      ['1163', '2026-06-29', '27,834.31'],
      ['1164', '2026-06-26', '15,201.57'],
    ];
    const table = `<table class="ui-table ui-table--dense ui-table--hover">
      <thead><tr><th>ID</th><th>Arrival</th><th class="ui-table__num">Net (EUR)</th></tr></thead>
      <tbody>${ROWS.map(([id, arr, net]) =>
        `<tr><td><a href="#">${id}</a></td><td>${arr}</td><td class="ui-table__num">${net}</td></tr>`).join('')}</tbody>
    </table>`;

    wrap.innerHTML = `
      <div style="max-width:640px">
        <div style="display:flex;gap:10px;margin-bottom:20px">
          ${button({ label: 'Loading', variant: 'secondary', size: 'sm' })}
          ${button({ label: 'Loaded', variant: 'primary', size: 'sm' })}
          ${button({ label: 'Denied', variant: 'danger', size: 'sm' })}
        </div>
        <div id="lz-host">${card({
          title: 'Payouts',
          body: busyRegion({ label: 'Loading 3 payouts…', lines: 4 }),
        })}</div>
      </div>`;

    const host = wrap.querySelector('#lz-host');
    const [toLoading, toLoaded, toDenied] = wrap.querySelectorAll('.ui-btn');
    toLoading.addEventListener('click', () =>
      setBusy(host, { busy: true, body: skeletonTable({ rows: 3, cols: 3 }) }));
    toLoaded.addEventListener('click', () =>
      setBusy(host, { busy: false, message: '3 payouts', body: table }));
    toDenied.addEventListener('click', () => setBusy(host, {
      busy: false,
      message: 'You don’t have access to payouts.',
      body: deniedState({
        title: 'You don’t have access to payouts',
        sub: 'Your token reads the account only.',
        need: 'reports.read',
      }),
    }));
    return wrap;
  },
};

// A busy button is a control saying it is working; a busy region is the screen
// saying it. Side by side, because the pair is the rule: the button alone
// leaves everything around it looking finished and saying nothing.
export const ButtonAndScreen = {
  name: 'Busy button vs busy screen',
  render: () => pad(grid(2,
    specimen('button({ busy: true }) — one control', inCard(
      button({ label: 'Saving…', variant: 'primary', busy: true }))),
    specimen('busyRegion() — the screen around it', inCard(
      busyRegion({ label: 'Saving your preferences…', lines: 3 }))),
  )),
};
