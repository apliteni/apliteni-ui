import type { CSSProperties, ReactNode } from 'react';

/** The full-bleed page every foundation specimen sits on: the vanilla `pad()`. */
export const Pad = ({ children }: { children: ReactNode }) => <div style={{ padding: 40, minHeight: '100vh' }}>{children}</div>;

/** The specimen page title and lead the vanilla foundations write by hand. The gaps
 *  vary a little from page to page, so a page passes its own. */
export const Title = ({ children, gap = 6 }: { children: ReactNode; gap?: number }) =>
  <h1 style={{ font: '700 30px/1.1 var(--font-display)', color: 'var(--strong)', letterSpacing: '-.02em', marginBottom: gap }}>{children}</h1>;

export const PageHead = ({ title, lead, titleGap = 6, leadStyle }: {
  title: ReactNode; lead: ReactNode; titleGap?: number; leadStyle?: CSSProperties;
}) => <>
  <Title gap={titleGap}>{title}</Title>
  <p style={{ color: 'var(--dim)', marginBottom: 30, ...leadStyle }}>{lead}</p>
</>;

/** Static specimen prose, kept as the HTML the vanilla page wrote, so no sentence is
 *  retyped. Only literal text from this repository goes through it. */
export const Prose = ({ as: Tag = 'p', html, style }: { as?: 'p' | 'div' | 'span'; html: string; style?: CSSProperties }) =>
  <Tag style={style} dangerouslySetInnerHTML={{ __html: html }} />;
