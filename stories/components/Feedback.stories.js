import { feedbackWidget, wireFeedback } from '../../src/components/feedback.js';

export default {
  title: 'Components/Feedback',
  parameters: { layout: 'fullscreen' },
};

const ARTICLE = `
  <main style="max-width:660px;margin:0 auto;padding:44px 24px 140px;color:var(--dim);font-size:16px;line-height:1.75">
    <div class="ui-eyebrow" style="margin-bottom:10px">Inline feedback</div>
    <h1 style="font:700 clamp(28px,4vw,38px)/1.1 var(--font-sans);color:var(--strong);letter-spacing:-.02em;margin-bottom:14px">Select any passage to leave feedback</h1>
    <p style="margin-bottom:22px">Highlight a sentence below — a <b style="color:var(--text)">Give feedback</b> pill appears above the selection. Click it to open the composer with your quoted passage, write a note, and send. The pill and Send button follow the current accent.</p>
    <h2 id="how-it-works" style="font:600 20px/1.3 var(--font-sans);color:var(--strong);margin:30px 0 10px">How it works</h2>
    <p style="margin-bottom:18px">The kit owns everything visual and interactive: the selection pill, the composer, the spinner, the success animation and the error state. Your app owns the backend — you pass an <code class="ui-code">onSend</code> that files the note wherever you like (a GitHub issue, a database row, a webhook).</p>
    <h2 id="what-you-get" style="font:600 20px/1.3 var(--font-sans);color:var(--strong);margin:30px 0 10px">What lands in your handler</h2>
    <p style="margin-bottom:18px">Each submission gives you the note, the exact excerpt the reader selected, and the nearest heading it sat under (its text and id) — enough to build a deep link straight back to the passage. Select this sentence to see the heading show up as the composer's chip.</p>
  </main>`;

const mount = (onSend) => {
  const root = document.createElement('div');
  root.innerHTML = ARTICLE + feedbackWidget();
  requestAnimationFrame(() => wireFeedback({ container: root.querySelector('main'), onSend }));
  return root;
};

export const Default = {
  render: () => mount((_payload) => new Promise((res) => setTimeout(() => res({ ok: true }), 700))),
};

export const ServerError = {
  render: () => mount((_payload) => new Promise((res) => setTimeout(() => res({ ok: false, error: 'Demo: the backend rejected this — try again.' }), 700))),
};
