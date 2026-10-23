import { createContext } from 'react';

// What a control that is not a form element needs from the Field around it: the id the
// Field gave its control, and the id of its label. A button cannot be the target of
// `<label for>` and also keep its own value in its name, so it points at the label.
export const FieldContext = createContext<{ id: string; labelId: string } | null>(null);
