import type { Meta, StoryObj } from '@storybook/react';
import { InvoiceReview } from './InvoiceReview';

const meta = { title: 'Showcases/Invoice review', id: 'apps-invoice-review', component: InvoiceReview, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof InvoiceReview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { initialState: 'start' } };
export const Unreadable: Story = { args: { initialState: 'unreadable' } };
export const Supplier: Story = { args: { initialState: 'supplier' } };
export const ChooseSupplier: Story = { name: 'Choose supplier', args: { initialState: 'choose-supplier' } };
export const AddSupplier: Story = { name: 'Add supplier', args: { initialState: 'add-supplier' } };
export const SupplierAdded: Story = { name: 'Supplier added', args: { initialState: 'supplier-added' } };
export const Mismatch: Story = { args: { initialState: 'mismatch' } };
export const ManualTotal: Story = { name: 'Edit total', args: { initialState: 'manual-total' } };
export const TotalError: Story = { name: 'Edit total error', args: { initialState: 'total-error' } };
export const Matched: Story = { args: { initialState: 'matched' } };
export const Edit: Story = { args: { initialState: 'edit' } };
export const EditCancelled: Story = { name: 'Edit cancelled', args: { initialState: 'edit-cancelled' } };
export const EditSaved: Story = { name: 'Edit saved', args: { initialState: 'edit-saved' } };
export const Document: Story = { args: { initialState: 'document' } };
export const Finish: Story = { args: { initialState: 'finish' } };
export const Done: Story = { args: { initialState: 'done' } };
