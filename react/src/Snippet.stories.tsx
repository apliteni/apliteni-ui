import { useEffect, useRef } from 'react';
import { snippet, hlShell, shellTokens, wireTopbar } from '@apliteni/apliteni-ui';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Snippet, type SnippetProps } from './Snippet';

const meta: Meta<typeof Snippet> = {
  title: 'React/Snippet',
  component: Snippet,
  args: { label: 'Terminal', code: 'npm install @apliteni/apliteni-ui' },
  render: (args: SnippetProps) => <div style={{ maxWidth: 620 }}><Snippet {...args} /></div>,
};
export default meta;
type Story = StoryObj<typeof Snippet>;

export const Plain: Story = {};

export const Reveal: Story = {
  render: () => <div style={{ maxWidth: 620 }}>
    <p>This secret is stored hashed and will not be shown again. Copy it now.</p>
    <Snippet label="Example secret — shown once" reveal
      code="example-only-not-a-real-secret-abcdefghijklmnopqrstuvwxyz-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789" />
  </div>,
};

export const CopyHover: Story = {
  parameters: { docs: { description: { story: 'Hover over Copy to see its accent colour.' } } },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Copy' }));
  },
};

export const Copied: Story = {
  play: async ({ canvasElement }) => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: async () => {} },
    });
    try {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole('button', { name: 'Copy' }));
      await expect(await canvas.findByRole('button', { name: 'Copied' })).toHaveAttribute('aria-live', 'polite');
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  },
};

const shellCode = 'curl -s https://example.com/api/version \\\n  -H "Accept: application/json"';
const configCode = '{\n  "url": "https://example.com/mcp",\n  "transport": "http"\n}';
const commentedShell = '# read the current version\n' + shellCode;

// shellTokens is the vanilla highlighter's own tokenizer, so the spans and the
// copied string come from one source. Hand-written spans beside a `code` string
// are two copies of the same text, and nothing keeps them in step.
const tokens = (code: string) =>
  shellTokens(code).map(({ cls, text }, at) => (cls ? <span key={at} className={cls}>{text}</span> : text));

// snippet() returns markup; wireTopbar() attaches the copy behaviour. Without it
// the vanilla Copy button is inert and a reader comparing the columns side by
// side reads that as a React regression. #474
function Vanilla({ html }: { html: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    node.innerHTML = html;
    wireTopbar(node);
  }, [html]);
  return <div ref={host} style={{ display: 'grid', gap: 'var(--space-6)' }} />;
}

export const Shell: Story = {
  args: { label: 'Terminal', code: shellCode, children: tokens(shellCode) },
};

export const Variants: Story = {
  render: () => <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: 'var(--panel-lg)' }}>
    <Snippet label="mcp.json" code={configCode} copy={false}>{tokens(configCode)}</Snippet>
    <Snippet label="Shell" code={commentedShell}>{tokens(commentedShell)}</Snippet>
  </div>,
};

export const Comparison: Story = {
  render: () => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-6)' }}>
    <section aria-label="Vanilla" style={{ minWidth: 0 }}>
      <h2>Vanilla</h2>
      <Vanilla html={
        snippet({ label: 'Terminal', code: hlShell(shellCode) }) +
        snippet({ label: 'mcp.json', code: hlShell(configCode), copy: false }) +
        snippet({ label: 'Shell', code: hlShell(commentedShell) })
      } />
    </section>
    <section aria-label="React" style={{ minWidth: 0 }}>
      <h2>React</h2>
      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <Snippet label="Terminal" code={shellCode}>{tokens(shellCode)}</Snippet>
        <Snippet label="mcp.json" code={configCode} copy={false}>{tokens(configCode)}</Snippet>
        <Snippet label="Shell" code={commentedShell}>{tokens(commentedShell)}</Snippet>
      </div>
    </section>
  </div>,
};

export const KeyboardFocus: Story = {
  render: () => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-6)' }}>
    <section aria-label="Vanilla" style={{ minWidth: 0 }}>
      <h2>Vanilla</h2>
      <Vanilla html={
        snippet({ label: 'Terminal', code: shellCode }) +
        snippet({ label: 'Example token', code: 'example-only-token-value', reveal: true }) +
        snippet({ label: 'Read only', code: shellCode, copy: false })
      } />
    </section>
    <section aria-label="React" style={{ minWidth: 0 }}>
      <h2>React</h2>
      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <Snippet label="Terminal" code={shellCode} />
        <Snippet label="Example token" code="example-only-token-value" reveal />
        <Snippet label="Read only" code={shellCode} copy={false} />
      </div>
    </section>
  </div>,
};
