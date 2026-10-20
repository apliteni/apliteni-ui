import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { nearestSection } from '@apliteni/apliteni-ui';
import { Button } from './primitives/Button';
import { useDialog, usePresence } from './dialog';

export type FeedbackPayload = { note: string; excerpt: string; anchor: string; sectionLabel: string; sectionTitle: string };
export type FeedbackResult = { ok: boolean; error?: string };
export type FeedbackSection = { label?: string; title?: string; anchor?: string };

export type FeedbackProps = {
  /** The element whose text a reader may select. Pass a ref to it. */
  container: RefObject<HTMLElement | null>;
  /** Files the note. Resolve `{ ok: true }` when it is sent, or `{ ok: false, error }` to keep the form open with the error in place. */
  onSend: (payload: FeedbackPayload) => Promise<FeedbackResult>;
  /** Shortest selection that offers the pill. */
  minChars?: number;
  /** Shapes the chip and the payload from the heading above the selection. */
  section?: (heading: Element | null) => FeedbackSection;
  label?: string;
  placeholder?: string;
  /** The one line shown once the note is sent. */
  sentMessage?: string;
};

const defaultSection = (h: Element | null): FeedbackSection => {
  if (!h) return { label: 'this page', title: '', anchor: '' };
  const t = (h.textContent || '').replace(/\s+/g, ' ').trim();
  return { label: t, title: t, anchor: h.id || '' };
};

type Pending = { text: string; anchor: string; label: string; title: string; range: Range };

