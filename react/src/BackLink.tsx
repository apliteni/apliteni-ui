import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { Icon } from './primitives/Icon';

// The React face of the kit's backLink(). Stateless, so it is here for one reason
// only: a consumer rendering the factory's string through dangerouslySetInnerHTML
// puts a wrapper element between `.ui-app__main` and `.ui-back`, and the shell's
// `.ui-app__main > .ui-back` rule stops matching. This renders the anchor itself,
// and BackLink.test.tsx compares it against the factory rule for rule.
// why: docs/specification.md#the-back-link

// "Back" names a direction rather than a place. It is what a caller who names no
// destination gets, and the one label that is not spelled out as "Back to …".
const BARE = 'Back';

// A `javascript:` address is the history walk this component replaces, arriving
// through the one parameter it has. Before a browser reads the scheme it strips
// C0 controls and spaces from the front and removes every tab, LF and CR wherever
// they sit, so "java\tscript:" is still javascript:. Read the same way here as in
// src/components/back.js (WHATWG URL Standard, basic URL parser).
const SCRIPTED = /^javascript:/i;
const LEADING = /^[\u0000-\u0020]+/;
const TAB_OR_NEWLINE = /[\t\n\r]/g;

// A label that already says "Back to Invoices" names the place after those words, or
// the link would be read as "Back to Back to Invoices".
const SAID = /^back\s+to(?:\s+|$)/i;

const text = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

export type BackLinkOwnProps = {
  /** The address. No address, or a `javascript:` one, and nothing is rendered. */
  href?: string;
  /** The destination, spelled the way the sidebar or the trail spells it. */
  label?: string;
  /** The element the anchor is drawn as — a router `<Link>`, say. Default `'a'`. */
  as?: ElementType;
  className?: string;
};

export type BackLinkProps<T extends ElementType = 'a'> =
  BackLinkOwnProps & Omit<ComponentPropsWithoutRef<T>, keyof BackLinkOwnProps>;

/**
 * The link a page under another page puts above its title.
 *
 * The arrow says "back" on screen and is aria-hidden, so the link's accessible name
 * says it in words: "Back to Invoices". Given `as`, the props this component does not
 * read are passed through, which is how a router link gets its own `to`.
 */
export function BackLink<T extends ElementType = 'a'>({
  href, label, as, className, ...rest
}: BackLinkProps<T>) {
  const to = text(href);
  if (!to || SCRIPTED.test(to.replace(LEADING, '').replace(TAB_OR_NEWLINE, ''))) return null;
  const name = text(label).replace(SAID, '');
  const bare = !name || name.toLowerCase() === BARE.toLowerCase();
  const Tag = (as ?? 'a') as ElementType;
  return (
    <Tag
      className={['ui-back', className].filter(Boolean).join(' ')}
      href={to}
      aria-label={bare ? undefined : `${BARE} to ${name}`}
      {...rest}
    >
      <Icon name="chevronLeft" />
      <span className="ui-back__label">{bare ? BARE : name}</span>
    </Tag>
  );
}
