import { useRef, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './primitives/Button';

export type ConfirmProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function Confirm({
  open, title, body, confirmLabel, cancelLabel, danger = false, busy = false,
  onConfirm, onCancel,
}: ConfirmProps) {
  const safeAction = useRef<HTMLButtonElement>(null);
  return (
    <Modal open={open} title={title} onClose={onCancel} role="alertdialog" initialFocusRef={safeAction}
      footer={<>
        <Button ref={safeAction} variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>}>
      {body}
    </Modal>
  );
}
