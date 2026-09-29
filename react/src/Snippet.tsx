import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './primitives/Icon';

export type SnippetProps = {
  label?: string;
  /** Original text to copy; displayed when children are absent. */
  code?: string;
  /** Token markup for display only. Strings are never parsed as HTML. */
  children?: ReactNode;
  copy?: boolean;
  reveal?: boolean;
  copyLabel?: string;
};

export function Snippet({ label = 'shell', code = '', children, copy = true, reveal = false, copyLabel = 'Copy' }: SnippetProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setStatus('idle');
    return () => {
      request.current++;
      clearTimeout(timer.current);
    };
  }, [code, copy]);

  async function handleCopy() {
    const current = ++request.current;
    clearTimeout(timer.current);
    setStatus('idle');
    try {
      await navigator.clipboard.writeText(code);
      if (current !== request.current) return;
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 1400);
    } catch {
      if (current === request.current) setStatus('failed');
    }
  }

  return (
    <div className={reveal ? 'ui-snippet ui-snippet--reveal' : 'ui-snippet'}>
      <div className="ui-snippet__bar">
        <span>{label}</span>
        {copy && <button type="button" className="ui-snippet__copy" aria-live="polite" aria-atomic="true" onClick={handleCopy}>
          <Icon name={status === 'copied' ? 'check' : 'copy'} />
          {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : copyLabel}
        </button>}
      </div>
      <pre>{children ?? code}</pre>
    </div>
  );
}
