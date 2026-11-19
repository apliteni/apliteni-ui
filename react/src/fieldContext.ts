import { createContext } from 'react';

// What a control that is not a form element needs from the Field around it: the id the
// Field gave its control, the id of its label and the label's words. A button cannot be
// the target of `<label for>` and also keep its own value in its name, so it points at the
// label. A panel that leaves the field, such as a date sheet, names itself with the words.
export const FieldContext = createContext<{ id: string; labelId: string; label: string } | null>(null);
