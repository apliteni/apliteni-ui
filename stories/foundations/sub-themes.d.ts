export type AccentStops = { a: string; as: string; ac: string; p: string; pl: string; pm: string; g: string; gf: string; gt: string };
export declare const ACCENT: Record<'Nebula' | 'Phoenix' | 'Ocean' | 'Emerald', { dark: AccentStops; light: AccentStops }>;
export declare const accentVars: (ac: AccentStops) => string;
