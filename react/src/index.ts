// The React package publishes its own stylesheet (`apliteni-ui/react/css`), and a
// consumer who imports only that one gets no reduced-motion net from the kit. So the
// net travels with this bundle too — the same file src/index.css imports, not a second
// copy. It is imported from the entry rather than from motion.css because both icon
// gates read each sheet under src/styles/ alone and refuse an @import inside one.
// why: docs/specification.md#motion
import '../../src/styles/reduced-motion.css';

export { Icon } from './primitives/Icon';
export { Button } from './primitives/Button';
export type { ButtonProps } from './primitives/Button';
export { Badge } from './primitives/Badge';
export { Card } from './primitives/Card';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { DataTable } from './DataTable';
export type { Column, DataTableProps } from './DataTable';
export { Skeleton, SkeletonTable, BusyRegion, Denied } from './Loading';
export type { SkeletonProps, SkeletonTableProps, BusyRegionProps, DeniedProps } from './Loading';
