// The shape of a rule: AGENTS.md#the-guidelines-collection
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '../react/src/primitives/Badge';
import { Button } from '../react/src/primitives/Button';
import { Icon } from '../react/src/primitives/Icon';
import '../react/src/Modal.css';
import { icon } from '@apliteni/apliteni-ui';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { GROUND_CSS, PAGE_CSS, SPEC_CSS, mono } from './guidelines/_layout.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { withSpecimens } from './guidelines/_markdown.js';

/* The React guidelinePage(): the same sheets, the same ground and the same rule
 * block, with React kit parts as the specimens. The prose still comes from
 * guidelines/*.md through loadGuideline(), and mono() still marks it up, so the
 * text and its code marks cannot drift from the vanilla page while both exist. */

export type GuidelineRule = {
  id: string; imperative: string; instruction?: string; why?: string; except?: string;
  doCaption?: string; dontCaption?: string; unmet?: { issue: number; note: string };
};
export type Specimen = { id: string; do?: () => ReactNode; dont?: () => ReactNode };

/** Specimens are pictures of a state: a control that would change it does nothing. */
export const noop = () => {};

/** Trusted markup from this repository, such as a drawn sparkline, with no box of its own.
 *  `block` holds block markup, which a span must not. */
export const Raw = ({ html, block = false }: { html: string; block?: boolean }) => block
  ? <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />
  : <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;

/* A notice drawn in place, as a picture. The React Toast only raises live notices
 * in its corner, and a specimen sits in the page flow and must not announce
 * itself, so a page draws one with the kit's classes. `glyph` is free so a
 * don't can show a notice the kit would not draw. */
// The glyph each tone draws, as Toast.tsx draws it; react/src/guidelines.test.tsx holds the two in step.
export const TONE_GLYPH = { success: 'circleCheck', danger: 'circleX', warn: 'circleAlert', info: 'info', neutral: 'bolt' };
export const NoticePicture = ({ tone = 'neutral', glyph, title, text, action, close = true }: {
  tone?: keyof typeof TONE_GLYPH; glyph?: string; title: string; text?: string; action?: string; close?: boolean;
}) => <div className={`ui-toast ui-toast--${tone} ui-toast--soft`} role="status" aria-live="polite">
  <span className="ui-toast__icon"><Raw html={icon(glyph ?? TONE_GLYPH[tone])} /></span>
  <div className="ui-toast__body">
    <div className="ui-toast__title">{title}</div>
    {text && <div className="ui-toast__text">{text}</div>}
  </div>
  {action && <button type="button" className="ui-toast__action">{action}</button>}
  {close && <button type="button" className="ui-toast__close" aria-label="Dismiss"><Raw html={icon('x')} /></button>}
</div>;

/* A confirm drawn in place, as a picture of the React Confirm: the Modal's head,
 * body and foot with the same parts. The live one is a portal over a scrim that
 * owns the page, so a page with three of them draws them instead. */
export const ConfirmPicture = ({ title, body, cancelLabel, confirmLabel }: {
  title: string; body?: string; cancelLabel: string; confirmLabel: string;
}) => <div className="rx-modal" role="group" aria-label={title}>
  <div className="rx-modal__head">
    <h2 className="rx-modal__title">{title}</h2>
    <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="Close" />
  </div>
  {body && <div className="rx-modal__body"><p>{body}</p></div>}
  <div className="rx-modal__foot">
    <Button variant="ghost">{cancelLabel}</Button>
    <Button variant="danger">{confirmLabel}</Button>
  </div>
</div>;

/* A drawer drawn in place, as a picture of the React Drawer: the same markup,
 * open, with no portal, no trap and no inert page, inside a frame the page sizes. */
export const DrawerPicture = ({ title, footer, children }: { title: string; footer?: ReactNode; children?: ReactNode }) =>
  <div className="ui-drawer ui-drawer--right ui-drawer--md is-open">
    <div className="ui-drawer__scrim" />
    <aside className="ui-drawer__panel" role="group" aria-label={title}>
      <header className="ui-drawer__header">
        <h2 className="ui-drawer__title">{title}</h2>
        <button type="button" className="ui-drawer__close" aria-label="Close"><Icon name="x" /></button>
      </header>
      <div className="ui-drawer__body">{children}</div>
      {footer && <footer className="ui-drawer__footer">{footer}</footer>}
    </aside>
  </div>;

/* A search field with words already in it, as a reader leaves it. An open
 * Dropdown starts every open from the whole list and takes the focus, so the words
 * are typed after the first paint and the focus is let go again: a page of rules
 * must not open on a field half-way down it. */
