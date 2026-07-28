declare module '@apliteni/apliteni-ui' {
  export function icon(name: string): string;
  export function button(opts?: Record<string, unknown>): string;
  export function badge(label: string, variant?: string): string;
  export function card(opts?: Record<string, unknown>): string;
}
