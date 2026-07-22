// Inline feedback widget. Select a passage inside a content area, a "Give
// feedback" pill appears, click it to open a composer (quoted excerpt + note),
// Send calls your onSend() and shows a success / error state.
//
//   document.body.insertAdjacentHTML('beforeend', feedbackWidget());
//   wireFeedback({ container: 'main', onSend: async (p) => ({ ok: true }) });
//
// The kit owns everything visual + interactive; the app owns the backend
// (onSend does the POST / issue / whatever) and any deep-link shaping. Styles
// ship in styles/feedback.css (part of the kit stylesheet). Accent-aware.
import { esc } from './index.js';

const IC_MSG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></svg>';
const IC_LINES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M4 12h10M4 19h7"/></svg>';
const IC_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CHECK = '<svg class="ui-fbck" viewBox="0 0 150 150" aria-hidden="true"><path class="ui-fbck-t" d="M40 78l24 24 46-50"/><path class="ui-fbck-m" d="M40 78l24 24 46-50"/><path class="ui-fbck-s" d="M40 78l24 24 46-50"/></svg>';

// The widget markup — append once to the page (e.g. document.body). Copy is
// static here; behaviour + the dynamic chip/quote come from wireFeedback().
export function feedbackWidget({
  label = 'Give feedback',
  placeholder = "What's off, missing, or worth adding here?",
  doneTitle = 'Feedback sent. Thank you!',
  doneBody = 'Thanks — your note is on its way.',
} = {}) {
  // The composer's Cancel/Send/Close use .ui-fbbtn, NOT the kit's button() — an
  // intentional exception. They're internal to this self-contained widget and
  // carry composer-scoped treatment button() doesn't model: a tighter footer
  // size, the inline send-spinner, and a disabled-until-valid state wired by
  // data-attributes. Promoting them to .ui-btn would regress the widget's look
  // for no consumer gain, since the app never renders these buttons directly.
  return `
<div class="ui-fbpill" data-fb-pill>${IC_MSG}${esc(label)}</div>
<div class="ui-fbscrim" data-fb-scrim></div>
<div class="ui-fbcomposer" data-fb-composer role="dialog" aria-modal="true" aria-label="Leave feedback">
  <div data-fb-form>
    <div class="ui-fbc__head">
      <span class="ui-fbc__chip">${IC_LINES}<span data-fb-chip>this page</span></span>
      <button class="ui-fbc__x" data-fb-close aria-label="Close">${IC_X}</button>
    </div>
    <div class="ui-fbc__quote"><span class="ui-fbc__qm">&#8220;</span><q data-fb-quote></q></div>
    <div class="ui-fbc__body"><textarea data-fb-note maxlength="6000" placeholder="${esc(placeholder)}" aria-label="Your note"></textarea></div>
    <div class="ui-fbc__err" data-fb-err></div>
    <div class="ui-fbc__foot">
      <button class="ui-fbbtn ghost" data-fb-cancel>Cancel</button>
      <button class="ui-fbbtn primary" data-fb-send disabled><span class="ui-fbc__send" data-fb-sendlb>Send feedback</span></button>
    </div>
  </div>
  <div class="ui-fbc__done" data-fb-done style="display:none">
    <div class="ui-fbc__ck">${CHECK}</div>
    <h4>${esc(doneTitle)}</h4>
    <p>${esc(doneBody)}</p>
    <div class="row"><button class="ui-fbbtn ghost" data-fb-done-close>Close</button></div>
  </div>
</div>`;
}

// Pure: the closest ancestor-or-preceding h2|h3 that carries an id, else the
// first such heading in `root`. Exported for testing.
export function nearestSection(node, root) {
  let el = node && node.nodeType === 3 ? node.parentNode : node;
  while (el && el !== root) {
    let p = el;
    while (p) {
      if (p.tagName && /^H[23]$/.test(p.tagName) && p.id) return p;
      p = p.previousElementSibling;
    }
    el = el.parentElement;
  }
  return root ? root.querySelector('h2[id],h3[id]') : null;
}

const defaultSection = (h) => {
  if (!h) return { label: 'this page', title: '', anchor: '' };
  const t = (h.textContent || '').replace(/\s+/g, ' ').trim();
  return { label: t, title: t, anchor: h.id || '' };
};

