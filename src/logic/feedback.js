// The section a selection belongs to: the closest ancestor-or-preceding h2|h3 that
// carries an id, else the first such heading in `root`. The vanilla feedback widget
// and the React <Feedback> both ask it.
export function nearestSection(node, root) {
  let el = node && node.nodeType === 3 ? node.parentNode : node;
  while (el && el !== root) {
    let p = el;
    while (p) {
      if (p.tagName && /^H[23]$/.test(p.tagName) && p.id) return p;
      p = p.previousElementSibling;
    }
    el = el.parentElement;
  }
  return root ? root.querySelector('h2[id],h3[id]') : null;
}

