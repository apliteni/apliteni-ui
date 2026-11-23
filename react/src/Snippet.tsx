import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './primitives/Icon';

export type SnippetProps = {
  /** Optional bar title; a block with no title floats the copy action over the
   *  first line of code, so the copy icon sits on the code's own line. */
  label?: string;
  /** Original text to copy; displayed when children are absent. */
  code?: string;
  /** Token markup for display only. Strings are never parsed as HTML. */
  children?: ReactNode;
  copy?: boolean;
  reveal?: boolean;
  /** Wraps the code instead of scrolling it, for a command a reader copies whole. */
  wrap?: boolean;
  /** Called after a successful copy, so a page can show its own result. */
  onCopy?: () => void;
  /** Accessible name and tooltip for the icon-only copy button; name what it copies. */
  copyLabel?: string;
};

export function Snippet({ label, code = '', children, copy = true, reveal = false, wrap = false, onCopy, copyLabel = 'Copy code' }: SnippetProps) {
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
      onCopy?.();
      timer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      if (current === request.current) setStatus('failed');
    }
  }

  // aria-label names what is copied and title repeats it as the tooltip. The
  // drawn confirmation is a glyph swap plus the word Copied for about 2s; the
  // word also goes to the live region below, which ships empty because a
  // role="status" inserted together with its text is silent on several screen
  // readers. The button's name stays the action, which is still available.
  const copyControl = () => copy && <>
    <button
      type="button"
      className="ui-snippet__copy"
      aria-label={copyLabel}
      title={copyLabel}
      onClick={handleCopy}
    >
      <Icon name={status !== 'copied' ? 'copy' : 'check'} />
      {status === 'copied' && <span className="ui-snippet__copied">Copied</span>}
    </button>
    <span className="ui-sr ui-snippet__status" role="status" aria-live="polite">
      {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : ''}
    </span>
  </>;

  return (
    <div className={reveal ? 'ui-snippet ui-snippet--reveal' : wrap ? 'ui-snippet ui-snippet--wrap' : 'ui-snippet'}>
      {label && <div className="ui-snippet__bar">
        <span>{label}</span>
        {copyControl()}
      </div>}
      {/* A title is optional: with none, the copy icon floats over the first line
          of code, on the code's own line rather than in a bar above it. */}
      {!label && copyControl()}
      <pre>{children ?? code}</pre>
    </div>
  );
}
