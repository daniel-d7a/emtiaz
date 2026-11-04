import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { IconButton } from './IconButton';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, description, children, footer, className = '' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      className={`m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-line bg-surface p-5 text-ink backdrop:bg-ink/40 ${className}`}
    >
      <h2 id={`${id}-title`} className="text-lg font-bold">{title}</h2>
      {description && <p id={`${id}-description`} className="mt-1 text-sm text-ink-soft">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
      {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
    </dialog>
  );
}

export function Sheet({
  open, onOpenChange, title, closeLabel, children, side = 'end',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  side?: 'start' | 'end';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      className={`fixed inset-y-0 m-0 h-full max-h-none w-80 max-w-[calc(100%-2rem)] overflow-y-auto border-line bg-surface p-5 text-ink backdrop:bg-ink/40 ${
        side === 'end' ? 'end-0 border-s' : 'start-0 border-e'
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-lg font-bold">{title}</h2>
        <IconButton label={closeLabel} onClick={() => onOpenChange(false)}>×</IconButton>
      </div>
      {children}
    </dialog>
  );
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, cancelLabel, destructive, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
