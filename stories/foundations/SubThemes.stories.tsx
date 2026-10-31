import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../../react/src/primitives/Badge';
import { Button } from '../../react/src/primitives/Button';
import { Segmented } from '../../react/src/Segmented';
import { Pad, Title } from '../_page';
import { ACCENT, accentVars, type AccentStops } from './sub-themes.js';

const meta: Meta = { title: 'Foundations/Sub-themes', parameters: { layout: 'fullscreen' } };
export default meta;

// The badge shows the theme, and a theme key is not a label. The kit writes the
// word for a key rather than styling the key into one.
// why: docs/foundations.md#labels-and-titles
const THEME_WORD = { dark: 'Dark', light: 'Light' } as const;

// This wall's button row is the shape the Accessibility minimums page warns
// about: small controls packed closer than their tap zones need. It follows
// that page's own rule rather than demonstrating the mistake — at the phone
// step, to a finger, the row opens to --tap-gap so both zones fit.
// why: guidelines/accessibility-floor.md, "Space between small targets"
const ROW_CSS = `.sub__row { display: flex; gap: 8px; flex-wrap: wrap; }
  @media (max-width: 560px) and (pointer: coarse) { .sub__row { gap: var(--tap-gap); } }`;

/** The panel pins only the accent family, as custom properties on its own box. */
const vars = (ac: AccentStops) => Object.fromEntries(accentVars(ac).split(';').map(pair => pair.split(':'))) as CSSProperties;

function Panel({ name, theme }: { name: keyof typeof ACCENT; theme: 'dark' | 'light' }) {
  const [view, setView] = useState('Deck');
  return <div style={{ ...vars(ACCENT[name][theme]), background: 'var(--bg)', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'inset 0 0 0 1px var(--border)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ font: '700 20px/1 var(--font-display)', letterSpacing: '-.01em' }}><span style={{ background: 'linear-gradient(120deg,var(--grad-from),var(--grad-to))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{name}</span></span>
      <span style={{ display: 'flex', gap: 6 }}><Badge variant="archive">{THEME_WORD[theme]}</Badge><Badge variant="live">Live</Badge></span>
    </div>
    <div className="ui-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 13 }}>
      <div className="sub__row"><Button variant="primary" size="sm">Primary</Button><Button variant="secondary" size="sm">Secondary</Button><Button variant="ghost" size="sm">Ghost</Button></div>
      <Segmented options={[{ value: 'Deck', label: 'Deck' }, { value: 'Text', label: 'Text' }]} value={view} onChange={setView} size="sm" label="View" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label className="ui-switch"><input type="checkbox" defaultChecked aria-label="Accent drives every control" /><span className="ui-switch__track" /></label>
        <span style={{ color: 'var(--dim)', font: '400 13px var(--font-sans)' }}>Accent drives every control</span>
      </div>
    </div>
  </div>;
}

export const Overview: StoryObj = {
  render: (_args, ctx) => {
    const theme = ctx?.globals?.theme === 'light' ? 'light' : 'dark';
    return <Pad>
      <Title>Accent sub-themes</Title>
      <p style={{ color: 'var(--dim)', marginBottom: 32, maxWidth: '64ch' }}>The <code style={{ fontFamily: 'var(--font-mono)' }}>data-accent</code> attribute works independently of dark and light. Here are all four accents at once. Only the accent family moves; surfaces, text and signal colours (green = live) stay put. Flip <b>Theme</b> in the toolbar to see them in light or dark.</p>
      <style>{ROW_CSS}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18 }}>
        {(Object.keys(ACCENT) as (keyof typeof ACCENT)[]).map(n => <Panel key={n} name={n} theme={theme} />)}
      </div>
    </Pad>;
  },
};