// Same markup and classes as the vanilla feedbackWidget(), with the kit's Button for
// Cancel, Send and Close. The quoted passage is highlighted in the page while the
// composer is open, so keep the container's content from re-rendering until it closes.
export function Feedback({
  container, onSend, minChars = 3, section = defaultSection, label = 'Give feedback',
  placeholder = "What's off, missing, or worth adding here?", sentMessage = 'Thanks, your note is sent.',
}: FeedbackProps) {
  const [pill, setPill] = useState<{ left: number; top: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'ready' | 'sending' | 'sent'>('ready');
  const [error, setError] = useState('');
  const pending = useRef<Pending | null>(null);
  const [view, setView] = useState({ chip: 'this page', quote: '' });
  const mark = useRef<{ span: HTMLSpanElement; start: Text | null; end: Text | null } | null>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const doneClose = useRef<HTMLButtonElement>(null);
  const opts = useRef({ minChars, section });
  opts.current = { minChars, section };

  useEffect(() => {
    // The container can mount after this component, so it is read when an event arrives.
    function onSelect() {
      const el = container.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.isCollapsed || !sel.rangeCount) { setPill(null); return; }
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) { setPill(null); return; }
      const text = sel.toString().trim();
      if (text.length < opts.current.minChars) { setPill(null); return; }
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      const s = opts.current.section(nearestSection(range.startContainer, el)) || {};
      pending.current = { text, anchor: s.anchor || '', label: s.label || '', title: s.title || '', range: range.cloneRange() };
      setPill({ left: window.scrollX + rect.left + rect.width / 2, top: window.scrollY + rect.top });
    }
    const later = () => { setTimeout(onSelect, 0); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.shiftKey || e.key === 'Shift') later(); };
    const hide = () => setPill(null);
    document.addEventListener('mouseup', later);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('mouseup', later);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('scroll', hide);
    };
  }, [container]);

  // Unwraps the highlight and puts back the text the wrap split off, in the nodes the
  // page already had. normalize() would merge and remove text nodes that React holds.
  function clearMark() {
    const m = mark.current;
    mark.current = null;
    const span = m?.span;
    if (!m || !span?.parentNode) return;
    const kids = Array.from(span.childNodes);
    const first = kids[0];
    const last = kids[kids.length - 1];
    if (m.start && m.start === m.end) {
      const tail = span.nextSibling;
      if (kids.length === 1 && first instanceof Text && span.previousSibling === m.start && tail instanceof Text) {
        m.start.data += first.data + tail.data;
        tail.remove();
        span.remove();
        return;
      }
    } else {
      if (m.start && first instanceof Text && span.previousSibling === m.start) {
        m.start.data += first.data;
        first.remove();
      }
      if (m.end && last instanceof Text && last !== first && span.nextSibling === m.end) {
        m.end.data = last.data + m.end.data;
        last.remove();
      }
    }
    span.replaceWith(...Array.from(span.childNodes));
  }
  useEffect(() => clearMark, []);

  const { mounted, shown } = usePresence(open, root, panel);
  function close() {
    setOpen(false);
    clearMark();
  }
  useDialog(shown, { root, panel, body, initialFocus: noteRef }, close);

  function start() {
    const p = pending.current;
    if (!p) return;
    // A keyboard open leaves focus on the pill, which hides now. Hand it to the container
    // first, so the dialog gives it back to something the reader can see.
    if (document.activeElement === pillRef.current) {
      const el = container.current;
      if (el) {
        // tabindex="-1" keeps the container out of the Tab order and lets the dialog return focus to it.
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      }
    }
    setPill(null);
    setView({ chip: p.label || 'this page', quote: p.text.length > 200 ? `${p.text.slice(0, 200)}…` : p.text });
    setNote(''); setError(''); setState('ready');
    try {
      const span = document.createElement('span');
      span.className = 'ui-fbmark';
      const start = p.range.startContainer instanceof Text ? p.range.startContainer : null;
      const end = p.range.endContainer instanceof Text ? p.range.endContainer : null;
      p.range.surroundContents(span);
      mark.current = { span, start, end };
    } catch { mark.current = null; }
    window.getSelection()?.removeAllRanges();
    setOpen(true);
  }

  async function send() {
    const p = pending.current;
    if (state !== 'ready' || !p || !note.trim()) return;
    setError(''); setState('sending');
    try {
      const res = await onSend({ note: note.trim(), excerpt: p.text, anchor: p.anchor, sectionLabel: p.label, sectionTitle: p.title });
      if (!res || !res.ok) throw new Error(res?.error);
      clearMark();
      setState('sent');
      setTimeout(() => doneClose.current?.focus(), 0);
    } catch (e) {
      setError((e instanceof Error && e.message) || 'Could not send just now — try again in a moment.');
      setState('ready');
    }
  }

  return createPortal(<>
    <button ref={pillRef} type="button" className={pill ? 'ui-fbpill show' : 'ui-fbpill'} tabIndex={pill ? 0 : -1} aria-hidden={pill ? undefined : true}
      style={pill ?? undefined} onMouseDown={(e) => e.preventDefault()} onClick={start}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></svg>
      {label}
    </button>
    {mounted && <div ref={root}>
      <div className={shown ? 'ui-fbscrim show' : 'ui-fbscrim'} onClick={close} />
      <div ref={panel} className={shown ? 'ui-fbcomposer show' : 'ui-fbcomposer'} role="dialog" aria-modal="true" aria-label="Leave feedback" tabIndex={-1}>
        {state === 'sent' ? (
          <div className="ui-fbc__done" ref={body}>
            <p role="status">{sentMessage}</p>
            <div className="row"><Button ref={doneClose} variant="ghost" onClick={close}>Close</Button></div>
          </div>
        ) : (
          <div ref={body}>
            <div className="ui-fbc__head">
              <span className="ui-fbc__chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path d="M4 5h16M4 12h10M4 19h7" /></svg>
                <span>{view.chip}</span>
              </span>
              <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" style={{ marginLeft: 'auto' }} onClick={close} />
            </div>
            <div className="ui-fbc__quote"><span className="ui-fbc__qm">&#8220;</span><q>{view.quote}</q></div>
            <div className="ui-fbc__body">
              <textarea ref={noteRef} maxLength={6000} value={note} placeholder={placeholder} aria-label="Your note"
                onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <div className="ui-fbc__err show is-entering" role="alert">{error}</div>}
            <div className="ui-fbc__foot">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button variant="primary" busy={state === 'sending'} disabled={!note.trim()} onClick={send}>Send feedback</Button>
            </div>
          </div>
        )}
      </div>
    </div>}
  </>, document.body);
}
