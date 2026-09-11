// The React package publishes its own stylesheet (`apliteni-ui/react/css`), and a
// consumer who imports only that one gets no reduced-motion net from the kit. So the
// net travels with this bundle too — the same file src/index.css imports, not a second
// copy. It is imported from the entry rather than from motion.css because both icon
// gates read each sheet under src/styles/ alone and refuse an @import inside one.
// why: docs/specification.md#motion
import '../../src/styles/reduced-motion.css';
// Drawer renders the vanilla drawer() markup, so its styles and its slide are the kit's
// own sheet rather than a React copy of it. Imported here so a consumer who takes only
// the React stylesheet still gets a drawer that looks and moves like one.
import '../../src/styles/drawer.css';

export { Icon } from './primitives/Icon';
export { Button } from './primitives/Button';
export type { ButtonProps } from './primitives/Button';
export { Badge } from './primitives/Badge';
export { Card } from './primitives/Card';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';
export { DataTable, sortTableRows } from './DataTable';
export type { Column, DataTableProps, TableSort } from './DataTable';
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';
// The page-size scale is the kit's, not this workspace's: taken from the vanilla
// component so no call site writes either number.
//
// Imported and re-declared rather than re-exported. `export … from` is copied
// straight through into the emitted index.d.ts, and the package's "." export is
// a bare "./src/index.js" with no `types` condition — so a consumer reading the
// published types was sent to a module they cannot resolve (TS7016 with
// skipLibCheck off, `any` with it on). The declaration that ships now names
// only itself. `readonly`, because the scale is the kit's answer and not an
// array a call site may push a fourth step onto.
// why: docs/specification.md#pagination
import { PAGE_SIZES as KIT_PAGE_SIZES, DEFAULT_PAGE_SIZE as KIT_DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';

export const PAGE_SIZES: readonly number[] = KIT_PAGE_SIZES;
export const DEFAULT_PAGE_SIZE: number = KIT_DEFAULT_PAGE_SIZE;
export { Skeleton, SkeletonTable, BusyRegion, Denied } from './Loading';
export type { SkeletonProps, SkeletonTableProps, BusyRegionProps, DeniedProps } from './Loading';