export const Typed = ({ query, children }: { query: string; children: ReactNode }) => {
  const box = useRef<HTMLDivElement>(null);
  // Read while rendering, before the Dropdown's own effect moves the focus and the page with it.
  const before = useRef(typeof window === 'undefined' ? [0, 0] : [window.scrollX, window.scrollY]);
  useLayoutEffect(() => {
    const field = box.current?.querySelector<HTMLInputElement>('input[type="search"], input');
    if (!field) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, query);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.blur();
    const [x, y] = before.current;
    if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
  }, [query]);
  return <div ref={box} style={{ display: 'contents' }}>{children}</div>;
};

/* An open readout, as a picture: the React Tooltip's own parts, held open at the
 * anchor its wiring would have measured, so a page can show one without a pointer. */
export const TipPicture = ({ label = '', value = '', detail = '', placement = 'top', x, y }: {
  label?: string; value?: string; detail?: string; placement?: 'top' | 'bottom'; x: number; y: number;
}) => {
  const tip = useRef<HTMLDivElement>(null);
  // The wiring slides a readout along the mark to stay inside the view. The picture
  // slides it inside its cell, and keeps its side: a side is what some pairs show.
  useLayoutEffect(() => {
    const el = tip.current;
    const cell = el?.closest('.gc-cell');
    if (!el || !cell) return;
    const slide = () => {
      el.style.setProperty('--ui-tip-shift', '0px');
      const r = el.getBoundingClientRect();
      const c = cell.getBoundingClientRect();
      const shift = r.left < c.left ? c.left - r.left : r.right > c.right ? c.right - r.right : 0;
      el.style.setProperty('--ui-tip-shift', `${shift}px`);
    };
    slide();
    void document.fonts?.ready.then(slide);
    const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(slide) : null;
    watch?.observe(cell);
    return () => watch?.disconnect();
  }, []);
  return <div ref={tip} className={`ui-tip${placement === 'bottom' ? ' is-below' : ''} is-open`} role="tooltip"
  style={{ ['--ui-tip-x' as string]: `${x}px`, ['--ui-tip-y' as string]: `${y}px` }}>
  <span className="ui-tip__label" hidden={!label}>{label}</span>
  <span className="ui-tip__value" hidden={!value}>{value}</span>
  <span className="ui-tip__detail" hidden={!detail}>{detail}</span>
</div>;
};

/* A narrow viewport inside the page, for a rule that only a phone shows: a frame
 * with the page's own sheets and theme, so the kit's phone rules apply inside it.
 * The page's own sheet stays out, as it stays out of a real phone. */
export const PhoneFrame = ({ width = 200, label, children }: { width?: number; label: string; children: ReactNode }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    // The frame's height follows its content, so a table bounded by the viewport height would shrink with it.
    doc.open(); doc.write('<!doctype html><html><head></head><body style="margin:0; --ui-table-height: none"></body></html>'); doc.close();
    for (const sheet of document.querySelectorAll('style, link[rel="stylesheet"]')) doc.head.append(sheet.cloneNode(true));
    const theme = () => { for (const name of ['data-theme', 'data-accent']) {
      const value = document.documentElement.getAttribute(name);
      if (value === null) doc.documentElement.removeAttribute(name); else doc.documentElement.setAttribute(name, value);
    } };
    theme();
    const watch = new MutationObserver(theme);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
    const box = doc.createElement('div');
    doc.body.append(box);
    // The frame's own observer: one from this window does not see a box in another document.
    const view = doc.defaultView as (Window & typeof globalThis) | null;
    const fit = typeof view?.ResizeObserver === 'function'
      ? new view.ResizeObserver(() => { if (frame.current) frame.current.style.height = `${box.offsetHeight}px`; }) : null;
    fit?.observe(box);
    setBody(box);
    return () => { watch.disconnect(); fit?.disconnect(); };
  }, []);
  return <iframe ref={frame} className="gl-phone" title={label} tabIndex={-1} style={{ width }}>{body && createPortal(children, body)}</iframe>;
};

/* The pictures join the page flow at the specimen width. */
const PICTURE_CSS = `<style>
  .gl-stage--confirm .rx-modal { width: auto; transform: none; max-height: none; }
  .gl-phone { display: block; flex: none; border: 1px solid var(--border); border-radius: var(--radius-lg); }
  /* What :focus-visible paints, at rest: a picture cannot hold a live focus. */
  .gl-focus { outline: var(--ring); outline-offset: var(--ring-offset); }
  .gl-strip { display: flex; flex-wrap: wrap; gap: var(--space-4); margin: 0; padding: 0; list-style: none; }
  /* A frame and a said picture shrink to the cell: a panel's min-content is wider than a phone cell. */
  .gl-strip__frame { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-2); align-content: start; min-width: 0; }
  .gl-strip__step { margin: 0; font-size: var(--text-sm); }
  .gl-said { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
  .gl-said__lines { display: grid; gap: var(--space-1); font-size: var(--text-sm); }
  .gl-said__lines > p { margin: 0; }
  .gl-said__label { /* muted-ink: chrome — names what the lines below are */ color: var(--muted); }
</style>`;

