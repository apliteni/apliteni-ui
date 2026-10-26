/** Watch tab content and width without changing the current route. Call the result on removal. */
export declare function observeNavFit(nav: HTMLElement): () => void;
export declare function esc(value: unknown): string;
/** The URL boundary every component sends a destination through. */
export declare function safeUrl(value: unknown, fallback?: string): string;
/** Scroll a tab row so its `aria-current` link is inside the viewport. */
export declare function revealCurrentNav(nav: HTMLElement): void;
/** Scroll a tab row so the link a focus event landed on clears the row's edge. */
export declare function revealFocusedNav(nav: HTMLElement, target: EventTarget | null): void;

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

export declare const AVATAR_HUES: 8;
/** Which of the eight person hues a key gets: FNV-1a 32 bit over its UTF-8 bytes, modulo 8. */
export declare function avatarHue(key: unknown): number;
/** The first letter of the first word and of the last word, upper-cased; '' for no name. */
export declare function avatarInitials(name: unknown): string;

export declare const calloutIcons: Record<'neutral' | 'info' | 'success' | 'warn' | 'danger', string>;

/** The kit's own match, asked rather than re-implemented by <Dropdown>. */
export declare function dropdownMatch(label: unknown, query: unknown): boolean;
export declare function dropdownFiltering(query: unknown): boolean;
/** How tall a floating panel may be: the room between its anchor and the
 *  viewport edge, less `gap` and `inset`. `min` is a floor that spends `inset`,
 *  down to nothing, rather than room past the edge, which does not exist. */
export declare function dropdownAvail(opts: {
  anchorTop: number; anchorBottom: number; viewport: number;
  gap: number; inset: number; min: number; up?: boolean;
}): number;
/** The kit's menu floor, the width `.ui-dropdown__panel` writes. */
export declare const DD_MENU_FLOOR: number;
/** The `.ui-filter-bar` an anchored menu's fit is measured inside, or `null`.
 *  A chip's menu, and a menu that asks for a width with `--ui-filter-panel-ask` on
 *  its own panel: the slide is that trigger's offset along the row, so those two
 *  are the subjects and a panel anchored to the row itself sizes itself.
 *  why: docs/components.md */
export declare function filterPanelRow(dd: Element | null | undefined): Element | null;
/** Where an anchored filter menu can sit: the room from the edge it is anchored
 *  at to the far side of its row once slid, how far it had to slide, the width it
 *  reached for, and whether it is anchored at its inline end. `null` for a
 *  dropdown `filterPanelRow()` does not answer for. The width reached for is
 *  `floor`, else the panel's own `--ui-filter-panel-ask`, else `DD_MENU_FLOOR`.
 *  why: docs/components.md */
export declare function filterPanelFit(
  dd: Element | null | undefined,
  floor?: number,
): { room: number; shift: number; floor: number; end: boolean } | null;
/** How wide a panel may be and how far along the inline axis it has to move to
 *  stay inside the view it is laid out in, measured from where the sheet has put
 *  it: `shift` is 0 when the edge `align` asked for already fits, and `max` is the
 *  view less `edge` at each side — write it before measuring again, because capping
 *  a panel changes the width a shift is calculated from. `at` gives the box a
 *  caller is about to write instead, which is how the portal's placement asks.
 *  `null` when there is nothing to measure, or inside a `.ui-filter-bar`, which
 *  bounds its own panels. why: docs/components.md#the-dropdown-panel */
export declare function dropdownViewportFit(
  panel: Element | null | undefined,
  at?: { left: number; width: number },
): { shift: number; left: number; width: number; view: number; edge: number; max: number } | null;
/** How tall a panel may be: the room between its trigger (inside `dd`) and the
 *  viewport edge, from the same dropdownAvail() dropdownViewportFit's `max`
 *  shares its calculation with. `null` when there is nothing to measure.
 *  why: docs/components.md#the-dropdown-panel */
export declare function dropdownHeightFit(
  dd: Element | null | undefined,
  panel: Element | null | undefined,
): number | null;
/** Stop an open panel's height where it cuts a row through the middle, so the list
 *  reads as going on: the smaller of its cap and its measured room. Call it with the
 *  panel laid out and its room written.
 *  why: docs/components.md#the-dropdown-panel */
export declare function dropdownSnap(
  dd: Element | null | undefined,
  panel: Element | null | undefined,
): void;
/** Lift an open panel out of a Modal or Drawer body too short to hold its field and
 *  the panel's floor, so it opens over the body the way a portalled panel does, or put a
 *  lifted one back. Returns whether the panel is lifted.
 *  why: docs/components.md#the-dropdown-panel */
export declare function dropdownLift(
  dd: Element | null | undefined,
  panel: Element | null | undefined,
): boolean;
/** Scroll the body an open panel sits in the least distance that shows the whole
 *  panel and its field's label, with the room under the panel kept. Returns the distance scrolled, 0 when
 *  nothing moved. why: docs/components.md#the-dropdown-panel */
export declare function dropdownReveal(
  dd: Element | null | undefined,
  panel: Element | null | undefined,
): number;
/** Give an open panel its box, and take the box away from a shut one once its fade is
 *  over, so a shut panel adds no scroll room. Returns a function that cancels a
 *  collapse still waiting. why: docs/components.md#the-dropdown-panel */
export declare function dropdownRest(
  dd: Element | null | undefined,
  panel: Element | null | undefined,
  open: boolean,
  wait?: number,
): () => void;

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

/** The smallest band a series is drawn in, as a share of its own reach. */
export declare const CHART_FLOOR: number;
export type ChartScaleOptions = { ticks?: number; zero?: boolean; floor?: number; nice?: boolean };
export type ChartScale = { min: number; max: number; step: number; ticks: number[] };
export declare function chartScale(values: Iterable<number>, options?: ChartScaleOptions): ChartScale;
export type BridgeStepInput = { label: string; value?: number; kind?: 'total' | 'change' };
export type BridgeBar<S> = S & { kind: 'total' | 'change'; value: number; from: number; to: number };
export declare function bridgeWalk<S extends BridgeStepInput>(steps: Iterable<S>): BridgeBar<S>[];
export type ChartBox = { left: number; right: number; top: number; bottom: number };
export type PointTargetLimits = {
  floor: number; min?: number; box: ChartBox;
  column: [number, number]; apart?: Iterable<number>;
};
export type ChartTarget = { x: number; y: number; w: number; h: number };
export declare function pointTarget(
  point: { x: number; y: number }, limits: PointTargetLimits,
): ChartTarget;
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

/** The custom properties one accent swatch button carries. */
export declare function accentSwatchStyle(accent: string): Record<string, string>;

/** Token class from styles/code.css, or null for the text between tokens. */
export type CodeTokenClass = 'c' | 'f' | 'k' | 's' | 'u';
export type CodeLanguage = 'shell' | 'json' | 'ts';
export declare const codeLanguages: readonly CodeLanguage[];
export declare function codeTokens(raw: string, lang?: CodeLanguage): { cls: CodeTokenClass | null; text: string }[];
export declare function hlCode(raw: string, lang?: CodeLanguage): string;
export declare function hlShell(raw: string): string;

export declare function themeIcon(theme: string): string;

// A tuple, so React can derive its Accent union from it.
export declare const ACCENTS: readonly ['default', 'phoenix', 'ocean', 'emerald'];
export declare const ACCOUNT_NAV: { id: string; icon: string; label: string }[];

export declare function nearestSection(node: Node | null, root?: Element | null): Element | null;
