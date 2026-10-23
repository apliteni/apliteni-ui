import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { prism, safeUrl } from '@apliteni/apliteni-ui';

export type FooterLink = { label: string; href?: string; target?: string };
export type FooterColumn = { title?: string; links: FooterLink[] };
export type FooterSocial = { label: string; href?: string; icon?: 'github' | 'x' | 'linkedin' | 'mail' };

export type FooterProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /** `full` is the marketing footer, `slim` a single legal row, `app` the in-product row. */
  variant?: 'full' | 'slim' | 'app';
  /** Product word beside the mark. Default `Strategy`. */
  word?: string;
  brandHref?: string;
  /** Replaces the lockup. `false` hides the whole brand block: lockup, tagline and social links. Full variant only. */
  brand?: ReactNode | false;
  /** Short line under the brand. Full variant only. */
  tagline?: string;
  /** Link columns. Side by side above the phone step, stacked on a phone. Full variant only. */
  columns?: FooterColumn[];
  /** Contents of the link navigation. Takes the place of `columns`. Full variant only. */
  links?: ReactNode;
  social?: FooterSocial[];
  legal?: ReactNode;
  legalLinks?: FooterLink[];
  /** Slot for `<AccentPicker>` and `<ThemeToggle>`. */
  switcher?: ReactNode;
};

// LinkedIn: Font Awesome Free brands/linkedin.svg, CC BY 4.0.
const SOCIAL_GLYPHS: Record<NonNullable<FooterSocial['icon']>, string> = {
  github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/>',
  x: '<path d="M4 3h4.5l4 5.5L17.5 3H21l-6.5 8.5L21 21h-4.5l-4.3-5.9L7 21H3.5l6.8-8.9z"/>',
  linkedin: '<path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m3 7 9 6 9-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
};

const escapeText = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function Legal({ legal, legalLinks, switcher }: Pick<FooterProps, 'legal' | 'legalLinks' | 'switcher'>) {
  return <div className="ui-footer__bar">
    <span className="ui-footer__legal">{legal}</span>
    {legalLinks && legalLinks.length > 0 && <nav className="ui-footer__legal-links" aria-label="Legal">
      {legalLinks.map(({ label, href: to }) => <a key={label} href={safeUrl(to ?? '#')}>{label}</a>)}
    </nav>}
    {switcher ? <div className="ui-footer__switcher">{switcher}</div> : null}
  </div>;
}

export function Footer({
  variant = 'full', word = 'Strategy', brandHref = '/', brand, tagline, columns = [], links, social = [],
  legal = `© ${new Date().getFullYear()} Apliteni`, legalLinks = [], switcher, className, ...rest
}: FooterProps) {
  const uid = useId();
  const cls = ['ui-footer', `ui-footer--${variant}`, className].filter(Boolean).join(' ');
  const bar = <Legal legal={legal} legalLinks={legalLinks} switcher={switcher} />;
  if (variant !== 'full') {
    return <footer {...rest} className={cls} role="contentinfo"><div className="ui-footer__in">{bar}</div></footer>;
  }
  const mark = prism(uid.replace(/:/g, ''), 22);
  const lockup = brand ?? <a className="brand" href={safeUrl(brandHref)} aria-label={`Apliteni ${word}`}
    dangerouslySetInnerHTML={{ __html: `${mark}<span>${escapeText(word)}</span>` }} />;
  return <footer {...rest} className={cls} role="contentinfo"><div className="ui-footer__in">
    <div className="ui-footer__top">
      {brand !== false && <div className="ui-footer__brand">
        {lockup}
        {tagline && <p className="ui-footer__tagline">{tagline}</p>}
        {social.length > 0 && <div className="ui-footer__socials">
          {social.map(({ label, href: to, icon = 'github' }) => {
            const markup = SOCIAL_GLYPHS[icon];
            const fill = icon === 'mail' ? 'none' : 'currentColor';
            const viewBox = icon === 'linkedin' ? '0 0 448 512' : '0 0 24 24';
            return <a key={label} className="ui-footer__social" href={safeUrl(to ?? '#')} aria-label={label}>
              <svg viewBox={viewBox} fill={fill} aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />
            </a>;
          })}
        </div>}
      </div>}
      {(links || columns.length > 0) && <nav className="ui-footer__nav" aria-label="Footer">
        {links ?? columns.map(({ title, links: columnLinks }, i) => <div key={title ?? i} className="ui-footer__col">
          {title && <h2 className="ui-footer__col-title">{title}</h2>}
          <ul className="ui-footer__links">
            {columnLinks.map(({ label, href: to, target }) => <li key={label}>
              <a href={safeUrl(to ?? '#')} target={target} rel={target ? 'noreferrer' : undefined}>{label}</a>
            </li>)}
          </ul>
        </div>)}
      </nav>}
    </div>
    {bar}
  </div></footer>;
}
