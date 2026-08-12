import { confirm } from '../../src/components/confirm.js';
import { button, card } from '../../src/components/index.js';

// Confirms are position:fixed overlays: each story renders a little faux page
// behind so the scrim reads true, then the dialog on top. Open-state specimens
// pass `open: true` (mirrors the Drawer stories' open specimens). Interactive
// stories use a [data-confirm-open="id"] trigger; the preview decorator wires
// them via wireConfirm().
export default {
  title: 'Components/Confirm',
  parameters: { layout: 'fullscreen' },
};

const behind = (inner = '') => `
  <div style="min-height:100vh;padding:40px">
    <div style="max-width:560px">
      <h1 style="font:600 22px/1.2 Poppins;color:var(--strong);margin:0 0 10px">Workspace “Nebula”</h1>
      <p style="font:400 13px/1.6 Poppins;color:var(--muted);margin:0 0 24px">
        A confirm stops the page until the question is answered. Focus opens on the
        answer that changes nothing; Tab cannot leave the panel; Escape or the safe
        answer returns focus to the trigger.
      </p>
      ${inner}
      <p style="font:400 11px/1.6 Poppins;color:var(--muted);margin:24px 0 0">
        This link is here to Tab to: <a href="#nebula">workspace settings</a>.
      </p>
    </div>
  </div>`;

const DELETE_TITLE = 'Delete the “Nebula” workspace?';
const DELETE_BODY = 'Its 42 API keys stop working immediately. Nothing restores them.';

// ---- Interactive — trigger opens, Esc / scrim / an answer returns focus ---
export const Playground = {
  render: () => behind(
    button({ label: 'Delete workspace', variant: 'danger' })
      .replace('<button ', '<button data-confirm-open="cf-play" '),
  ) + confirm({
    id: 'cf-play', title: DELETE_TITLE, body: DELETE_BODY,
    confirmLabel: 'Delete workspace', cancelLabel: 'Keep it',
  }),
};

// ---- States gallery — the same dialog at each shape it takes -------------
export const Danger = {
  name: 'Danger (open)',
  render: () => behind() + confirm({
    open: true, title: DELETE_TITLE, body: DELETE_BODY,
    confirmLabel: 'Delete workspace', cancelLabel: 'Keep it',
  }),
};

export const Primary = {
  name: 'Primary — not everything irreversible is destructive (open)',
  render: () => behind() + confirm({
    open: true, variant: 'primary',
    title: 'Publish the “Nebula” changelog?',
    body: 'It goes out to 1,240 subscribers straight away. You can edit it afterwards, but not unsend it.',
    confirmLabel: 'Publish now', cancelLabel: 'Not yet',
  }),
};

export const LongConsequence = {
  name: 'A consequence worth reading (open)',
  render: () => behind() + confirm({
    open: true,
    title: 'Revoke every API key in this workspace?',
    body: 'All 42 keys stop working the moment you confirm — including the two the deploy bot '
      + 'uses, which will fail its next run. Issuing replacements takes a minute each, and '
      + 'nothing here restores the old ones.',
    confirmLabel: 'Revoke all keys', cancelLabel: 'Keep them',
  }),
};

export const TitleOnly = {
  name: 'Question with no consequence to spell out (open)',
  render: () => behind() + confirm({
    open: true, title: 'Discard this draft?',
    confirmLabel: 'Discard', cancelLabel: 'Keep editing',
  }),
};

// ---- Two triggers on one page, so the ids and the trap are shown apart ---
export const TwoOnAPage = {
  name: 'Two on a page',
  render: () => {
    const trig = (id, label) => button({ label, variant: 'danger' })
      .replace('<button ', `<button data-confirm-open="${id}" `);
    return behind(
      card({
        body: `<div style="display:flex;gap:12px;flex-wrap:wrap">
          ${trig('cf-keys', 'Revoke keys')}${trig('cf-space', 'Delete workspace')}</div>`,
      }),
    )
      + confirm({
        id: 'cf-keys', title: 'Revoke every API key in this workspace?',
        body: 'All 42 keys stop working the moment you confirm.',
        confirmLabel: 'Revoke all keys', cancelLabel: 'Keep them',
      })
      + confirm({
        id: 'cf-space', title: DELETE_TITLE, body: DELETE_BODY,
        confirmLabel: 'Delete workspace', cancelLabel: 'Keep it',
      });
  },
};
