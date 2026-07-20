import { snippet, hlShell } from '../../src/components/index.js';
import { pad, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Code Snippet',
  parameters: { layout: 'fullscreen' },
};

export const Shell = {
  render: () => pad(`<div style="max-width:620px">${snippet({
    label: 'Terminal',
    code: hlShell('claude mcp add strategy \\\n  --url "https://strategy.apli.tech/mcp" \\\n  --header "Authorization: Bearer $TOKEN"'),
  })}</div>`),
};

export const Reveal = {
  render: () => pad(`<div style="max-width:620px">${snippet({
    label: 'Your token — shown once',
    reveal: true,
    code: 'apli_sk_live_9f2c4b7e1a06d8f3c5b2e9a1d4f70c83',
  })}</div>`),
};

export const Variants = {
  render: () => pad(stack(
    specimen('Config (no copy)', snippet({ label: 'mcp.json', copy: false, code: hlShell('{\n  "url": "https://strategy.apli.tech/mcp",\n  "transport": "http"\n}') })),
    specimen('Multi-line command', snippet({ label: 'shell', code: hlShell('# read the current strategy version\ncurl -s https://strategy.apli.tech/api/version \\\n  -H "Authorization: Bearer $TOKEN" | jq .') })),
  )),
};
