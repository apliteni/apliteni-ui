# Removed and merged rules (#768)

The noise review removed or merged 29 rules. The count went from 145 to 116.

| Page | Rule | Action |
|---|---|---|
| accessibility-floor | target-size | Removed |
| accessibility-floor | disabled-legibility | Removed |
| accessibility-floor | touch-field-size | Removed |
| accessibility-floor | status-label | Removed |
| accessibility-floor | keyboard-first | Removed |
| accessibility-floor | body-contrast | Merged into labels-and-titles / text-ink |
| text-length | short-controls | Removed |
| text-length | useful-captions | Removed |
| text-length | useful-callouts | Removed |
| text-length | remove-filler | Removed |
| text-length | useful-introductions | Merged into the-page / lede |
| labels-and-titles | text-ink-exceptions | Merged into labels-and-titles / text-ink |
| labels-and-titles | title-is-heading | Merged into the-page / outline |
| colour-and-theming | both-themes | Removed |
| iconography | icon-only | Merged into button-labels / wordless-earns-it |
| iconography | provenance | Removed |
| component-choice | paired-actions | Merged into the-page / one-primary |
| pagination | ends-disable | Removed |
| pagination | one-page | Removed |
| pagination | page-turn | Merged into dense-tables / states |
| command-palette | keyboard | Removed |
| command-palette | say-it | Removed |
| state-set | focus-visible | Removed |
| state-set | busy | Removed |
| motion | reduced | Removed |
| density-and-accents | purposeful-accent | Merged into the-page / one-primary |
| file-drop | button-path | Merged into file-drop / one-row |
| account-and-settings | one-action | Removed |
| microcopy | never-nameless | Removed |

The text-length page lost all its rules. The page stays, with its title only.

## Prototypes

Each `<page>.html` file is one guideline page. It is self-contained and has no network requests.
A URL hash opens its rule, for example `the-page.html#lede`.
Each rule shows with no error at 390 and 1280 px, in light and dark, under the sandbox policy.
