import { useState } from 'react';
import { icon, avatarHue, avatarInitials } from '@apliteni/apliteni-ui';

export type AvatarProps = {
  /** The app's stable id for the person. It picks the hue, so one person keeps one hue. */
  personKey?: string | number;
  /** The person's name. The mark shows its first and last initials; empty draws the `user` glyph. */
  name?: string | null;
  /** A photo. The letters show if it fails to load. */
  src?: string;
  size?: 24 | 32;
  /** A dashed ring in place of a person: no value, or a "No one" row. */
  empty?: boolean;
};

// The React face of avatar(): the same classes and the same markup. It is decoration beside
// the name it stands for, so it is hidden from assistive technology.
// why: docs/components.md#avatar
export function Avatar({ personKey, name, src, size = 24, empty = false }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const base = ['ui-avatar', size === 32 && 'ui-avatar--32'];
  const cls = (...more: (string | false)[]) => [...base, ...more].filter(Boolean).join(' ');
  if (empty) return <span className={cls('ui-avatar--empty')} aria-hidden="true" />;
  const letters = avatarInitials(name);
  if (!letters) {
    return <span className={cls('ui-avatar--anon')} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon('user') }} />;
  }
  return (
    <span className={cls(`ui-avatar--h${avatarHue(personKey ?? name)}`)} data-initials={letters.length} aria-hidden="true">
      {letters}
      {src && src !== failedSrc && <img src={src} alt="" loading="lazy" className={loadedSrc === src ? 'is-loaded' : undefined} onLoad={() => setLoadedSrc(src)} onError={() => setFailedSrc(src)} />}
    </span>
  );
}
