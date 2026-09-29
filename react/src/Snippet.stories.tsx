import { snippet, hlShell } from '@apliteni/apliteni-ui';
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
const shellTokens = <><span className="k">curl</span>{' '}<span className="f">-s</span>{' '}
  <span className="u">https://example.com/api/version</span>{' \\\n  '}
  <span className="f">-H</span>{' '}<span className="s">{'"Accept: application/json"'}</span></>;
const configCode = '{\n  "url": "https://example.com/mcp",\n  "transport": "http"\n}';
const configTokens = <>{'{\n  '}<span className="s">{'"url"'}</span>{': '}
  <span className="s">{'"https://example.com/mcp"'}</span>{',\n  '}
  <span className="s">{'"transport"'}</span>{': '}<span className="s">{'"http"'}</span>{'\n}'}</>;

export const Shell: Story = {
  args: { label: 'Terminal', code: shellCode, children: shellTokens },
};

export const Variants: Story = {
  render: () => <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: 'var(--panel-lg)' }}>
    <Snippet label="mcp.json" code={configCode} copy={false}>{configTokens}</Snippet>
    <Snippet label="Shell" code={'# read the current version\n' + shellCode}>
      <span className="c"># read the current version</span>{'\n'}{shellTokens}
    </Snippet>
  </div>,
};

export const Comparison: Story = {
  render: () => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-6)' }}>
    <section aria-label="Vanilla" style={{ minWidth: 0 }}>
      <h2>Vanilla</h2>
      <div style={{ display: 'grid', gap: 'var(--space-6)' }} dangerouslySetInnerHTML={{ __html:
        snippet({ label: 'Terminal', code: hlShell(shellCode) }) +
        snippet({ label: 'mcp.json', code: hlShell(configCode), copy: false }) +
        snippet({ label: 'Shell', code: hlShell('# read the current version\n' + shellCode) }),
      }} />
    </section>
    <section aria-label="React" style={{ minWidth: 0 }}>
      <h2>React</h2>
      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <Snippet label="Terminal" code={shellCode}>{shellTokens}</Snippet>
        <Snippet label="mcp.json" code={configCode} copy={false}>{configTokens}</Snippet>
        <Snippet label="Shell" code={'# read the current version\n' + shellCode}>
          <span className="c"># read the current version</span>{'\n'}{shellTokens}
        </Snippet>
      </div>
    </section>
  </div>,
};
