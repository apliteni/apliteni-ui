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
  /** Accessible name and tooltip for the icon-only copy button; name what it copies. */
  copyLabel?: string;
};

export function Snippet({ label = 'shell', code = '', children, copy = true, reveal = false, copyLabel = 'Copy code' }: SnippetProps) {
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
        {/* Icon-only, the way the kit writes an allowed icon-only control:
            aria-label names what is copied and title repeats it as the tooltip.
            The confirmation is a glyph swap, so the button holds its 24px box; the
            word goes to the live region below, which ships empty because a
            role="status" inserted together with its text is silent on several
            screen readers. The button's name stays the action, which is still
            available. Same markup and classes as snippet(). */}
        {copy && <>
          <button
            type="button"
            className="ui-snippet__copy"
            aria-label={copyLabel}
            title={copyLabel}
            onClick={handleCopy}
          >
            <Icon name={status === 'idle' ? 'copy' : 'check'} />
          </button>
          <span className="ui-sr ui-snippet__status" role="status" aria-live="polite">
            {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : ''}
          </span>
        </>}
      </div>
      <pre>{children ?? code}</pre>
    </div>
  );
}
