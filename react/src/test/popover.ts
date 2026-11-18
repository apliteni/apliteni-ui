import { vi } from 'vitest';

// jsdom has no popover API. This stand-in keeps one open flag for each element, so a test
// can run the top-layer path and see what was shown and hidden. It places nothing.
export function stubPopover() {
  const proto = HTMLElement.prototype as HTMLElement & Record<'showPopover' | 'hidePopover', unknown>;
  const open = new WeakSet<Element>();
  const show = vi.fn(function (this: HTMLElement) { open.add(this); });
  const hide = vi.fn(function (this: HTMLElement) { open.delete(this); });
  Object.defineProperty(proto, 'showPopover', { configurable: true, writable: true, value: show });
  Object.defineProperty(proto, 'hidePopover', { configurable: true, writable: true, value: hide });
  const matches = Element.prototype.matches;
  const spy = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
    return selector === ':popover-open' ? open.has(this) : matches.call(this, selector);
  });
  return {
    show,
    hide,
    restore() {
      spy.mockRestore();
      delete (proto as Partial<typeof proto>).showPopover;
      delete (proto as Partial<typeof proto>).hidePopover;
    },
  };
}