/** A gesture or a key press in steps, one frame each and named under it: a rule
 *  about a sequence cannot be shown in one still picture. */
export const FrameStrip = ({ frames }: { frames: { step: string; picture: ReactNode }[] }) => <ol className="gl-strip">
  {frames.map(({ step, picture }) => <li key={step} className="gl-strip__frame">{picture}<p className="gl-strip__step">{step}</p></li>)}
</ol>;

/** What a screen reader says after one press, drawn under the picture of the press:
 *  speech has no picture of its own. `.gl-focus` draws the focus ring at rest. */
export const SaidPicture = ({ lines, children }: { lines: string[]; children: ReactNode }) => <div className="gl-said">
  {children}
  <div className="gl-said__lines">
    <p className="gl-said__label">Screen reader says</p>
    {lines.map(line => <p key={line} className="gl-said__line">“{line}”</p>)}
  </div>
</div>;

/** A trusted style sheet from this repository, written once as the vanilla page wrote it. */
export const Sheet = ({ css }: { css: string }) =>
  <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: css }} />;

const Mono = ({ as: Tag, className, text }: { as: 'h1' | 'h2' | 'p' | 'div' | 'span'; className?: string; text: string }) =>
  <Tag className={className} dangerouslySetInnerHTML={{ __html: mono(text) }} />;

/** The reading surface every guideline page stands on. `css` comes after the
 *  ground's own sheet, where the vanilla page put the page sheets. */
export const Ground = ({ css = '', children }: { css?: string; children: ReactNode }) => <>
  <Sheet css={GROUND_CSS + css} />
  <div className="gl-page">{children}</div>
</>;

// data-specimen names which half a cell is, so a gate that measures specimens
// can leave the don'ts out: stories/drawer-rules.test.js reads it.
const Cell = ({ kind, caption, children }: { kind: 'do' | 'dont'; caption: string; children: ReactNode }) =>
  <div className="gc-cell" data-specimen={kind}>
    <div>{kind === 'do' ? <Badge variant="live">Do</Badge> : <Badge variant="danger">Don’t</Badge>}</div>
    {children}
    <Mono as="div" className="gc-cell__cap" text={caption} />
  </div>;

// data-rule names the rule a section draws, so a gate can find one by its id.
const Rule = ({ rule }: { rule: GuidelineRule & Specimen }) =>
  <section className="gc-rule" data-rule={rule.id}>
    <Mono as="h2" className="gc-imperative" text={rule.imperative} />
    {rule.instruction && <Mono as="p" className="gc-why" text={rule.instruction} />}
    {rule.why && <Mono as="p" className="gc-why" text={rule.why} />}
    {rule.doCaption && <div className="gc-pair">
      <Cell kind="do" caption={rule.doCaption}>{rule.do?.()}</Cell>
      <Cell kind="dont" caption={rule.dontCaption ?? ''}>{rule.dont?.()}</Cell>
    </div>}
    {rule.unmet && <p className="gc-unmet">
      <span className="gc-except__label">{`Gap #${rule.unmet.issue}`}</span>
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: mono(rule.unmet.note) }} />
    </p>}
    {rule.except && <p className="gc-except">
      <span className="gc-except__label">Except</span>
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: mono(rule.except) }} />
    </p>}
  </section>;

/** A guideline page: its Markdown content, one specimen pair per rule in the same order, and its sheet. */
export function GuidelinePage({ content, specimens, css = '', pageClass }: {
  content: { title: string; rules: GuidelineRule[] }; specimens: Specimen[]; css?: string;
  /** One more class on the page column, for a page sheet that changes the page itself. */
  pageClass?: string;
}) {
  const rules: (GuidelineRule & Specimen)[] = withSpecimens(content.rules, specimens);
  return <>
    <Sheet css={SPEC_CSS + PICTURE_CSS} />
    <Ground css={PAGE_CSS + css}>
      <div className={['gl gc', pageClass].filter(Boolean).join(' ')}>
        <Mono as="h1" text={content.title} />
        {rules.map(rule => <Rule key={rule.id} rule={rule} />)}
      </div>
    </Ground>
  </>;
}
