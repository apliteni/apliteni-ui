export function formatNumericValue({ value, unit = '', missing = 'Not available' } = {}) {
  const present = value != null && value !== '';
  return { text: present ? String(value) : '—', unit: present ? unit : '', missing: present ? undefined : missing };
}

export function formatDeltaValue({ value, tone = 'neutral', basisId, missing = 'No earlier figure' } = {}) {
  const present = value != null && value !== '';
  const judged = present && ['success', 'danger'].includes(tone) && !/^[+−-]?0+(?:[.,]0+)?(?:[^\d.,].*)?$/.test(String(value).replace(/\s/g, ''));
  return { text: String(present ? value : missing), className: `ui-delta${judged ? ` ui-delta--${tone}` : ''}`, basisId };
}
