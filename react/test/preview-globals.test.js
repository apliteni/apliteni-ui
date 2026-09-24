import { expect, it } from 'vitest';
import preview from '../../.storybook/preview.js';

it('keeps Inspector off by default without restoring its dropdown', () => {
  expect(preview.globalTypes.inspect.toolbar).toBeUndefined();
  expect(preview.globalTypes.inspect.defaultValue).toBe('off');
});
