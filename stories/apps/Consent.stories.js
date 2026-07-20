import { brand } from '../../src/assets/brand.js';
import { button, icon } from '../../src/components/index.js';

export default {
  title: 'Apps/Consent',
  parameters: { layout: 'fullscreen' },
};

const scope = (ic, t, d) => `
  <div class="ui-scope">
    <span class="ui-scope__icon">${icon(ic)}</span>
    <div><div class="ui-scope__t">${t}</div><div class="ui-scope__d">${d}</div></div>
  </div>`;

const shell = (inner, prefix) => `
  <div class="ui-auth">
    <span class="ui-glow ui-glow--purple" style="top:-60px;right:16%"></span>
    <span class="ui-glow ui-glow--green" style="bottom:-90px;left:12%;width:300px;height:300px"></span>
    <div class="ui-auth__card" style="max-width:440px">
      <div class="ui-auth__brand">${brand({ p: prefix, word: 'Strategy', href: '#' })}</div>
      ${inner}
    </div>
  </div>`;

export const Grant = {
  name: 'Grant access',
  render: () => shell(`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <span style="width:46px;height:46px;border-radius:13px;background:var(--glow-purple);color:var(--accent);display:grid;place-items:center;font-size:23px">${icon('plug')}</span>
      <div style="display:flex;align-items:center;gap:9px;color:var(--muted);font-size:18px">${icon('arrowRight')}</div>
      <span style="width:46px;height:46px;border-radius:50%;background:linear-gradient(145deg,#2b6b4b,#1d4a5e);color:#fff;display:grid;place-items:center;font:600 14px Poppins">AL</span>
    </div>
    <h1 class="ui-auth__title" style="font-size:21px"><b style="color:var(--accent);font-weight:600">Research bot</b> wants to access your strategy</h1>
    <p class="ui-auth__sub">Signed in as <b style="color:var(--dim)">ada@apliteni.com</b>. This agent is asking to:</p>
    <div class="ui-scopes">
      ${scope('compass', 'Read the strategy', 'View the current strategy deck, text and version history.')}
      ${scope('key', 'Read as you', 'Access the same content your account can see — nothing more.')}
    </div>
    <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12.5px;margin:14px 0 22px">
      ${icon('lock')} <span>Read-only · you can revoke this anytime in Access &amp; agents.</span>
    </div>
    <div style="display:flex;gap:10px">
      ${button({ label: 'Deny', variant: 'secondary', block: true })}
      ${button({ label: 'Allow access', variant: 'primary', block: true, icon: 'check' })}
    </div>
    <div class="ui-auth__foot" style="margin-top:18px">Granting creates a revocable token for this agent.</div>
  `, 'co1'),
};

export const Granted = {
  render: () => shell(`
    <div class="ui-success" style="background:transparent;padding:16px 0 6px">
      <div class="ui-success__check">${icon('check')}</div>
      <div class="ui-success__title">Access granted</div>
      <div class="ui-success__sub" style="max-width:34ch;margin:0 auto">Research bot can now read your strategy. You can revoke it anytime.</div>
    </div>
    <div style="margin-top:22px">${button({ label: 'Manage agents', variant: 'secondary', block: true, iconRight: 'arrowRight' })}</div>
    <div class="ui-auth__foot" style="margin-top:16px">You can close this window and return to your agent.</div>
  `, 'co2'),
};
