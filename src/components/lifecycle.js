// Shared ownership for vanilla initializers. why: docs/specification.md#initializer-lifecycle
const instances = new WeakMap();

export function lifecycle(element, key) {
  let entries = instances.get(element);
  if (!entries) instances.set(element, entries = new Map());
  if (entries.has(key)) return { ...entries.get(key), fresh: false };
  const cleanups = new Set();
  let active = true;
  const state = {
    fresh: true,
    get active() { return active; },
    add(cleanup) { cleanups.add(cleanup); },
    own(child) {
      if (cleanups.has(child.destroy)) return;
      cleanups.add(child.destroy);
      child.add(() => cleanups.delete(child.destroy));
    },
    on(target, type, listener, options) {
      if (!target) return;
      target.addEventListener(type, listener, options);
      cleanups.add(() => target.removeEventListener(type, listener, options));
    },
    timeout(fn, delay) {
      const cancel = () => { clearTimeout(timer); cleanups.delete(cancel); };
      const timer = setTimeout(() => {
        cleanups.delete(cancel);
        if (active) fn();
      }, delay);
      cleanups.add(cancel);
      return cancel;
    },
    destroy() {
      if (!active) return;
      active = false;
      entries.delete(key);
      for (const cleanup of [...cleanups].reverse()) cleanup();
      cleanups.clear();
    },
  };
  entries.set(key, state);
  return state;
}

export function combine(cleanups) {
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const cleanup of cleanups) cleanup();
  };
}

export function wireElements(root, selector, key, setup) {
  const owner = lifecycle(root, `scope:${key}:${selector}`);
  const elements = [...root.querySelectorAll(selector)];
  if (root.matches?.(selector)) elements.unshift(root);
  for (const element of elements) {
    const life = lifecycle(element, key);
    if (life.fresh) setup(element, life);
    owner.own(life);
  }
  return owner.destroy;
}

// Each live component holds one reference to its shared document listeners.
export function retainListeners(doc, key, setup) {
  const life = lifecycle(doc, key);
  if (life.fresh) {
    life.refs = { count: 0 };
    setup(life);
  }
  life.refs.count++;
  return combine([() => { if (--life.refs.count === 0) life.destroy(); }]);
}
