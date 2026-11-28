// The Keyboard story's own layout, read in JSDOM. JSDOM lays nothing out, so this
// reads the story's styles: a grid with a fixed 300px track made the page 402px
// wide in a 360px window. The browser half, stories/datepicker-keyboard-fit.test.js,
// measures the overflow and the columns.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './DatePicker.stories';

describe('the Keyboard story', () => {
  it('wraps its two columns and caps the picker column at the story width', () => {
    const { Keyboard } = composeStories(stories);
    render(<Keyboard />);
    const row = document.querySelector('ul')!.parentElement as HTMLElement;
    expect(row.style.display).toBe('flex');
    expect(row.style.flexWrap).toBe('wrap');
    expect((row.firstElementChild as HTMLElement).style.maxWidth).toBe('100%');
  });
});
