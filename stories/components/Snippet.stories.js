import { snippet, hlShell, hlCode } from '../../src/components/index.js';
import { pad, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Code Snippet',
  parameters: { layout: 'fullscreen' },
};

export const Shell = {
  render: () => pad(`<div style="max-width:620px">${snippet({
    label: 'Terminal',
    copyLabel: 'Copy command',
    code: hlShell('claude mcp add strategy \\\n  --url "https://strategy.apli.tech/mcp" \\\n  --header "Authorization: Bearer $TOKEN"'),
  })}</div>`),
};

export const Reveal = {
  render: () => pad(`<div style="max-width:620px">${snippet({
    label: 'Your token — shown once',
    copyLabel: 'Copy token',
    reveal: true,
    code: 'apli_sk_live_9f2c4b7e1a06d8f3c5b2e9a1d4f70c83',
  })}</div>`),
};

// One specimen per language the highlighter knows, so the three token schemes
// are visible beside each other rather than described.
export const Variants = {
  render: () => pad(stack(
    specimen('Config (no copy)', snippet({ label: 'mcp.json', copy: false, code: hlCode('{\n  "url": "https://strategy.apli.tech/mcp",\n  "transport": "http",\n  "retries": 3,\n  "tls": true\n}', 'json') })),
    specimen('TypeScript', snippet({ label: 'strategy.ts', copyLabel: 'Copy example', code: hlCode("// Read the version the dashboard shows.\nimport { request } from '@apliteni/strategy';\n\nexport const version = await request('/api/version');\nconst retries = 3;", 'ts') })),
    specimen('Multi-line command', snippet({ label: 'Shell', copyLabel: 'Copy command', code: hlShell('# read the current strategy version\ncurl -s https://strategy.apli.tech/api/version \\\n  -H "Authorization: Bearer $TOKEN" | jq .') })),
  )),
};
