import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as stories from './SplitLayout.stories';

/* The showcase's stylesheet, read as text. Vitest does not apply imported CSS in jsdom,
 * so a rule living there cannot be measured through getComputedStyle; it is held as the
 * declaration it is. The full-bleed margins and the phone stack are layout a browser
 * measures, so this test holds the source, not the geometry. */
const SHEET = readFileSync(path.join(process.cwd(), 'src/showcases/SplitLayout.css'), 'utf8');

const { Default } = composeStories(stories);

afterEach(() => {
  cleanup();
  document.cookie = 'apliteni-ui-rail=; Max-Age=0; path=/';
  document.documentElement.setAttribute('data-theme', 'dark');
});

const task = () => document.querySelector('.split-layout__task') as HTMLElement;

describe('split layout showcase', () => {
  it('owns one heading and one reading order: title, fields, actions, then the document', () => {
    render(<Default />);
    // The page owns its h1, so the shell renders no title band of its own.
    expect(screen.getByRole('heading', { level: 1, name: 'Approve document' })).toBeInTheDocument();
    const headings = screen.getAllByRole('heading');
    expect(headings.map((h) => `${h.tagName}:${h.textContent}`)).toEqual([
      'H1:Approve document',
      'H2:Service agreement',
    ]);
    // The task reads before the document in the DOM, and its fields answer its title.
    const field = (label: string) => within(task()).getByText(label).nextElementSibling as HTMLElement;
    expect(field('Prepared by').textContent).toBe('Cedar Studio');
    expect(field('Document').textContent).toBe('DEMO-1042');
    expect(field('Issued').textContent).toBe('18 September 2026');
    expect(field('Due').textContent).toBe('28 September 2026');
    expect(field('Total').textContent).toBe('EUR 1,440.00');
    // Approve commits; Request changes is the quiet alternative.
    expect(within(task()).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(task()).getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    // The document follows the task and sits on the full-bleed ground.
    const documentPane = document.querySelector('.split-layout__document') as HTMLElement;
    expect(task().compareDocumentPosition(documentPane) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(documentPane).getByRole('article', { name: 'Document' })).toBeInTheDocument();
  });

  it('puts the document on the kit document ground, not a showcase paint', () => {
    render(<Default />);
    const documentPane = document.querySelector('.split-layout__document') as HTMLElement;
    expect(documentPane.classList.contains('ui-document-ground')).toBe(true);
    // The showcase sheet places the pane; the kit class paints the ground.
    expect(SHEET).not.toMatch(/\.split-layout__document[^}]*background/);
    expect(SHEET).not.toMatch(/\.split-layout__document[^}]*border-radius/);
  });

  it('runs the ground flush to the page edge, top and bottom, and stacks the panes on a phone', () => {
    // The figures cancel .ui-app__main's own padding.
    expect(SHEET).toMatch(/margin-block: -40px -72px;/);
    expect(SHEET).toMatch(/margin-inline-end: calc\(-1 \* clamp\(24px, 4vw, 56px\)\);/);
    // The ground fills the whole main area below the band, so it never stops halfway.
    expect(SHEET).toMatch(/min-height: calc\(100vh - var\(--ui-app-band, 52px\)\);/);
    // The one documented breakpoint the kit ships: below 860px the panes stack,
    // and the page scrolls instead of holding the min-height.
    expect(SHEET).toMatch(/@media \(max-width: 860px\) \{\s*\.split-layout \{ grid-template-columns: minmax\(0, 1fr\); min-height: 0; margin: 0; \}/);
  });
});
