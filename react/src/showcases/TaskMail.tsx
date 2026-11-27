import { useEffect, useRef } from 'react';
import { KeyValueList } from '../KeyValueList';
import { digestMail, newTaskMail } from './task-mail';
import './TaskMail.css';

export type TaskMailKind = 'new' | 'digest';
export type TaskMailProps = { mail?: TaskMailKind };

/** One task mail as the reader gets it: its envelope, then its plain text and its HTML side by side. */
export function TaskMail({ mail = 'new' }: TaskMailProps) {
  const m = mail === 'new' ? newTaskMail() : digestMail();
  const frame = useRef<HTMLIFrameElement>(null);
  // The frame takes the height of the mail, so the page shows the whole mail and one scroll.
  const fit = () => {
    const el = frame.current;
    const doc = el?.contentDocument;
    if (!el || doc?.readyState !== 'complete' || !doc.body) return;
    // Measure at no height, so a wider page also shortens the frame. The frame's own edge adds to the mail.
    el.style.height = '0px';
    el.style.height = `${doc.documentElement.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  };
  useEffect(() => {
    fit();
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  });
  return (
    // The mail in the frame has its own main, so this one has a name. axe: landmark-unique.
    <main className="task-mail" aria-labelledby={`${mail}-title`}>
      <h1 id={`${mail}-title`}>{m.title}</h1>
      <KeyValueList className="task-mail__facts" rows={[
        { label: 'From', value: m.from }, { label: 'To', value: m.to },
        { label: 'Subject', value: m.subject }, { label: 'Sent', value: m.sent },
      ]} />
      <div className="task-mail__forms">
        <section aria-labelledby={`${mail}-text`}>
          <h2 id={`${mail}-text`}>Plain text</h2>
          <div className="task-mail__text">{m.text}</div>
        </section>
        <section aria-labelledby={`${mail}-html`}>
          <h2 id={`${mail}-html`}>HTML</h2>
          {/* The card gives the frame its edge in the dark theme. A light card bleeds into the page gutter,
              which a frame must not do, so the frame takes no outer space. The gate's allow-list
              in react/src/story-css.test.ts holds this placement. */}
          <iframe ref={frame} className="ui-card ui-focusable task-mail__frame" style={{ margin: 0, padding: 0 }} title={`${m.title}, HTML form`} srcDoc={m.html} onLoad={fit} />
        </section>
      </div>
    </main>
  );
}
