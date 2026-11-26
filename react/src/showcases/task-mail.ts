// The two task mails: a new task and a daily digest, each in plain text and in simple HTML.
// A mail client reads no stylesheet and no CSS variable, so the HTML writes each value
// inline. Each value is the light theme's value of the token that MAIL_TOKENS names, and
// task-mail.test.ts checks every one of them against src/tokens/tokens.css.
// why: guidelines/notification-email.md, #866
import { SETTINGS_URL, TASK_URL, TASKS, due, person, type Task } from './tasks-data';

/** The token behind each inline value of the HTML mail. */
export const MAIL_TOKENS = {
  ground: ['--bg', '#ffffff'],
  body: ['--text', '#1a1e27'],
  heading: ['--strong', '#0c0e13'],
  accent: ['--accent', '#6a2dcc'],
  onAccent: ['--accent-contrast', '#ffffff'],
  late: ['--status-warn-ink', '#684600'],
  rule: ['--border', '#e4e7ee'],
  font: ['--font-sans', "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"],
  text: ['--text-md', '15.5px'],
  small: ['--text-sm', '13px'],
  title: ['--text-xl', '22px'],
  tight: ['--leading-tight', '1.2'],
  snug: ['--leading-snug', '1.4'],
  normal: ['--leading-normal', '1.62'],
  pill: ['--radius-pill', '999px'],
} as const;
const T = Object.fromEntries(Object.entries(MAIL_TOKENS).map(([k, [, v]]) => [k, v])) as { [K in keyof typeof MAIL_TOKENS]: (typeof MAIL_TOKENS)[K][1] };

export const SENDER = 'Acme Finance';
export const ALL_TASKS_URL = 'https://finance.example.com/tasks?assignee=me';

export type Mail = { title: string; from: string; to: string; sent: string; subject: string; preheader: string; text: string; html: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const taskUrl = (task: Task) => `${TASK_URL}${task.name}`;

/** The text foot: why the reader gets the mail, then the settings link. It is always the last line. */
const textFoot = (why: string) => `-- \n${why}\nEmail settings: ${SETTINGS_URL}\n`;

const cell = (style: string, inner: string, span = false) => `<tr><td${span ? ' colspan="2"' : ''} style="${style}">${inner}</td></tr>`;
const button = (href: string, label: string) => `<a href="${esc(href)}" style="display:inline-block;background:${T.accent};border-radius:${T.pill};padding:12px 20px;font-size:${T.small};line-height:${T.tight};font-weight:600;color:${T.onAccent};text-decoration:none;">${esc(label)}</a>`;

/** The HTML frame of a mail: a hidden preview line, the sender, the rows, and the foot with Email settings last. */
function page(subject: string, preheader: string, rows: string, why: string, span: boolean) {
  const foot = cell('padding-top:32px;', `<div style="border-top:1px solid ${T.rule};padding-top:16px;font-size:${T.small};line-height:${T.normal};">${esc(why)} <a href="${esc(SETTINGS_URL)}" style="color:${T.accent};text-decoration:underline;">Email settings</a></div>`, span);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${T.ground};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>
<div role="main"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.ground};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${T.font};color:${T.body};text-align:left;">
${cell(`font-size:${T.text};line-height:${T.snug};font-weight:600;color:${T.heading};`, SENDER, span)}
${rows}
${foot}
</table>
</td></tr>
</table>
</div>
</body>
</html>
`;
}

/** The mail that tells a person that someone assigned a task to them. */
export function newTaskMail(task: Task = TASKS.find((t) => t.name === 'T-125')!, by = person('p2').name): Mail {
  const subject = `New task: ${task.title}`;
  const when = longDate(task.due);
  const why = 'You get this email when a person assigns a task to you.';
  const pre = `Due ${when}. ${by} assigned it to you.`;
  const text = `${by} assigned a task to you.\n\n${task.title}\nDue: ${when}\n\nOpen the task:\n${taskUrl(task)}\n\n${textFoot(why)}`;
  const rows = [
    cell(`padding-top:32px;font-size:${T.text};line-height:${T.normal};`, `${esc(by)} assigned a task to you.`),
    cell(`padding-top:16px;font-size:${T.title};line-height:${T.tight};font-weight:600;`, `<h1 style="margin:0;font:inherit;"><a href="${esc(taskUrl(task))}" style="color:${T.heading};text-decoration:none;">${esc(task.title)}</a></h1>`),
    cell(`padding-top:8px;font-size:${T.text};line-height:${T.normal};`, `Due ${when}`),
    cell('padding-top:24px;', button(taskUrl(task), 'Open task')),
  ].join('\n');
  return { title: 'Email: a new task', from: `${SENDER} <tasks@example.com>`, to: `${person(task.assignee).name} <tomas@example.com>`,
    sent: '26 November 2026, 14:12', subject, preheader: pre, text, html: page(subject, pre, rows, why, false) };
}

/** The morning mail of one person's late tasks and tasks due today. It has a link to each task. */
export function digestMail(tasks: Task[] = TASKS.filter((t) => t.assignee === 'p1')): Mail {
  const open = tasks.filter((t) => t.status !== 'done');
  const late = open.filter((t) => due(t).late).sort((a, b) => a.due.localeCompare(b.due));
  const today = open.filter((t) => due(t).text === 'Today');
  const subject = `Your tasks today: ${late.length} late, ${today.length} due today`;
  const why = 'You get this email on a morning when a task is late or due today.';
  const textGroup = (heading: string, list: Task[], note: boolean) => list.length
    ? `${heading}\n\n${list.map((t) => `- ${t.title}\n${note ? `  ${due(t).text}\n` : ''}  ${taskUrl(t)}\n`).join('\n')}\n` : '';
  const text = `${textGroup('Late', late, true)}${textGroup('Due today', today, false)}All your tasks:\n${ALL_TASKS_URL}\n\n${textFoot(why)}`;
  const line = `font-size:${T.text};line-height:${T.snug};`;
  const htmlGroup = (heading: string, list: Task[], note: boolean) => list.length ? [
    cell(`padding-top:24px;${line}font-weight:600;color:${T.heading};`, `<h2 style="margin:0;font:inherit;">${esc(heading)}</h2>`, true),
    ...list.map((t) => `<tr><td style="padding-top:12px;${line}"><a href="${esc(taskUrl(t))}" style="color:${T.heading};text-decoration:underline;">${esc(t.title)}</a></td>`
      + `<td align="right" valign="top" style="padding-top:12px;padding-left:16px;${line}white-space:nowrap;color:${note ? T.late : T.body};">${note ? esc(due(t).text) : ''}</td></tr>`),
  ] : [];
  const rows = [
    cell(`padding-top:32px;font-size:${T.title};line-height:${T.tight};font-weight:600;color:${T.heading};`, '<h1 style="margin:0;font:inherit;">Your tasks today</h1>', true),
    ...htmlGroup('Late', late, true), ...htmlGroup('Due today', today, false),
    cell('padding-top:24px;', button(ALL_TASKS_URL, 'Open tasks'), true),
  ].join('\n');
  const first = late[0] ?? today[0];
  const head = first ? `${first.title} is ${late[0] ? due(first).text : 'due today'}.` : 'No task is late or due today.';
  return { title: 'Email: the daily digest', from: `${SENDER} <tasks@example.com>`, to: `${person('p1').name} <ada@example.com>`,
    sent: '26 November 2026, 07:00', subject, preheader: head, text, html: page(subject, head, rows, why, true) };
}
