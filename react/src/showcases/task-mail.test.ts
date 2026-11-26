import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALL_TASKS_URL, MAIL_TOKENS, digestMail, newTaskMail } from './task-mail';
import { SETTINGS_URL } from './tasks-data';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

// A mail client reads no CSS variable, so each inline value must stay the light theme's
// token. A token that changes fails here until the mail follows it.
it('writes each inline value as the light value of its token', () => {
  const tokens = read('../../../src/tokens/tokens.css');
  const light = tokens.slice(tokens.indexOf(':root[data-theme="light"]'));
  for (const [name, value] of Object.values(MAIL_TOKENS)) {
    const own = light.match(new RegExp(`\\s${name}:\\s*([^;]+);`)) ?? tokens.match(new RegExp(`\\s${name}:\\s*([^;]+);`));
    expect(own?.[1].trim(), name).toBe(value);
  }
  // No colour reaches the HTML without a token behind it.
  const colours = new Set<string>(Object.values(MAIL_TOKENS).map(([, v]) => v));
  for (const mail of [newTaskMail(), digestMail()]) {
    for (const hex of mail.html.match(/#[0-9a-f]{6}\b/gi) ?? []) expect(colours.has(hex), hex).toBe(true);
  }
});

describe.each([['new task', newTaskMail()], ['digest', digestMail()]])('the %s mail', (_, mail) => {
  it('ends both forms with the reason and the Email settings link', () => {
    expect(mail.text.trimEnd().split('\n').at(-1)).toBe(`Email settings: ${SETTINGS_URL}`);
    expect(mail.text).toContain('\n-- \n');
    const links = [...mail.html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    expect(links.at(-1)?.slice(1)).toEqual([SETTINGS_URL, 'Email settings']);
  });
  it('links each task in both forms, and names the mail in its title', () => {
    for (const url of mail.text.match(/https:\/\/finance\.example\.com\/tasks\/T-\d+/g) ?? []) expect(mail.html).toContain(`href="${url}"`);
    expect(mail.html).toContain(`<title>${mail.subject}</title>`);
    expect(mail.html).toContain('<html lang="en">');
  });
});

it('names the task event in the subject and links the task', () => {
  const mail = newTaskMail();
  expect(mail.subject).toBe('New task: Prepare the audit folder');
  expect(mail.text.split('\n')[0]).toBe('Mara Lindqvist assigned a task to you.');
  expect(mail.text).toContain('Open the task:\nhttps://finance.example.com/tasks/T-125');
});

it('counts the late tasks and the tasks due today, and links all the tasks', () => {
  const mail = digestMail();
  expect(mail.subject).toBe('Your tasks today: 2 late, 1 due today');
  expect(mail.text.startsWith('Late\n\n- Match the October bank statement\n  3 days late\n')).toBe(true);
  expect(mail.html).toContain(`href="${ALL_TASKS_URL}"`);
});
