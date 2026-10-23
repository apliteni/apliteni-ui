import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { footer } from './footer.js';

test('LinkedIn and GitHub use the same solid social mark paint', () => {
  const html = footer({ social: [
    { label: 'GitHub', icon: 'github' },
    { label: 'LinkedIn', icon: 'linkedin' },
  ] });
  const document = new JSDOM(html).window.document;
  const github = document.querySelector('[aria-label="GitHub"] svg');
  const linkedin = document.querySelector('[aria-label="LinkedIn"] svg');
  assert.equal(linkedin.getAttribute('fill'), github.getAttribute('fill'));
});
