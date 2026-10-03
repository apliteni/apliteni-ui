export declare function prefersReducedMotion(): boolean;
export declare function staggerDelay(index: number, stepMs?: number): number;
export declare function initReveal(root?: Document | Element): IntersectionObserver | undefined;
export declare const ENTRANCE_FALLBACK_MS: number;
export declare function playEntrance(element: Element | null, className?: string): void;
export declare function replay(element: HTMLElement | null): void;
/** How long the stylesheet says this element's transition lasts, in ms; 0 off-DOM. */
export declare function transitionMs(element: Element | null | undefined): number;
