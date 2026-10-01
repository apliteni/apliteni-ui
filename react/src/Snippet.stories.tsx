import { useEffect, useRef } from 'react';
import { snippet, hlCode, hlShell, codeTokens, wireTopbar } from '@apliteni/apliteni-ui';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import { Snippet, type SnippetProps } from './Snippet';

type Language = Parameters<typeof codeTokens>[1];

const shellCode = 'curl -s https://example.com/api/version \\\n  -H "Accept: application/json"';
const configCode = '{\n  "url": "https://example.com/mcp",\n  "transport": "http",\n  "retries": 3,\n  "tls": true\n}';
const tsCode = '// Build the children from the string you copy.\n'
  + "import { codeTokens } from '@apliteni/apliteni-ui';\n\n"
  + "export const spans = codeTokens(code, 'shell');\n"
  + 'const retries = 3;';
const commentedShell = '# read the current version\n' + shellCode;

// codeTokens is the vanilla highlighters' own tokenizer, so the spans and the
// copied string come from one source. Hand-written spans beside a `code` string
// are two copies of the same text, and nothing keeps them in step.
const tokens = (code: string, lang: Language = 'shell') =>
  codeTokens(code, lang).map(({ cls, text }, at) => (cls ? <span key={at} className={cls}>{text}</span> : text));

const meta: Meta<typeof Snippet> = {
  title: 'React/Snippet',
  component: Snippet,
  // Highlighted by default, so every story inheriting these args shows the token
  // colours instead of a wall of body ink.
  args: { label: 'Terminal', code: shellCode, children: tokens(shellCode), copyLabel: 'Copy command' },
  render: (args: SnippetProps) => <div style={{ maxWidth: 620 }}><Snippet {...args} /></div>,
};
export default meta;
type Story = StoryObj<typeof Snippet>;

export const Shell: Story = {};

// `name` only sets the sidebar label; the story IDs stay react-snippet--json and
// react-snippet--type-script. Without it Storybook splits the export and shows
// "Type Script".
export const Json: Story = {
  name: 'JSON',
  args: { label: 'mcp.json', code: configCode, children: tokens(configCode, 'json'), copyLabel: 'Copy configuration' },
};

export const TypeScript: Story = {
  name: 'TypeScript',
  args: { label: 'snippet.ts', code: tsCode, children: tokens(tsCode, 'ts'), copyLabel: 'Copy example' },
};

// The path with no children: `code` is shown as plain text. An install line has
// one command and nothing else to colour, which is what this story is for.
export const Plain: Story = {
  args: { code: 'npm install @apliteni/apliteni-ui', children: undefined },
};

export const Reveal: Story = {
  render: () => <div style={{ maxWidth: 620 }}>
    <p>This secret is stored hashed and will not be shown again. Copy it now.</p>
    <Snippet label="Example secret — shown once" reveal copyLabel="Copy secret"
      code="example-only-not-a-real-secret-abcdefghijklmnopqrstuvwxyz-0123456789-abcdefghijklmnopqrstuvwxyz-0123456789" />
  </div>,
};

export const CopyHover: Story = {
  parameters: { docs: { description: { story: 'Hover the copy glyph to see its accent colour. The button is icon-only; copyLabel is its accessible name and its tooltip.' } } },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: 'Copy command' }));
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
      await userEvent.click(canvas.getByRole('button', { name: 'Copy command' }));
      await expect(await canvas.findByRole('button', { name: 'Copied' })).toHaveAttribute('aria-live', 'polite');
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  },
};

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

export const Variants: Story = {
  render: () => <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: 'var(--panel-lg)' }}>
    <Snippet label="mcp.json" code={configCode} copy={false}>{tokens(configCode, 'json')}</Snippet>
    <Snippet label="snippet.ts" code={tsCode} copyLabel="Copy example">{tokens(tsCode, 'ts')}</Snippet>
    <Snippet label="Shell" code={commentedShell} copyLabel="Copy command">{tokens(commentedShell)}</Snippet>
  </div>,
};

export const Comparison: Story = {
  render: () => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-6)' }}>
    <section aria-label="Vanilla" style={{ minWidth: 0 }}>
      <h2>Vanilla</h2>
      <Vanilla html={
        snippet({ label: 'Terminal', code: hlShell(shellCode), copyLabel: 'Copy command' }) +
        snippet({ label: 'mcp.json', code: hlCode(configCode, 'json'), copy: false }) +
        snippet({ label: 'snippet.ts', code: hlCode(tsCode, 'ts'), copyLabel: 'Copy example' })
      } />
    </section>
    <section aria-label="React" style={{ minWidth: 0 }}>
      <h2>React</h2>
      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <Snippet label="Terminal" code={shellCode} copyLabel="Copy command">{tokens(shellCode)}</Snippet>
        <Snippet label="mcp.json" code={configCode} copy={false}>{tokens(configCode, 'json')}</Snippet>
        <Snippet label="snippet.ts" code={tsCode} copyLabel="Copy example">{tokens(tsCode, 'ts')}</Snippet>
      </div>
    </section>
  </div>,
};

export const KeyboardFocus: Story = {
  render: () => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-6)' }}>
    <section aria-label="Vanilla" style={{ minWidth: 0 }}>
      <h2>Vanilla</h2>
      <Vanilla html={
        snippet({ label: 'Terminal', code: hlShell(shellCode), copyLabel: 'Copy command' }) +
        snippet({ label: 'Example token', code: 'example-only-token-value', reveal: true, copyLabel: 'Copy secret' }) +
        snippet({ label: 'Read only', code: hlShell(shellCode), copy: false })
      } />
    </section>
    <section aria-label="React" style={{ minWidth: 0 }}>
      <h2>React</h2>
      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <Snippet label="Terminal" code={shellCode} copyLabel="Copy command">{tokens(shellCode)}</Snippet>
        <Snippet label="Example token" code="example-only-token-value" reveal copyLabel="Copy secret" />
        <Snippet label="Read only" code={shellCode} copy={false}>{tokens(shellCode)}</Snippet>
      </div>
    </section>
  </div>,
};
