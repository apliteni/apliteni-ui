import { useEffect, useId, useRef, useState } from 'react';
import { Drawer } from './Drawer';
import { Icon } from './primitives/Icon';
import './FeedbackWidget.css';

export type FeedbackPayload = { page: string; section: string; excerpt: string; note: string };
export type FeedbackWidgetProps = {
  onSend: (feedback: FeedbackPayload) => void | Promise<void>;
};

type Context = Omit<FeedbackPayload, 'note'>;

export function FeedbackWidget({ onSend }: FeedbackWidgetProps) {
  const pill = useRef<HTMLButtonElement>(null);
  const captured = useRef<Context | null>(null);
  const request = useRef(0);
  const sending = useRef(false);
  const sentClose = useRef<HTMLButtonElement>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'ready' | 'sending' | 'sent' | 'error'>('ready');
  const id = useId();

  useEffect(() => () => { request.current++; }, []);
  useEffect(() => { if (state === 'sent') sentClose.current?.focus(); }, [state]);

  useEffect(() => {
    if (context) return;
    const button = pill.current!;
    const place = () => {
      button.style.bottom = 'calc(16px + env(safe-area-inset-bottom, 0px))';
      let rect = button.getBoundingClientRect();
      const obstacles = [...document.querySelectorAll('nav, [role="navigation"]')];
      if (document.activeElement && document.activeElement !== button) obstacles.push(document.activeElement);
      for (const element of obstacles) {
        const box = element.getBoundingClientRect();
        const isFocused = element === document.activeElement;
        const position = getComputedStyle(element).position;
        if (!isFocused && position !== 'fixed' && position !== 'sticky') continue;
        if (box.width && box.height && rect.right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom) {
          button.style.bottom = `${window.innerHeight - box.top + 12}px`;
          rect = button.getBoundingClientRect();
        }
      }
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('focusin', place);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    document.querySelectorAll('nav, [role="navigation"]').forEach(nav => observer?.observe(nav));
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('focusin', place);
      observer?.disconnect();
    };
  }, [context]);

  function capture(): Context {
    const top = pill.current!.getBoundingClientRect().top;
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .filter(heading => !heading.closest('[role="dialog"], [hidden], [inert]') && heading.getBoundingClientRect().top <= top);
    headings.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    return {
      page: window.location.pathname,
      section: headings[headings.length - 1]?.textContent?.trim() ?? '',
      excerpt: (window.getSelection()?.toString() ?? '').trim().slice(0, 1000),
    };
  }

  function open() {
    setContext(captured.current ?? capture());
    captured.current = null;
    setNote('');
    setState('ready');
  }

  function close() {
    request.current++;
    sending.current = false;
    setContext(null);
  }

  async function send() {
    if (!context || !note.trim() || sending.current) return;
    sending.current = true;
    const current = ++request.current;
    setState('sending');
    try {
      await onSend({ ...context, note: note.trim() });
      if (current === request.current) setState('sent');
    } catch {
      if (current === request.current) setState('error');
    } finally {
      if (current === request.current) sending.current = false;
    }
  }

  return <>
    <button ref={pill} type="button" className="ui-fbpill show rx-feedback-pill" aria-haspopup="dialog"
      onPointerDown={() => { captured.current = capture(); }} onPointerCancel={() => { captured.current = null; }}
      onKeyDown={() => { captured.current = null; }} onClick={open}>
      <Icon name="chat" />Feedback
    </button>
    <Drawer open={context !== null} title="Report a problem or an idea" size="sm" onClose={close}
      footer={state !== 'sent' && <>
        <button type="button" className="ui-fbbtn ghost" onClick={close}>Cancel</button>
        <button type="submit" form={id} className="ui-fbbtn primary" disabled={!note.trim()}
          aria-busy={state === 'sending' || undefined} aria-disabled={state === 'sending' || undefined}>
          <span className="ui-fbc__send">{state === 'sending' && <span className="ui-fbspin" aria-hidden="true" />}Send feedback</span>
        </button>
      </>}>
      {state === 'sent' ? <div className="ui-fbc__done" role="status">
        <p>Feedback sent. Thank you!</p>
        <div className="row"><button ref={sentClose} type="button" className="ui-fbbtn ghost" onClick={close}>Close</button></div>
      </div> : <form id={id} className="rx-feedback-form" onSubmit={event => { event.preventDefault(); void send(); }}>
        <dl className="ui-drawer__rows">
          <div className="ui-drawer__row"><dt>Page</dt><dd>{context?.page}</dd></div>
          <div className="ui-drawer__row"><dt>Section</dt><dd>{context?.section || 'This page'}</dd></div>
          {context?.excerpt && <div className="ui-drawer__row"><dt>Excerpt</dt>
            <dd className="ui-fbc__quote"><span className="ui-fbc__qm" aria-hidden="true">“</span><q>{context.excerpt}</q></dd>
          </div>}
        </dl>
        <div className="ui-field">
          <label className="ui-field__label" htmlFor={`${id}-note`}>Your note</label>
          <textarea className="ui-textarea" id={`${id}-note`} maxLength={6000} value={note}
            readOnly={state === 'sending'} aria-describedby={`${id}-privacy`}
            placeholder="What's wrong or what would help?" onChange={event => setNote(event.target.value)} />
          <p className="ui-field__hint" id={`${id}-privacy`}>Only the page, section, selected text and your note are sent.</p>
        </div>
        {state === 'error' && <p className="ui-fbc__err show" role="alert">Could not send feedback. Try again.</p>}
      </form>}
    </Drawer>
  </>;
}
