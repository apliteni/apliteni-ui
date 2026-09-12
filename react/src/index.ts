// why: CONTRIBUTING.md#react-entry-point-declarations
import '../../src/styles/reduced-motion.css';

export { Icon } from './primitives/Icon';
export { Button } from './primitives/Button';
export type { ButtonProps } from './primitives/Button';
export { Badge } from './primitives/Badge';
export { Card } from './primitives/Card';
export { StatBand } from './primitives/StatBand';
export type { StatBandProps, StatFigure, StatDelta, StatTone, StatVariant } from './primitives/StatBand';
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
// why: CONTRIBUTING.md#react-page-size-declarations
import { PAGE_SIZES as KIT_PAGE_SIZES, DEFAULT_PAGE_SIZE as KIT_DEFAULT_PAGE_SIZE } from '@apliteni/apliteni-ui';

export const PAGE_SIZES: readonly number[] = KIT_PAGE_SIZES;
export const DEFAULT_PAGE_SIZE: number = KIT_DEFAULT_PAGE_SIZE;
export { Skeleton, SkeletonTable, BusyRegion, Denied } from './Loading';
export type { SkeletonProps, SkeletonTableProps, BusyRegionProps, DeniedProps } from './Loading';
