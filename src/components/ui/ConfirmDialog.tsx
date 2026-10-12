import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from './Modal';

/** Confirmation prompt for destructive actions. Cancel is the default focus. */
export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon = <Trash2 size={18} />,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  /** A second, stronger line — what exactly will be lost. */
  detail?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      className="modal--confirm"
      title={title}
      icon={<span className={`modal__badge modal__badge--${tone}`}>{icon}</span>}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel} data-autofocus>
            {cancelLabel}
          </button>
          <button type="button" className={`btn btn--${tone}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm__message">{message}</p>
      {detail && <p className="confirm__detail">{detail}</p>}
    </Modal>
  );
}
