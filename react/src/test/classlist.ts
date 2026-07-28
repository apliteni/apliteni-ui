// Sorted class tokens of the FIRST element in an HTML string (vanilla factory output),
// or of a DOM element (React output). Used by class-name parity tests.
export function classesOf(html: string): string[] {
  const m = html.match(/class="([^"]*)"/);
  return (m ? m[1].split(/\s+/) : []).filter(Boolean).sort();
}
export function classesOfEl(el: Element): string[] {
  return Array.from(el.classList).sort();
}
