import { icon } from '@apliteni/apliteni-ui';

// Kit glyphs are decorative: icon() emits aria-hidden="true", and the wrapper
// span is hidden too so no stray element is announced. A control that shows an
// icon and nothing else names itself (Button's iconOnly path, or aria-label).
export function Icon({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex' }}
      dangerouslySetInnerHTML={{ __html: icon(name) }}
    />
  );
}
