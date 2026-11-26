// The shape of a rule: AGENTS.md#the-guidelines-collection
import type { Meta, StoryObj } from '@storybook/react';
import { GuidelinePage } from '../_guideline';
import { KeyValueList } from '../../react/src/KeyValueList';
import { newTaskMail } from '../../react/src/showcases/task-mail';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { loadGuideline } from './_markdown.js';
// @ts-expect-error -- plain JS story modules, read by the Node gates as well
import { SPEC_CSS } from './_notification-email.js';

const content = await loadGuideline('notification-email.md', new URL('../../guidelines/notification-email.md', import.meta.url));

/** A mail as its reader gets it: the subject, then the plain text. */
const Mail = ({ subject, text }: { subject: string; text: string }) => <div className="gl-stage gl-mail">
  <KeyValueList rows={[{ label: 'Subject', value: subject }]} />
  <p className="gl-mail__text">{text}</p>
</div>;

const mail = newTaskMail();
const specimens = [
  { id: 'task-mail', do: () => <Mail subject={mail.subject} text={mail.text} />,
    dont: () => <Mail subject="You have updates" text={'Something changed in your tasks.\n\nSign in to see what changed.\n'} /> },
];

const meta: Meta = { title: 'Guidelines/Notification email', parameters: { layout: 'fullscreen' } };
export default meta;

export const NotificationEmailPage: StoryObj = {
  name: 'Notification email',
  render: () => <GuidelinePage content={content} specimens={specimens} css={SPEC_CSS} />,
};
