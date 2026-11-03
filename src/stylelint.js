// stylelint config for app styles. Import it as `@apliteni/apliteni-ui/stylelint`.
// A rule is off only with a comment that names an approved exception:
// `/* stylelint-disable <rule> -- <reason> */`.

const colourMessage = 'Use a semantic colour token from @apliteni/apliteni-ui/tokens.';

export default {
  reportDescriptionlessDisables: true,
  rules: {
    'color-no-hex': [true, { message: colourMessage }],
    'color-named': ['never', { message: colourMessage }],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
      { message: 'Use a semantic colour token or a color-mix() of tokens from @apliteni/apliteni-ui/tokens.' },
    ],
    'declaration-property-unit-disallowed-list': [
      {
        '/^margin/': ['px', 'rem', 'em'],
        '/^padding/': ['px', 'rem', 'em'],
        '/gap/': ['px', 'rem', 'em'],
        '/^inset/': ['px', 'rem', 'em'],
        '/^(top|right|bottom|left)$/': ['px', 'rem', 'em'],
      },
      { message: 'Use a spacing token such as var(--space-4) from @apliteni/apliteni-ui/tokens.' },
    ],
    'selector-disallowed-list': [
      [/\.ui-/],
      { message: 'Do not override a kit class. Use the kit component, or file the missing part.' },
    ],
  },
};
