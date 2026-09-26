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
  const explanation = useRef<HTMLDivElement>(null);
  return (
    <Modal open={open} title={title} onClose={onCancel} initialFocusRef={explanation}
      footer={<>
        <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>}>
      <div ref={explanation} tabIndex={-1}>{body}</div>
    </Modal>
  );
}
