// The React package publishes its own stylesheet (`apliteni-ui/react/css`), and a
// consumer who imports only that one gets neither of the kit's two nets. So both travel
// with this bundle — the same files src/index.css imports, not a second copy. They are
// imported from the entry rather than from motion.css because both icon gates read each
// sheet under src/styles/ alone and refuse an @import inside one.
// why: docs/specification.md#motion
// why: docs/specification.md#a-field-is-16px-on-a-touch-screen
import '../../src/styles/reduced-motion.css';
import '../../src/styles/field-zoom.css';

export { Icon } from './primitives/Icon';
export { Button } from './primitives/Button';
export type { ButtonProps } from './primitives/Button';
export { Badge } from './primitives/Badge';
export { Card } from './primitives/Card';
export { StatBand } from './primitives/StatBand';
export type { StatBandProps, StatFigure, StatDelta, StatTone, StatVariant } from './primitives/StatBand';
export { Confirm } from './Confirm';
export type { ConfirmProps } from './Confirm';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';
export { CommandPalette } from './CommandPalette';
export type { CommandPaletteProps, CommandGroup, CommandItem } from './CommandPalette';
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
export { Dropdown } from './Dropdown';
export type {
  DropdownProps, DropdownItem, DropdownEntry, DropdownSection, DropdownSeparator,
  DropdownBadge, DropdownRowProps, DropdownSearch,
} from './Dropdown';
export { BackLink } from './BackLink';
export type { BackLinkProps, BackLinkOwnProps } from './BackLink';

export * from './TableValues';
export * from './Segmented';
export * from './FilterBar';
export { KeyValueList, DrawerSection } from './KeyValueList';
export type { KeyValueRow, KeyValueListProps, DrawerSectionProps } from './KeyValueList';
export { Snippet } from './Snippet';
export type { SnippetProps } from './Snippet';
export { Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';
export { Timeline } from './Timeline';
export type { TimelineProps, TimelineEvent } from './Timeline';
export { TextField, TextArea, SelectField, FileField } from './Field';
export type { TextFieldProps, TextAreaProps, SelectFieldProps, FileFieldProps } from './Field';
