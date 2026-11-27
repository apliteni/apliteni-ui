/* A page function for page.evaluate. It doubles every --text-* token on the root, so the
 * kit's text is at 200% and its spacing is not. It returns the count of doubled tokens.
 * Limits: a size that is not a --text-* token stays as it is. */
export const DOUBLE_TEXT = () => {
  const rootStyle = document.documentElement.style;
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (!rule.style) continue;
      for (const name of rule.style) {
        if (!name.startsWith('--text-')) continue;
        const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
        if (px) rootStyle.setProperty(name, `${px * 2}px`);
      }
    }
  }
  return [...rootStyle].filter((n) => n.startsWith('--text-')).length;
};
