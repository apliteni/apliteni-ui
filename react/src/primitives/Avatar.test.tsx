import { render, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';
import { classesOfEl } from '../test/classlist';

const mark = (c: HTMLElement) => c.firstElementChild!;

// The class lists the vanilla avatar() wrote for the same person, held after #429 removed it.
it.each([
  ['a named mark', { personKey: 'user_1042', name: 'Avery Example' }, ['ui-avatar', 'ui-avatar--h4']],
  ['a 32 px mark', { personKey: 'user_7', name: 'Mia', size: 32 as const }, ['ui-avatar', 'ui-avatar--32', 'ui-avatar--h0']],
  ['no name', { personKey: 'user_9', name: '' }, ['ui-avatar', 'ui-avatar--anon']],
  ['the dashed ring', { empty: true }, ['ui-avatar', 'ui-avatar--empty']],
])('writes the avatar class list: %s', (_n, props, expected) => {
  const { container } = render(<Avatar {...props} />);
  expect(classesOfEl(mark(container))).toEqual(expected);
});

it('draws the same letters and hides from assistive technology', () => {
  const { container } = render(<Avatar personKey="k" name="mia chen" />);
  expect(mark(container).textContent).toBe('MC');
  expect(mark(container).getAttribute('aria-hidden')).toBe('true');
});

it('draws the user glyph when the name is empty', () => {
  const { container } = render(<Avatar personKey="k" name={null} />);
  expect(mark(container).querySelector('svg')).not.toBeNull();
});

it('falls back to the letters when the photo fails, and tries again for a new photo', () => {
  const { container, rerender } = render(<Avatar personKey="k" name="Mia Chen" src="https://example.com/a.jpg" />);
  const img = container.querySelector('img')!;
  expect(img.getAttribute('alt')).toBe('');
  fireEvent.error(img);
  expect(container.querySelector('img')).toBeNull();
  expect(mark(container).textContent).toBe('MC');
  rerender(<Avatar personKey="k" name="Mia Chen" src="https://example.com/b.jpg" />);
  expect(container.querySelector('img')).not.toBeNull();
});

it('shows a photo that completed before the ref mounted', () => {
  const complete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
  const naturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');
  Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 96 });
  try {
    const { container } = render(<Avatar name="Mia Chen" src="/cached.png" />);
    expect(container.querySelector('img')?.classList.contains('is-loaded')).toBe(true);
  } finally {
    if (complete) Object.defineProperty(HTMLImageElement.prototype, 'complete', complete);
    if (naturalWidth) Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', naturalWidth);
  }
});

it('removes a photo that failed before the ref mounted', () => {
  const complete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
  const naturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');
  Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 0 });
  try {
    const { container } = render(<Avatar name="Mia Chen" src="/missing.png" />);
    expect(container.querySelector('img')).toBeNull();
    expect(mark(container).textContent).toBe('MC');
  } finally {
    if (complete) Object.defineProperty(HTMLImageElement.prototype, 'complete', complete);
    if (naturalWidth) Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', naturalWidth);
  }
});
