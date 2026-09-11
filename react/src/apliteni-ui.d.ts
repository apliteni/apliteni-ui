declare module '@apliteni/apliteni-ui' {
  export function icon(name: string): string;
  export function button(opts?: Record<string, unknown>): string;
  export function badge(label: string, variant?: string): string;
  export function card(opts?: Record<string, unknown>): string;
  export function pagination(opts?: Record<string, unknown>): string;
  export function drawer(opts?: Record<string, unknown>): string;
  export function statBand(opts?: Record<string, unknown>): string;
  export function commandPalette(opts?: Record<string, unknown>): string;
  export function rankGroups<G>(groups: readonly G[], query: string): G[];
  export function rankCommands<I>(items: readonly I[], query: string): I[];
  export function scoreCommand(item: Record<string, unknown>, query: string): number;
  export function paletteHotkey(platform?: string): string;
  export const PAGE_SIZES: number[];
  export const DEFAULT_PAGE_SIZE: number;
}
