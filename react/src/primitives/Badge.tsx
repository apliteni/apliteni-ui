import type { ReactNode } from 'react';

// The tone is always in the class list, neutral included: the vanilla factory writes it the
// same way, and a status column that reads a chip's tone off its classes found nothing on the
// two rows mapped to neutral. The base class paints the same neutral fill regardless. #459
export function Badge({ variant = 'neutral', children }: { variant?: string; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${variant}`}>{children}</span>;
}
