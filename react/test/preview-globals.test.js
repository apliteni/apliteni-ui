import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { composeStories } from '@storybook/react';
import preview from '../../.storybook/preview.js';
import * as subThemes from '../../stories/foundations/SubThemes.stories';

it('keeps Inspector off by default without restoring its dropdown', () => {
  expect(preview.globalTypes.inspect.toolbar).toBeUndefined();
  expect(preview.globalTypes.inspect.defaultValue).toBe('off');
});

// A page can choose System, which the theme global holds as `auto`. The accent wall then
// paints the theme that the page shows.
it('paints the accent wall in the theme that System resolves to', () => {
  const media = window.matchMedia;
  window.matchMedia = (query) => ({ matches: query.includes('light'), addEventListener() {}, removeEventListener() {} });
  try {
    const { Overview } = composeStories(subThemes, { ...preview, initialGlobals: { theme: 'auto' } });
    render(createElement(Overview));
    expect(screen.getAllByText('Light')).toHaveLength(4);
    expect(screen.queryByText('Dark')).toBeNull();
  } finally { window.matchMedia = media; }
});
