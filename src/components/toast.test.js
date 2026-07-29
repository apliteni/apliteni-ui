import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toast } from './index.js';

test('toast carries status + style modifier classes', () => {
  const html = toast({ variant: 'warn', style: 'outline', title: 'Heads up' });
  assert.match(html, /ui-toast--warn/);
  assert.match(html, /ui-toast--outline/);
});

test('toast defaults to soft style and a per-status icon', () => {
  const html = toast({ variant: 'danger', title: 'Failed' });
  assert.match(html, /ui-toast--soft/);
  // danger → the x glyph (path from the icon set), not the success check
  assert.match(html, /M18 6L6 18/);
});

test('toast colours come from CSS, not inline hex', () => {
  const html = toast({ variant: 'success', style: 'solid', title: 'Done' });
  assert.doesNotMatch(html, /#[0-9a-fA-F]{3,6}/);
});

test('action renders a button; timer renders a bar with a duration var', () => {
  const html = toast({ variant: 'info', title: 'Undo', action: 'Undo', timer: 6 });
  assert.match(html, /class="ui-toast__action"[^>]*>Undo</);
  assert.match(html, /data-toast-timer/);
  assert.match(html, /--toast-dur:6s/);
});

test('compact drops the body text', () => {
  const html = toast({ variant: 'neutral', title: 'Reconnecting', body: 'hidden', compact: true });
  assert.doesNotMatch(html, /ui-toast__text/);
  assert.doesNotMatch(html, /hidden/);
});

test('dismissible:false omits the close button', () => {
  assert.doesNotMatch(toast({ title: 'x', dismissible: false }), /ui-toast__close/);
  assert.match(toast({ title: 'x' }), /ui-toast__close/);
});
