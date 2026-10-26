// apliteni-ui — public entry.
// Styles ship separately: `import 'apliteni-ui/css'`.
export * from './assets/icons.js';
export * from './assets/brand.js';
export * from './assets/illustrations.js';
export * from './motion.js';
export { esc, safeUrl } from './html.js';

export { ACCENTS, accentSwatchStyle } from './logic/accents.js';
export { ACCOUNT_NAV } from './logic/account-nav.js';
export { AVATAR_HUES, avatarHue, avatarInitials } from './logic/avatar.js';
export { calloutIcons } from './logic/callout.js';
export { CHART_FLOOR, chartScale, bridgeWalk, pointTarget } from './logic/chart.js';
export { codeLanguages, codeTokens, hlCode, hlShell } from './logic/code.js';
export { SCORE, rankGroups, rankCommands, scoreCommand, paletteHotkey } from './logic/command-palette.js';
export { dropdownMatch, dropdownFiltering, dropdownAvail } from './logic/dropdown.js';
export {
  DD_MENU_FLOOR, filterPanelRow, filterPanelFit, dropdownHeightFit, dropdownLift,
  dropdownReveal, dropdownRest, dropdownSnap, dropdownViewportFit,
} from './logic/dropdown-placement.js';
export { nearestSection } from './logic/feedback.js';
export { filterChipText, filterChipName, filterChipUnset, filterChipItems, nextFocusStop, focusNextStop } from './logic/filter-bar.js';
export { observeNavFit, revealCurrentNav, revealFocusedNav } from './logic/nav.js';
export { PAGE_SIZES, DEFAULT_PAGE_SIZE } from './logic/pagination.js';
export { segmentedNextIndex } from './logic/segmented.js';
export { formatNumericValue, formatDeltaValue } from './logic/table-values.js';
export { themeIcon } from './logic/theme.js';
