// A link from one story to another, for the showcases that are two screens of one
// portal — and what makes following one arrive somewhere.
//
// Two frames can be looking at a story. Inside the Storybook manager the reader is
// looking at the preview iframe, so `./iframe.html?id=…` replaces that frame with a bare
// preview: the sidebar, the toolbar and the theme the manager is holding all go with it.
// So a click is handed to Storybook's own navigation instead — SELECT_STORY on the preview
// channel, which the manager answers by selecting the story the way its sidebar does. Its
// globals are untouched, so the theme survives, and `scrollTo` rides along into the
// manager's own fragment, which is where the row this link meant is read back from.
//
// The href stays a real URL, because the preview is also opened on its own — by a deep
// link into the static build, and by every capture script — and there the browser's own
// navigation is the right one. It is also the href the gates read. What the click adds
// there is the globals, which a bare preview carries in its URL and nowhere else.
import { getChannel } from 'storybook/preview-api';
import { SELECT_STORY, STORY_RENDERED } from 'storybook/internal/core-events';

/** `./` resolves against /iframe.html, so this is the preview's own URL in dev and in a
 *  static build alike. `row` names an element in the story being opened. */
export const previewHref = (id, row, globals) =>
  `./iframe.html?id=${id}${globals ? `&globals=${globals}` : ''}${row ? `#${row}` : ''}`;

/** The story and the row a link names, read back off its own href. Anything that is not
 *  a preview link reads as null, which is how a click on one is left alone. */
export const linkTarget = (href) => {
  const [path, row = ''] = String(href ?? '').split('#');
  if (!path.includes('iframe.html')) return null;
  const id = new URLSearchParams(path.split('?')[1] ?? '').get('id');
  return id ? { id, row } : null;
};

/** The globals the frame is holding, spelled the way a preview URL spells them. The
 *  theme is read from the choice rather than the resolved value: `auto` is a value the
 *  global can hold, and resolving it here would freeze it. */
export const globalsParam = (root) => {
  const theme = root?.getAttribute?.('data-theme-choice') || root?.getAttribute?.('data-theme');
  const accent = root?.getAttribute?.('data-accent');
  return [theme && `theme:${theme}`, accent && `accent:${accent}`].filter(Boolean).join(';');
};

/** The row a reference asked for. While the preview is framed the manager carries it, in
 *  the fragment `scrollTo` put there; on its own the preview carries its own.
 *
 *  The manager appends its query AFTER the fragment it navigates to — measured as
 *  `?path=/story/apps-finance-report--default#payout-po-1159&globals=theme:light&globals=theme:light`,
 *  globals twice over — so the row is the part of the fragment before that query starts. */
export const askedRow = (win) => {
  let hash = '';
  try { if (win.parent !== win) hash = win.parent.location.hash; } catch { /* a ref's manager is not ours to read */ }
  return (hash || win.location.hash).replace(/^#/, '').split(/[&?]/)[0];
};

/** The mark a landed row wears. */
export const LANDED = 'is-target';

/** Open a story at its top, and marked nowhere: what a link that names no row asks for.
 *  The manager keeps one preview frame and swaps stories inside it, so without this a
 *  reader who followed "All payouts" from the dashboard's exceptions card arrived
 *  part-way down the ledger, at whatever offset they had left behind. */
export const landOnTop = (win) => {
  for (const was of win.document.querySelectorAll(`.${LANDED}`)) was.classList.remove(LANDED);
  win.scrollTo?.(0, 0);
};

/**
 * Land the reader on a row: mark it, give it the keyboard so a screen reader follows,
 * and bring it into view. Returns the row, or null when the story draws no such row —
 * a reference to a row that is gone must not silently mark another.
 */
export const landOnRow = (doc, rowId) => {
  for (const was of doc.querySelectorAll(`.${LANDED}`)) was.classList.remove(LANDED);
  const row = rowId ? doc.getElementById(rowId) : null;
  if (!row) return null;
  row.classList.add(LANDED);
  row.tabIndex = -1;
  row.focus?.({ preventScroll: true });
  // Centred, and never sideways: the ledger scrolls inside its card, and a row brought
  // into view must not take the columns off the reader's left edge with it.
  row.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  return row;
};

const channelOrNull = () => { try { return getChannel(); } catch { return null; } };

/**
 * Do it again once the page has stopped moving under the reader. Two things move it after
 * a story renders, and both were measured carrying an arrival off a 320 and a 390 view on
 * the static build: the browser's own fragment handling, which settles the scroll position
 * at the end of loading, and the display face, which changes the height of every row with
 * it. Both land within a moment of the click, which is why this re-scrolls rather than
 * giving up the reader's place.
 */
const afterSettling = (win, again) => {
  if (win.document.readyState !== 'complete') win.addEventListener('load', again, { once: true });
  win.document.fonts?.ready.then(again);
};

// One entry per frame: the listeners belong to a frame, and so does `marked` — the
// arrival already drawn, which is what stops a re-render of the same story, a theme
// toggle for one, scrolling the reader back a second time.
const frames = new WeakMap();

/**
 * Wire every preview link in a frame, once. Idempotent, because the preview decorator
 * runs per story and the listeners outlive it.
 */
export const wireStoryLinks = ({ win = window, channel = channelOrNull() } = {}) => {
  if (frames.has(win)) return;
  const state = { marked: '', toTop: false };
  frames.set(win, state);

  win.document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href]');
    const target = link && linkTarget(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    state.marked = '';
    state.toTop = !target.row;
    const globals = globalsParam(win.document.documentElement);
    if (win.parent === win || !channel) {
      // A bare preview: the browser's own navigation, with the globals put back on it.
      win.location.assign(previewHref(target.id, target.row, globals));
      return;
    }
    channel.emit(SELECT_STORY, { storyId: target.id, scrollTo: target.row || undefined });
    // Already on the story the link names — the manager re-renders nothing, so the row
    // is landed on here. On any other story the render below does it.
    if (landOnRow(win.document, target.row)) state.marked = target.row;
  });

  channel?.on(STORY_RENDERED, () => {
    if (state.toTop) {
      state.toTop = false;
      landOnTop(win);
      afterSettling(win, () => win.scrollTo?.(0, 0));
      return;
    }
    const row = askedRow(win);
    if (!row || row === state.marked) return;
    if (!landOnRow(win.document, row)) return;
    state.marked = row;
    afterSettling(win, () => landOnRow(win.document, row));
  });
};
