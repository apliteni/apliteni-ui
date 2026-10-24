/* The rail fold, and where the reader's choice is kept.
 * A cookie rather than localStorage, because a server can read one and paint the
 * rail at the width the reader left it. why: docs/components.md#the-page-shell */

export const RAIL_COOKIE = 'apliteni-ui-rail';
const RAIL_VALUE = new RegExp(`(?:^|;\\s*)${RAIL_COOKIE}=(collapsed|expanded)(?:;|$)`);

// A sandboxed frame throws on document.cookie; it has no stored choice.
const documentCookies = () => {
  try { return typeof document === 'undefined' ? '' : document.cookie; } catch { return ''; }
};

/** The reader's stored choice: true, false, or null when there is none. With no
 *  argument it reads `document.cookie`; handed a Cookie header, only that. */
export function railCollapsed(cookies: string | null | undefined = documentCookies()): boolean | null {
  const match = RAIL_VALUE.exec(String(cookies ?? ''));
  return match ? match[1] === 'collapsed' : null;
}

/** Keep the reader's choice for a year, for every page of the site. */
export function storeRailCollapsed(collapsed: boolean) {
  try {
    document.cookie = `${RAIL_COOKIE}=${collapsed ? 'collapsed' : 'expanded'}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch { /* A sandboxed frame has no cookie store. */ }
}
