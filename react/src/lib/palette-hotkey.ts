/** The label for the key that opens the command palette, on the caller's platform. */
export function paletteHotkey(platform: string = typeof navigator === 'undefined' ? '' : navigator.platform): string {
  return /mac|iphone|ipad|ipod/i.test(platform || '') ? '⌘K' : 'Ctrl K';
}