// Wire the widget's behaviour. Call once after the markup is mounted.
//   opts.container  selector or element to watch (default 'main')
//   opts.onSend     async (payload) => { ok, error? }   — required to submit
//   opts.minChars   minimum selection length to offer the pill (default 3)
//   opts.section    (headingEl) => { label, title, anchor }  — override formatting
// payload = { note, excerpt, anchor, sectionLabel, sectionTitle }
export function wireFeedback(opts = {}) {
  const container = typeof opts.container === 'string'
    ? document.querySelector(opts.container)
    : (opts.container || document.querySelector('main'));
  const pill = document.querySelector('[data-fb-pill]');
  const scrim = document.querySelector('[data-fb-scrim]');
  const composer = document.querySelector('[data-fb-composer]');
  if (!container || !pill || !scrim || !composer) return; // widget not mounted

  const q = (sel) => composer.querySelector(sel);
  const chip = q('[data-fb-chip]'), quoteEl = q('[data-fb-quote]'), note = q('[data-fb-note]');
  const form = q('[data-fb-form]'), done = q('[data-fb-done]');
  const sendBtn = q('[data-fb-send]'), sendLb = q('[data-fb-sendlb]'), errEl = q('[data-fb-err]');
  const minChars = opts.minChars == null ? 3 : opts.minChars;
  const sectionFn = typeof opts.section === 'function' ? opts.section : defaultSection;
  const onSend = typeof opts.onSend === 'function' ? opts.onSend : async () => ({ ok: false, error: 'No submit handler configured.' });
  let pending = null, markSpan = null;

  function showPill(range) {
    const r = range.getBoundingClientRect();
    if (!r.width && !r.height) return;
    pill.style.left = (window.scrollX + r.left + r.width / 2) + 'px';
    pill.style.top = (window.scrollY + r.top) + 'px';
    pill.classList.add('show');
  }
  const hidePill = () => pill.classList.remove('show');

  function onSelect() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return hidePill();
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return hidePill();
    const text = sel.toString().trim();
    if (text.length < minChars) return hidePill();
    const s = sectionFn(nearestSection(range.startContainer, container)) || {};
    pending = { text, anchor: s.anchor || '', label: s.label || '', title: s.title || '', range: range.cloneRange() };
    showPill(range);
  }
  container.addEventListener('mouseup', () => setTimeout(onSelect, 0));
  container.addEventListener('keyup', (e) => { if (e.shiftKey || e.key === 'Shift') setTimeout(onSelect, 0); });
  window.addEventListener('scroll', hidePill, { passive: true });

  function highlight(range) {
    try { markSpan = document.createElement('span'); markSpan.className = 'ui-fbmark'; range.surroundContents(markSpan); }
    catch (e) { markSpan = null; }
  }
  function clearHighlight() {
    if (markSpan && markSpan.parentNode) {
      const p = markSpan.parentNode;
      markSpan.replaceWith(document.createTextNode(markSpan.textContent));
      p.normalize && p.normalize();
    }
    markSpan = null;
  }

  function open() {
    if (!pending) return;
    hidePill();
    quoteEl.textContent = pending.text.length > 200 ? pending.text.slice(0, 200) + '…' : pending.text;
    chip.textContent = pending.label || 'this page';
    note.value = ''; sendBtn.disabled = true; errEl.classList.remove('show');
    form.style.display = ''; done.style.display = 'none'; sendLb.textContent = 'Send feedback';
    highlight(pending.range);
    window.getSelection().removeAllRanges();
    scrim.classList.add('show'); composer.classList.add('show');
    setTimeout(() => note.focus(), 60);
  }
  pill.addEventListener('mousedown', (e) => e.preventDefault());
  pill.addEventListener('click', open);

  function close() { composer.classList.remove('show'); scrim.classList.remove('show'); clearHighlight(); pending = null; }
  q('[data-fb-close]').addEventListener('click', close);
  q('[data-fb-cancel]').addEventListener('click', close);
  q('[data-fb-done-close]').addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && composer.classList.contains('show')) close(); });
  note.addEventListener('input', () => { sendBtn.disabled = note.value.trim().length === 0; });

  function fail(msg) {
    errEl.textContent = msg || 'Could not send just now — try again in a moment.';
    errEl.classList.add('show'); sendLb.textContent = 'Send feedback'; sendBtn.disabled = false;
  }
  sendBtn.addEventListener('click', async () => {
    if (sendBtn.disabled || !pending) return;
    errEl.classList.remove('show'); sendBtn.disabled = true; sendLb.innerHTML = '<span class="ui-fbspin"></span>Sending';
    const payload = { note: note.value.trim(), excerpt: pending.text, anchor: pending.anchor, sectionLabel: pending.label, sectionTitle: pending.title };
    try {
      const res = await onSend(payload);
      if (!res || !res.ok) { fail(res && res.error); return; }
      form.style.display = 'none'; done.style.display = ''; clearHighlight();
    } catch (e) { fail(); }
  });
}
