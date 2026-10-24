import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../../react/src/primitives/Card';
import { Pad, Title } from '../_page';

const meta: Meta = { title: 'Foundations/Typography', parameters: { layout: 'fullscreen' } };
export default meta;

const SpecimenRow = ({ size, weight, label, sample, role }: { size: string; weight: number; label: string; sample: string; role: 'display' | 'sans' }) =>
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
    <div style={{ flex: 'none', width: 150, font: '400 12px/1.4 var(--font-sans)', color: 'var(--muted)' }}>{label}<br /><span style={{ color: 'var(--dim)' }}>{`${size} / ${weight}`}</span></div>
    <div style={{ fontFamily: `var(--font-${role})`, fontSize: size, fontWeight: weight, color: 'var(--strong)', letterSpacing: '-.01em', lineHeight: 1.1 }}>{sample}</div>
  </div>;

const H3 = ({ title, note }: { title: ReactNode; note: string }) => <>
  <h3 style={{ font: '600 13px/1 var(--font-display)', color: 'var(--muted)', margin: '44px 0 6px' }}>{title}</h3>
  <p style={{ font: '400 13px/1.6 var(--font-sans)', color: 'var(--dim)', maxWidth: '64ch', marginBottom: 18 }}>{note}</p>
</>;
const roleCode = (role: string) => <>{`${role} — `}<code style={{ fontFamily: 'var(--font-mono)', fontSize: '.85em' }}>{`--font-${role.toLowerCase()}`}</code></>;
const mono12 = { fontFamily: 'var(--font-mono)', fontSize: 12 };

/* The same paragraph twice, one face each, at the size the complaint is about.
   Cyrillic on purpose: it is where the two faces differ most, and it is most of
   what the kit renders. why: docs/foundations.md#typefaces */
const Sample = () => <>Отчёт за неделю: расход вырос на 12%, конверсия держится. The row you are reading is set at 13px, which is what a table cell, a form field and a chat bubble are set at — <b>and this is bold</b>.</>;

/* One sentence, rendered twice: on the page and inside a card. The chip is the subject, so
   nothing else about the two specimens differs. */
const NeedLine = () => <p style={{ font: '400 13.5px/1.6 var(--font-sans)', color: 'var(--text)', margin: 0 }}>Grant the agent <code className="ui-code">reports.read</code> before it runs.</p>;

const CompareCell = ({ role, name, verdict }: { role: 'display' | 'sans'; name: string; verdict: string }) =>
  <div style={{ flex: '1 1 0', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
    <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--muted)', marginBottom: 4 }}>{name}</div>
    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>{`--font-${role}`}</code>
    <p style={{ fontFamily: `var(--font-${role})`, fontSize: 13, lineHeight: 1.6, color: 'var(--text)', margin: '14px 0 12px' }}><Sample /></p>
    <div style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted)' }}>{verdict}</div>
  </div>;

const caption = { font: '600 11px/1 var(--font-sans)', color: 'var(--muted)', marginBottom: 10 };

export const Scale: StoryObj = {
  render: () => <Pad>
    <Title>Typography</Title>
    <p style={{ color: 'var(--dim)', marginBottom: 8, maxWidth: '70ch' }}>Two roles, not one family. <b>Poppins</b> is the deck&apos;s voice and stays on headings, brand marks and large readouts. <b>IBM Plex Sans</b> is what an application is actually made of — tables, fields, paragraphs, chat.</p>
    <p style={{ color: 'var(--muted)', marginBottom: 30, maxWidth: '70ch', fontSize: 13 }}>The element decides, never the size: <code style={mono12}>h1</code>–<code style={mono12}>h6</code> take the display face, everything else takes the text face. A size threshold would change a heading&apos;s typeface halfway through a resize.</p>

    <div style={{ maxWidth: 820 }}>
      <H3 title={roleCode('Display')} note="Poppins. Geometric, wide, low stroke contrast — it holds its character where a line is short and the size is large." />
      <SpecimenRow size="56px" weight={700} label="Hero" sample="Product units" role="display" />
      <SpecimenRow size="40px" weight={700} label="Display" sample="One strategy, many agents" role="display" />
      <SpecimenRow size="30px" weight={700} label="Page title, h1" sample="Access & agents" role="display" />
      <SpecimenRow size="22px" weight={600} label="Section" sample="Connect over MCP" role="display" />

      <H3 title={<>Text — <code style={{ fontFamily: 'var(--font-mono)', fontSize: '.85em' }}>--font-sans</code></>} note="IBM Plex Sans. Humanist and narrower, with Cyrillic drawn by the same team as its Latin. This is the face the reading happens in. Page title, card title, body, label, caption and chip are the six ranks in docs/foundations.md#labels-and-titles." />
      <SpecimenRow size="18px" weight={600} label="Card title, h2" sample="Appearance" role="sans" />
      <SpecimenRow size="15.5px" weight={400} label="Body large" sample="The readable long-form version of the strategy." role="sans" />
      <SpecimenRow size="14.5px" weight={400} label="Body" sample="Personal tokens agents use to read the strategy." role="sans" />
      <SpecimenRow size="13px" weight={500} label="Label" sample="Last 30 days" role="sans" />
      <SpecimenRow size="11px" weight={600} label="Chip" sample="Live" role="sans" />
    </div>

    <div style={{ maxWidth: 820 }}>
      <H3 title="Why the split" note="The same paragraph at 13px, one face each. Poppins is not worse — it is doing a job it was not drawn for, and the wide round counters cost a line every few rows." />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <CompareCell role="display" name="Poppins" verdict="Wide counters, single-storey a. Measured on one dense table: mean row 62.27px, because three of twelve titles wrapped to a second line." />
        <CompareCell role="sans" name="IBM Plex Sans" verdict="Narrower and quieter at this size. Same table, same markup: mean row 56.40px, nothing wrapped." />
      </div>
      <p style={{ font: '400 12.5px/1.6 var(--font-sans)', color: 'var(--muted)', marginTop: 14, maxWidth: '70ch' }}>Bold in both samples is <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>--weight-semibold</code>, not the browser&apos;s 700: at 13px the bold step reads as a filled-in shape rather than as emphasis. 700 is still there for anything that asks for it by name.</p>
    </div>

    <div style={{ marginTop: 36, maxWidth: 820 }}>
      <h3 style={{ font: '600 13px/1 var(--font-display)', color: 'var(--muted)', marginBottom: 16 }}>Monospace — <code style={{ fontFamily: 'var(--font-mono)' }}>--font-mono</code></h3>
      <pre className="ui-code" style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text)', padding: 16, borderRadius: 12, margin: 0 }}>claude mcp add strategy --url https://strategy.apli.tech/mcp</pre>

      <H3 title="An identifier in prose" note="The chip takes whichever reading surface its container is not on, so the same sentence keeps it on the page and inside a card. #537" />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }} id="code-chip-specimen">
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div style={caption}>On the page</div>
          <NeedLine />
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div style={caption}>Inside a card</div>
          <Card><NeedLine /></Card>
        </div>
      </div>
    </div>
  </Pad>,
};
