// Button counts follow the public React API; icons follow the exported catalogue.
// Only literal unions are supported. A changed type shape must fail the build.
export function buttonOptions(source, property) {
  const union = source.match(new RegExp(`^\\s*${property}\\?:\\s*([^;]+);`, 'm'))?.[1];
  if (!union || !/^'[^']+'(?:\s*\|\s*'[^']+')*$/.test(union.trim())) {
    throw new Error(`Cannot count ButtonProps.${property}: expected a literal union`);
  }
  const options = [...union.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (new Set(options).size !== options.length) throw new Error(`Duplicate ButtonProps.${property}`);
  return options;
}

export function catalogueCopy(template, { icons, buttonSource }) {
  if (!icons.length || new Set(icons).size !== icons.length) throw new Error('Invalid icon catalogue');
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const variants = buttonOptions(buttonSource, 'variant').length;
  const sizes = buttonOptions(buttonSource, 'size').length;
  const word = (n) => words[n] ?? String(n);
  const facts = {
    ICON_COUNT: String(icons.length),
    BUTTON_VARIANTS: word(variants).replace(/^./, (c) => c.toUpperCase()),
    BUTTON_SIZES: word(sizes),
  };
  for (const [key, value] of Object.entries(facts)) {
    const marker = `{{${key}}}`;
    if (template.split(marker).length !== 2) throw new Error(`Expected one ${marker}`);
    template = template.replace(marker, value);
  }
  return template;
}
