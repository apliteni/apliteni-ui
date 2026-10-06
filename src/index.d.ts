export declare function esc(value: unknown): string;
/** The URL boundary every factory and React component sends a destination through. */
export declare function safeUrl(value: unknown, fallback?: string): string;
/** Scroll a tab row so its `aria-current` link is inside the viewport. */
export declare function revealCurrentNav(nav: HTMLElement): void;
/** Scroll a tab row so the link a focus event landed on clears the row's edge. */
export declare function revealFocusedNav(nav: HTMLElement, target: EventTarget | null): void;
export declare function field(opts?: Record<string, unknown>): string;
export declare function input(opts?: Record<string, unknown>): string;
export declare function textarea(opts?: Record<string, unknown>): string;
export declare function select(opts?: Record<string, unknown>): string;
export declare function numericValue(opts?: Record<string, unknown>): string;
export declare function deltaValue(opts?: Record<string, unknown>): string;
export declare function filterBar(opts?: Record<string, unknown>): string;
export declare function initFilterBar(host: Element, opts?: Record<string, unknown>): { update: (opts: Record<string, unknown>) => void; destroy: () => void };
export declare function filterChipText(filter?: { label?: string; value?: string }): string;
export declare function filterChipName(filter?: { label?: string; value?: string }): string;
export declare function filterChipUnset(filter?: { value?: string }): boolean;
export declare function nextFocusStop(host: Element | null | undefined): HTMLElement | null;
export declare function focusNextStop(host: Element | null | undefined): HTMLElement | null;
/** The chip's items with the chip's own `value` marked `selected`, so the line the chip
 *  prints and the row its menu marks cannot disagree. A row is matched by `value`, or by
 *  `label` where it has none. Every row's flag is written, so a chip that is unset or
 *  whose value is in no row marks nothing rather than leaving a `selected` the caller
 *  set standing. The caller's array and objects are not written to. */
export declare function filterChipItems<T>(filter?: { value?: string; items?: T[] }): T[];
export declare function segmentedNextIndex(key: string, index: number, length: number): number | null;
export declare function icon(name: string, className?: string): string;
export declare function snippet(opts?: Record<string, unknown>): string;
export declare function button(opts?: Record<string, unknown>): string;
export declare function badge(label: string, variant?: string): string;
export declare const calloutIcons: Record<'neutral' | 'info' | 'success' | 'warn' | 'danger', string>;
export declare function callout(opts?: Record<string, unknown>): string;
export declare function card(opts?: Record<string, unknown>): string;
export declare function pagination(opts?: Record<string, unknown>): string;
export declare function drawerSection(opts?: Record<string, unknown>): string;
export declare function drawer(opts?: Record<string, unknown>): string;
export declare function dropdown(opts?: Record<string, unknown>): string;
export declare function wireDropdown(root?: Document | Element): void;
/** The kit's own match, asked rather than re-implemented by <Dropdown>. */
export declare function dropdownMatch(label: unknown, query: unknown): boolean;
export declare function dropdownFiltering(query: unknown): boolean;
/** The kit's menu floor, the width `.ui-dropdown__panel` writes. */
export declare const DD_MENU_FLOOR: number;
/** Where a filter chip's open menu can sit: the room from the edge it is
 *  anchored at to the far side of its row once slid, how far it had to slide,
 *  the width it reached for, and whether it is anchored at its inline end.
 *  `null` unless the dropdown is inside a `.ui-filter-bar__chip`: the slide is a
 *  chip's offset along its row, so a panel anchored to the row itself is not this
 *  function's subject and sizes itself. why: docs/components.md */
export declare function filterPanelFit(
  dd: Element | null | undefined,
  floor?: number,
): { room: number; shift: number; floor: number; end: boolean } | null;
export declare function backLink(opts?: Record<string, unknown>): string;
export declare function statBand(opts?: Record<string, unknown>): string;
export declare function commandPalette(opts?: Record<string, unknown>): string;
export declare function rankGroups<G>(groups: readonly G[], query: string): G[];
export declare function rankCommands<I>(items: readonly I[], query: string): I[];
export declare function scoreCommand(item: Record<string, unknown>, query: string): number;
export declare function paletteHotkey(platform?: string): string;
export declare const PAGE_SIZES: number[];
export declare const DEFAULT_PAGE_SIZE: number;
export type NumericValueOptions = { value?: string | number | null; unit?: string; missing?: string };
export type DeltaValueOptions = { value?: string | null; tone?: 'success' | 'danger' | 'neutral'; basisId?: string; missing?: string };
export declare function formatNumericValue(options?: NumericValueOptions): { text: string; unit: string; missing: string | undefined };
export declare function formatDeltaValue(options?: DeltaValueOptions): { text: string; className: string; basisId: string | undefined };
export declare const SCORE: Record<'exact' | 'prefix' | 'wordStart' | 'contains' | 'keyword' | 'description' | 'subsequence', number>;
export declare const iconNames: string[];
export declare const iconCategories: { name: string; names: string[] }[];
export declare const iconOnlyAllowed: Record<string, string>;
export declare const iconOnlyNames: Record<string, string[]>;
export declare const iconMeanings: Record<string, string>;
export declare const sun: string;
export declare const moon: string;
export declare function prism(prefix?: string, size?: number): string;
export declare function seedling(prefix?: string, size?: number): string;
export declare function brand(options?: { p?: string; word?: string; size?: number; href?: string }): string;
export declare function illo(name: string): string;
export * from './motion.js';
export declare const illoNames: string[];

// The custom properties one accent swatch button carries. ACCENTS is declared
// with the topbar wiring that re-exports it.
export declare function accentSwatchStyle(accent: string): Record<string, string>;

