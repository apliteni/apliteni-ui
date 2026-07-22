import { brand } from '../../src/assets/brand.js';
import { button, field, input, icon, callout } from '../../src/components/index.js';

export default {
  title: 'Apps/Sign In (OAuth2)',
  parameters: { layout: 'fullscreen' },
};

const shell = (inner, prefix) => `
  <div class="ui-auth">
    <span class="ui-glow ui-glow--purple" style="top:-40px;left:20%"></span>
    <span class="ui-glow ui-glow--cyan" style="bottom:-80px;right:14%;width:320px;height:320px"></span>
    <div class="ui-auth__card">
      <div class="ui-auth__brand">${brand({ p: prefix, word: 'Strategy', href: '#' })}</div>
      ${inner}
    </div>
  </div>`;

const googleG = `<svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.4 45 30.9 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.3 2 7.9 6.9 4.3 14.4l7.3 5.7C13.3 14.7 18.2 10.8 24 10.8z"/></svg>`;
// The branded Google button goes through button() via iconSvg — the "G" isn't a
// kit glyph, but the button itself is a plain secondary/lg/block. busy:true gives
// the disabled state + gradient-bars loader for free (no hand-rolled markup).
const googleBtn = button({ label: 'Continue with Google', variant: 'secondary', size: 'lg', block: true, iconSvg: googleG });
const googleBtnLoading = button({ label: 'Signing you in', variant: 'secondary', size: 'lg', block: true, iconSvg: googleG, busy: true });

// Centered + glow shell (variant B) — brand + content centered, soft glow behind.
const centeredShell = (inner, prefix) => `
  <div class="ui-auth">
    <span class="ui-glow ui-glow--purple" style="top:-40px;left:20%"></span>
    <span class="ui-glow ui-glow--cyan" style="bottom:-80px;right:14%;width:320px;height:320px"></span>
    <div class="ui-auth__card" style="text-align:center;position:relative;overflow:hidden">
      <span style="position:absolute;inset:0;background:radial-gradient(150px 110px at 50% 0,var(--glow-purple),transparent 70%);pointer-events:none"></span>
      <div style="position:relative">
        <div style="display:inline-flex;transform:scale(1.5);margin:8px 0 22px">${brand({ p: prefix, word: 'Strategy', href: '#' })}</div>
        ${inner}
      </div>
    </div>
  </div>`;

export const Default = {
  render: () => shell(`
    <h1 class="ui-auth__title">Sign in</h1>
    <p class="ui-auth__sub">Access the Apliteni strategy. Use your work Google account or your email.</p>
    ${googleBtn}
    <div class="ui-divider">or</div>
    <form style="display:flex;flex-direction:column;gap:18px" onsubmit="return false">
      ${field({ label: 'Work email', control: input({ type: 'email', placeholder: 'you@apliteni.com', icon: 'mail' }) })}
      ${field({ label: 'Password', control: input({ type: 'password', placeholder: '••••••••', icon: 'lock' }) })}
      ${button({ label: 'Sign in', variant: 'primary', block: true, size: 'lg', type: 'submit' })}
    </form>
    <div class="ui-auth__foot">Only <b style="color:var(--dim)">apliteni.com</b> accounts can sign in.</div>
  `, 'si1'),
};

export const Error = {
  name: 'With error',
  render: () => shell(`
    <h1 class="ui-auth__title">Sign in</h1>
    <p class="ui-auth__sub">Access the Apliteni strategy.</p>
    ${callout({ variant: 'danger', icon: 'alert', body: "That email and password don't match. Try again or use Google." })}
    <form style="display:flex;flex-direction:column;gap:18px;margin-top:18px" onsubmit="return false">
      ${field({ label: 'Work email', control: input({ type: 'email', value: 'ada@apliteni.com', icon: 'mail' }) })}
      ${field({ label: 'Password', error: 'Incorrect password.', control: input({ type: 'password', value: 'wrong', icon: 'lock', invalid: true }) })}
      ${button({ label: 'Sign in', variant: 'primary', block: true, size: 'lg', type: 'submit' })}
    </form>
  `, 'si2'),
};

export const GoogleOnly = {
  name: 'Google SSO only',
  render: () => centeredShell(`
    <h1 class="ui-auth__title">Sign in to Strategy</h1>
    <p class="ui-auth__sub">Your work Google account is the key — no passwords.</p>
    ${googleBtn}
    <div class="ui-auth__foot" style="margin-top:22px">apliteni.com accounts only.</div>
  `, 'si4'),
};

export const GoogleSigningIn = {
  name: 'Google SSO — signing in',
  render: () => centeredShell(`
    <h1 class="ui-auth__title">Sign in to Strategy</h1>
    <p class="ui-auth__sub">Taking you to Google…</p>
    ${googleBtnLoading}
    <div class="ui-auth__foot" style="margin-top:22px">apliteni.com accounts only.</div>
  `, 'si5'),
};

// Idle vs. loading, side by side — the button is disabled while it works.
export const States = {
  render: () => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:40px;min-height:100vh;align-content:center;max-width:960px;margin:0 auto">
    <div>${centeredShell(`<h1 class="ui-auth__title">Sign in to Strategy</h1><p class="ui-auth__sub">Your work Google account is the key.</p>${googleBtn}<div class="ui-auth__foot" style="margin-top:22px">Idle</div>`, 'st1')}</div>
    <div>${centeredShell(`<h1 class="ui-auth__title">Sign in to Strategy</h1><p class="ui-auth__sub">Taking you to Google…</p>${googleBtnLoading}<div class="ui-auth__foot" style="margin-top:22px">Loading — disabled</div>`, 'st2')}</div>
  </div>`,
};
