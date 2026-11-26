import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import axe from 'axe-core';
import { TaskMail } from './TaskMail';

afterEach(cleanup);

it.each([['new', 'Email: a new task', 'New task: Prepare the audit folder'], ['digest', 'Email: the daily digest', 'Your tasks today: 2 late, 1 due today']] as const)(
  'shows the %s mail envelope, its plain text and its HTML frame', async (mail, title, subject) => {
    const { container } = render(<TaskMail mail={mail} />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(subject)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Plain text' }).nextElementSibling?.textContent).toMatch(/Email settings: https:\/\/finance\.example\.com\/settings\/notifications\n$/);
    const frame = screen.getByTitle(`${title}, HTML form`) as HTMLIFrameElement;
    expect(frame.getAttribute('srcdoc')).toContain('>Email settings</a>');
    // jsdom runs no frame, so axe reads the page around it. The mail itself is measured in a browser.
    expect((await axe.run(container, { iframes: false })).violations).toEqual([]);
  });
