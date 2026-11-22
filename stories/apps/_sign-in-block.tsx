import { useEffect, useRef, useState } from 'react';
import { TextField } from '../../react/src/Field';
import { Button } from '../../react/src/primitives/Button';
import { Callout } from '../../react/src/primitives/Callout';

export type SignInArgs = { google: boolean; email: boolean; failed?: boolean; refuses?: boolean; passwordError?: string };

const googleMark = <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1C42.7 36.4 45 30.9 45 24.5z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.7C7.9 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.6 27.9c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.3C2.8 17.3 2 20.6 2 24s.8 6.7 2.3 9.6l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.3 2 7.9 6.9 4.3 14.4l7.3 5.7C13.3 14.7 18.2 10.8 24 10.8z"/></svg>;
const ANSWER_MS = 1200;

export function SignInBlock({ google, email, failed, refuses, passwordError, onDone }: SignInArgs & { onDone?: () => void }) {
  const [error, setError] = useState(failed);
  const [busy, setBusy] = useState<{ retry: boolean }>();
  const refused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => setError(failed), [failed]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function answer(retry = false) {
    if (busy) return;
    setBusy({ retry });
    timer.current = setTimeout(() => {
      setBusy(undefined);
      if (refuses && !refused.current) { refused.current = true; setError(true); return; }
      setError(false);
      onDone?.();
    }, ANSWER_MS);
  }
  return <div className="ui-stack">
    {google && error && <Callout variant="danger" actions={<Button variant="secondary" size="sm" icon="refresh" busy={busy?.retry} completionMessage="" onClick={() => answer(true)}>Try Google again</Button>}>Google did not finish the sign-in. Nothing changed. {email ? 'Try again, or sign in with your email.' : 'Try again.'}</Callout>}
    {google && <Button variant="primary" size="lg" block busy={busy && !busy.retry} completionMessage="" leading={googleMark} onClick={() => answer()}>Continue with Google</Button>}
    {email && <>{google && <div className="ui-divider">or</div>}<form className="auth-form" onSubmit={event => { event.preventDefault(); onDone?.(); }}>
      <TextField label="Work email" type="email" autoComplete="username" placeholder="you@apliteni.com" defaultValue={passwordError ? 'ada@apliteni.com' : undefined} icon="mail" required />
      <TextField label="Password" type="password" autoComplete="current-password" placeholder="••••••••" defaultValue={passwordError ? 'wrong' : undefined} icon="lock" required error={passwordError} />
      <Button variant={google ? 'secondary' : 'primary'} size="lg" block type="submit">Sign in</Button>
    </form></>}
  </div>;
}
