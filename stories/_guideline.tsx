// The shape of a rule: AGENTS.md#the-guidelines-collection
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
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

/** Trusted markup from this repository, such as a drawn glyph, with no box of its own.
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

/* A kit Chart with its own readout open on one mark, as a pointer leaves it. The
 * page sends the mark the move a pointer sends, so the Chart places the readout
 * itself. When the pointer, the focus or a resize closes it, or it scrolls into
 * view, it opens again on that mark. Escape still dismisses it. `above` keeps it above the mark where the
 * Chart would flip it, which only a don't shows. */
export const OpenReadout = ({ mark, above = false, children }: { mark: string; above?: boolean; children: ReactNode }) => {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = box.current;
    if (!root) return;
    let frame = 0;
    const hit = () => [...root.querySelectorAll('[data-mark]')].find(el => el.getAttribute('data-mark') === mark);
    // The Chart places a readout only when it opens, so a resize closes it first:
    // a move over the plot outside any mark, then the move onto the mark.
    const open = () => {
      root.querySelector('.ui-chart__svg')?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      reveal();
      frame = requestAnimationFrame(() => {
        hit()?.firstElementChild?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        if (above) keepAbove();
      });
    };
    // A plot that scrolls brings the pointed bar to its centre, as a key step does,
    // so the readout opens over its own bar.
    const reveal = () => {
      const scroll = root.querySelector<HTMLElement>('.ui-chart__scroll');
      const anchor = [...root.querySelectorAll('[data-anchor]')].find(el => el.getAttribute('data-anchor') === mark);
      if (!scroll || !anchor || scroll.scrollWidth <= scroll.clientWidth) return;
      const bar = anchor.getBoundingClientRect();
      const view = scroll.getBoundingClientRect();
      scroll.scrollLeft += (bar.left + bar.right) / 2 - (view.left + view.right) / 2;
    };
    // The Chart's anchor measured as its placement measures it, without the flip.
    const keepAbove = () => {
      const tip = root.querySelector<HTMLElement>('.ui-tip');
      const host = tip?.closest<HTMLElement>('.ui-tip-host');
      const anchor = [...root.querySelectorAll('[data-anchor]')].find(el => el.getAttribute('data-anchor') === mark);
      if (!tip || !host || !anchor || !tip.classList.contains('is-below')) return;
      tip.classList.remove('is-below');
      const y = anchor.getBoundingClientRect().top - host.getBoundingClientRect().top - host.clientTop + host.scrollTop;
      tip.style.setProperty('--ui-tip-y', `${y}px`);
    };
    const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(open); };
    const out = (event: Event) => {
      const next = (event as MouseEvent | FocusEvent).relatedTarget as Node | null;
      if (!next || !root.contains(next)) later();
    };
    const tipWatch = new MutationObserver(() => { if (above) keepAbove(); });
    const sizeWatch = typeof ResizeObserver === 'function' ? new ResizeObserver(later) : null;
    sizeWatch?.observe(root.firstElementChild ?? root);
    // The room it measures includes the viewport, so one placed off screen opens again in view.
    const viewWatch = typeof IntersectionObserver === 'function' ? new IntersectionObserver(later, { threshold: [0, 1] }) : null;
    viewWatch?.observe(root.firstElementChild ?? root);
    const tip = root.querySelector('.ui-tip');
    if (tip) tipWatch.observe(tip, { attributes: true, attributeFilter: ['class'] });
    root.addEventListener('mouseout', out);
    root.addEventListener('focusout', out);
    window.addEventListener('resize', later);
    later();
    void document.fonts?.ready.then(later);
    return () => {
      cancelAnimationFrame(frame);
      tipWatch.disconnect();
      sizeWatch?.disconnect();
      viewWatch?.disconnect();
      root.removeEventListener('mouseout', out);
      root.removeEventListener('focusout', out);
      window.removeEventListener('resize', later);
    };
  }, [mark, above]);
  return <div ref={box} style={{ display: 'contents' }}>{children}</div>;
};

/* A narrow viewport inside the page, for a rule that only a phone shows: a frame
 * with the page's own sheets and theme, so the kit's phone rules apply inside it.
 * The page's own sheet stays out, as it stays out of a real phone. */
export const PhoneFrame = ({ width = 200, label, children }: { width?: number; label: string; children: ReactNode }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [sealed, setSealed] = useState(false);
  useLayoutEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) { setSealed(true); return; }
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
  if (sealed) return <SealedPhone width={width} label={label}>{children}</SealedPhone>;
  return <iframe ref={frame} className="gl-phone" title={label} tabIndex={-1} style={{ width }}>{body && createPortal(children, body)}</iframe>;
};

/* A sandboxed host, such as a review viewer, keeps a frame's document out of reach. The
 * picture is then written into the frame as static markup, and the frame posts its height. */
const SealedPhone = ({ width, label, children }: { width: number; label: string; children: ReactNode }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState(0);
  useLayoutEffect(() => {
    const watch = new MutationObserver(() => setTheme(n => n + 1));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-accent'] });
    const fit = (e: MessageEvent) => {
      if (frame.current && e.source === frame.current.contentWindow && typeof e.data?.glPhone === 'number') frame.current.style.height = `${e.data.glPhone}px`;
    };
    window.addEventListener('message', fit);
    return () => { watch.disconnect(); window.removeEventListener('message', fit); };
  }, []);
  const root = document.documentElement;
  const attrs = ['data-theme', 'data-accent'].map(name => root.hasAttribute(name) ? ` ${name}="${root.getAttribute(name)}"` : '').join('');
  const sheets = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map(sheet => sheet.outerHTML).join('');
  const html = `<!doctype html><html${attrs}><head>${sheets}</head><body style="margin:0; --ui-table-height: none"><div>${renderToStaticMarkup(<>{children}</>)}</div>`
    + '<script>const box = document.body.firstChild; new ResizeObserver(() => parent.postMessage({ glPhone: box.offsetHeight }, "*")).observe(box);</script></body></html>';
  return <iframe ref={frame} key={theme} className="gl-phone" title={label} tabIndex={-1} style={{ width }} srcDoc={html} />;
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
      {rule.dontCaption && <Cell kind="dont" caption={rule.dontCaption}>{rule.dont?.()}</Cell>}
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
