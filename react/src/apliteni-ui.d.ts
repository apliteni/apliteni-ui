declare module '@apliteni/apliteni-ui' {
  export function numericValue(opts?: Record<string, unknown>): string;
  export function deltaValue(opts?: Record<string, unknown>): string;
  export function filterBar(opts?: Record<string, unknown>): string;
  export function initFilterBar(host: Element, opts?: Record<string, unknown>): { update: (opts: Record<string, unknown>) => void; destroy: () => void };
  export function segmentedNextIndex(key: string, index: number, length: number): number | null;
  export function icon(name: string): string;
  export function snippet(opts?: Record<string, unknown>): string;
  export function button(opts?: Record<string, unknown>): string;
  export function badge(label: string, variant?: string): string;
  export function card(opts?: Record<string, unknown>): string;
  export function pagination(opts?: Record<string, unknown>): string;
  export function drawerSection(opts?: Record<string, unknown>): string;
  export function drawer(opts?: Record<string, unknown>): string;
  export function dropdown(opts?: Record<string, unknown>): string;
  export function wireDropdown(root?: Document | Element): void;
  /** The kit's own match, asked rather than re-implemented by <Dropdown>. */
  export function dropdownMatch(label: unknown, query: unknown): boolean;
  export function dropdownFiltering(query: unknown): boolean;
  export function backLink(opts?: Record<string, unknown>): string;
  export function statBand(opts?: Record<string, unknown>): string;
  export function commandPalette(opts?: Record<string, unknown>): string;
  export function rankGroups<G>(groups: readonly G[], query: string): G[];
  export function rankCommands<I>(items: readonly I[], query: string): I[];
  export function scoreCommand(item: Record<string, unknown>, query: string): number;
  export function paletteHotkey(platform?: string): string;
  export const PAGE_SIZES: number[];
  export const DEFAULT_PAGE_SIZE: number;
}

declare module '@apliteni/apliteni-ui/motion' {
  export function playEntrance(element: Element | null): void;
}
