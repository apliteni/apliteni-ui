/* Type-level cases for Button's published surface. tsc is the assertion: this file
 * compiles clean while the surface holds, and Button.types.test.ts compiles it.
 *
 * Each `// case:` below is a consumer pattern that compiled on 0.59.0 and stopped
 * compiling when the `as` cast gained its link overload — the regression PR #477's
 * review measured. They are written against ./Button rather than the package entry
 * because index.ts imports CSS, which tsc will not resolve; the declarations are
 * the same ones index.ts re-exports.
 *
 * Limits: this reads the source declarations, not the emitted index.d.ts, and says
 * nothing about what any of these render.
 */
import { createRef, type ComponentProps } from 'react';
import { Button, type ButtonProps } from './Button';

// case: spread-exported-props
// The wrapper pattern: a caller types its own props as the package's ButtonProps
// and forwards them to the component that exports them.
export const Wrapper = (props: ButtonProps) => <Button {...props} />;

// case: component-props-without-href
// An overloaded type resolves to its last signature, so the union has to be last.
// With the anchor there, this silently meant "a link, and href is required".
const derived: ComponentProps<typeof Button> = { variant: 'primary', children: 'Save' };
export const FromComponentProps = () => <Button {...derived} />;

// case: display-name
// forwardRef carries displayName and callers read it in tests and dev tooling.
export const shown: string | undefined = Button.displayName;

// case: narrow-roots-still-narrow
// The wide signature must not flatten the two roots: each ref still lands on its
// own element, and the prop unions stay closed.
export const WithButtonRef = () => <Button ref={createRef<HTMLButtonElement>()}>Save</Button>;
export const WithLinkRef = () => <Button href="/reports" ref={createRef<HTMLAnchorElement>()}>Reports</Button>;
// @ts-expect-error variant is a closed set, not an arbitrary string
export const BadVariant = () => <Button variant="fuchsia">No</Button>;