// Vanilla factories accept their existing option bags and return HTML.
export declare function accentPicker(opts?: Record<string, unknown>): string;
export declare function accountMenu(opts?: Record<string, unknown>): string;
export declare function appShell(opts?: Record<string, unknown>): string;
export declare function breadcrumbs(opts?: Record<string, unknown>): string;
export declare function busyRegion(opts?: Record<string, unknown>): string;
export declare function checkbox(opts?: Record<string, unknown>): string;
export declare function confirm(opts?: Record<string, unknown>): string;
export declare function deniedState(opts?: Record<string, unknown>): string;
export declare function emptyState(opts?: Record<string, unknown>): string;
export declare function feedbackWidget(opts?: Record<string, unknown>): string;
export declare function footer(opts?: Record<string, unknown>): string;
export declare function nav(opts?: Record<string, unknown>): string;
export declare function navTabs(opts?: Record<string, unknown>): string;
export declare function rowIdentity(opts?: Record<string, unknown>): string;
export declare function segmented(opts?: Record<string, unknown>): string;
export declare function sidebarNav(opts?: Record<string, unknown>): string;
export declare function skeleton(opts?: Record<string, unknown>): string;
export declare function skeletonTable(opts?: Record<string, unknown>): string;
export declare function success(opts?: Record<string, unknown>): string;
export declare function successPanel(opts?: Record<string, unknown>): string;
export declare function switchToggle(opts?: Record<string, unknown>): string;
export declare function tabs(opts?: Record<string, unknown>): string;
export declare function toast(opts?: Record<string, unknown>): string;
export declare function tooltip(opts?: Record<string, unknown>): string;
export declare function topbar(opts?: Record<string, unknown>): string;
export declare function commandPaletteList(groups?: readonly Record<string, unknown>[], opts?: { uid?: string; from?: number }): string;
export declare function deckTextSwitch(active?: string): string;
export declare function hlShell(raw: string): string;
/** Token class from styles/code.css, or null for the text between tokens. */
export type CodeTokenClass = 'c' | 'f' | 'k' | 's' | 'u';
export type CodeLanguage = 'shell' | 'json' | 'ts';
export declare const codeLanguages: readonly CodeLanguage[];
export declare function codeTokens(raw: string, lang?: CodeLanguage): { cls: CodeTokenClass | null; text: string }[];
export declare function hlCode(raw: string, lang?: CodeLanguage): string;
export declare function pill(label: string, variant?: string): string;
export declare function statusDot(live?: boolean): string;
export declare function successCheck(variant?: 'line' | 'circled'): string;
export declare function themeIcon(theme: string): string;
export declare function themeName(theme: string): string;
export declare function themeToggle(theme?: string): string;
export declare function versionSwitcher(versions?: { label: string; meta?: string; badge?: string }[], activeIdx?: number): string;

// A tuple, so React can derive its Accent union from it.
export declare const ACCENTS: readonly ['default', 'phoenix', 'ocean', 'emerald'];
export declare const ACCOUNT_NAV: { id: string; icon: string; label: string }[];
export declare const RAIL_COOKIE: 'apliteni-ui-rail';
export declare const STAT_TONES: string[];
export declare const STAT_VARIANTS: string[];

export declare function applyAccent(name: string, root?: HTMLElement): void;
export declare function applyTheme(theme: string, root?: HTMLElement): void;
export declare function railCollapsed(cookies?: string): boolean | null;
export declare function closeCommandPalette(root: Element | null): void;
export declare function closeConfirm(root: Element | null): void;
export declare function closeDrawer(root: Element | null): void;
export declare function openCommandPalette(root: Element | null, returnFocusTo?: HTMLElement | null): void;
export declare function openConfirm(root: Element | null, returnFocusTo?: HTMLElement | null): void;
export declare function openDrawer(root: Element | null, returnFocusTo?: HTMLElement | null): void;
export declare function setPaletteResults(root: HTMLElement, groups: readonly Record<string, unknown>[]): void;
export declare function hideTooltip(host: HTMLElement): void;
export declare function showTooltip(host: HTMLElement, mark: Element): void;
export declare function initRowIdentity(root?: Document | Element): void;
export declare function initSegmented(root?: Document | Element): () => void;
export declare function initTabs(root?: Document | Element): void;
export declare function wireCommandPalette(root?: Document | Element): void;
export declare function wireConfirm(root?: Document | Element): void;
export declare function wireDrawer(root?: Document | Element): void;
export declare function wireFeedback(opts?: Record<string, unknown>): void;
export declare function wireNav(root?: Document | Element): void;
export declare function wireShell(root?: Document | Element, opts?: { persist?: boolean }): void;
export declare function wireTooltip(root?: Document | Element): void;
export declare function wireTopbar(root?: Document | Element): void;
export declare function wireSuccess(root: Element, opts?: { onDone?: () => void }): () => void;
export declare function wirePagination(root?: Document | Element | string | null, opts?: { onPage?: (page: number) => void; onPageSize?: (size: number) => void }): () => void;
export declare function nearestSection(node: Node | null, root?: Element | null): Element | null;
export declare function dismissToast(element: HTMLElement): void;
export declare function wireToastStack(container: Element | string | null): Element | null;
export declare function pushToast(container: Element | string | null, opts?: Record<string, unknown>): Element | null;
export declare function setBusy(root: Element | string | null, opts?: { busy?: boolean; message?: string; body?: string }): Element | null;
export declare function setButtonBusy(element: HTMLElement, opts?: { busy?: boolean }): void;
export declare function setPagerStatus(root: Element | string | null, text: string): Element | null;
