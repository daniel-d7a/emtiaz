import { useState } from 'react';
import { Info } from 'lucide-react';
import { useLang } from '../../lib/i18n';
import { Button } from './Button';
import { Dialog } from './Dialog';

export type InfoHintStep = {
  title: string;
  body: string;
};

export type InfoHintProps = {
  title?: string;
  hint?: string;
  steps?: InfoHintStep[];
  ariaLabel?: string;
  className?: string;
};

function ensureDialogPolyfill() {
  if (typeof HTMLDialogElement === 'undefined') return;
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  }
}

export function InfoHint({ title, hint, steps, ariaLabel, className = '' }: InfoHintProps) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const isMultiStep = Array.isArray(steps) && steps.length > 0;
  if (!isMultiStep && !hint) return null;

  const defaultLabel = lang === 'ar' ? 'معلومات إضافية' : 'More information';
  const buttonLabel = ariaLabel ?? title ?? defaultLabel;

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    ensureDialogPolyfill();
    setStepIndex(0);
    setOpen(true);
  };

  const currentStep = isMultiStep ? (steps[stepIndex] ?? steps[0]) : null;
  const totalSteps = isMultiStep ? steps.length : 0;
  const isLastStep = isMultiStep ? stepIndex >= totalSteps - 1 : true;

  const dialogTitle = isMultiStep
    ? (title ?? currentStep!.title)
    : (title ?? (lang === 'ar' ? 'معلومة توضيحية' : 'Helpful hint'));

  return (
    <>
      <button
        type="button"
        aria-label={buttonLabel}
        title={buttonLabel}
        onClick={handleOpen}
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary transition hover:bg-primary hover:text-white ${className}`}
      >
        <Info size={14} />
      </button>

      {open && (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={dialogTitle}
          className="!max-w-lg"
          footer={
            isMultiStep ? (
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {steps.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`${idx + 1} / ${totalSteps}`}
                      onClick={() => setStepIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === stepIndex ? 'w-5 bg-primary' : 'w-2 bg-line hover:bg-ink-soft'
                      }`}
                    />
                  ))}
                  <span dir="ltr" className="ms-2 text-xs font-bold tabular-nums text-ink-soft">
                    {stepIndex + 1} / {totalSteps}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {stepIndex > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!min-h-9 !px-3"
                      onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    >
                      {lang === 'ar' ? 'السابق' : 'Previous'}
                    </Button>
                  )}
                  {!isLastStep ? (
                    <Button
                      type="button"
                      className="!min-h-9 !px-4"
                      onClick={() => setStepIndex((i) => Math.min(totalSteps - 1, i + 1))}
                    >
                      {lang === 'ar' ? 'التالي' : 'Next'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="!min-h-9 !px-4"
                      onClick={() => setOpen(false)}
                    >
                      {lang === 'ar' ? 'حسناً' : 'Got it'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Button type="button" className="!min-h-9 !px-4" onClick={() => setOpen(false)}>
                {lang === 'ar' ? 'حسناً' : 'Got it'}
              </Button>
            )
          }
        >
          {isMultiStep && currentStep ? (
            <div className="rounded-xl border border-line bg-background p-4">
              {title && title !== currentStep.title && (
                <h3 className="mb-1.5 text-base font-bold text-ink">{currentStep.title}</h3>
              )}
              <p className="text-sm leading-relaxed text-ink-soft">{currentStep.body}</p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-ink-soft">{hint}</p>
          )}
        </Dialog>
      )}
    </>
  );
}
