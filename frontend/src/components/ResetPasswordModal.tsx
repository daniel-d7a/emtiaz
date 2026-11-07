import { useState } from 'react';
import { Check, Copy, KeyRound, MessageCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, type ResetUserPasswordResultDto } from '../lib/api';
import { useLang } from '../lib/i18n';
import { Button, Dialog } from './ui';

export interface ResetTargetUser {
  id: string;
  name: string;
  phoneNumber?: string | null;
}

export function ResetPasswordModal({
  user,
  onClose,
}: {
  user: ResetTargetUser | null;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResetUserPasswordResultDto | null>(null);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const handleReset = async () => {
    setBusy(true);
    try {
      const res = await adminApi.resetUserPassword(user.id);
      setResult(res);
      toast.success(t('resetPasswordSuccess'));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setCopied(false);
    onClose();
  };

  const copyPassword = async () => {
    if (!result?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      toast.success(t('passwordCopied'));
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const phoneForWhatsapp = (result?.userPhone || user.phoneNumber || '').replace(/\D/g, '');
  const whatsappMessage =
    lang === 'ar'
      ? `مرحباً ${result?.userName ?? user.name}،\nتمت إعادة تعيين كلمة المرور لحسابك في منصة امتياز بنجاح.\n\nبيانات تسجيل الدخول:\n${result?.userPhone ? `الهاتف: ${result.userPhone}\n` : ''}كلمة المرور المؤقتة: ${result?.temporaryPassword ?? ''}\n\nيرجى تسجيل الدخول وتغيير كلمة المرور فوراً.`
      : `Hello ${result?.userName ?? user.name},\nYour password for Emtiaz platform has been reset successfully.\n\nLogin credentials:\n${result?.userPhone ? `Phone: ${result.userPhone}\n` : ''}Temporary Password: ${result?.temporaryPassword ?? ''}\n\nPlease sign in and set your new password immediately.`;

  const whatsappUrl = phoneForWhatsapp
    ? `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title={result ? t('resetPasswordSuccess') : t('resetPassword')}
      className="max-w-md"
      footer={
        result ? (
          <Button variant="ghost" onClick={handleClose}>
            {t('close')}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleReset}
              disabled={busy}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <KeyRound size={16} className="me-1.5" />
              {busy ? '...' : t('resetPassword')}
            </Button>
          </>
        )
      }
    >
      {!result ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-amber-900 dark:text-amber-200">
            <ShieldAlert size={20} className="shrink-0 mt-0.5 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold">{user.name}</p>
              {user.phoneNumber && (
                <p className="text-xs text-ink-soft mt-0.5" dir="ltr">
                  {user.phoneNumber}
                </p>
              )}
              <p className="mt-2 text-ink-soft leading-relaxed">
                {t('resetPasswordConfirm')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft leading-relaxed">
            {t('generatedCredentialsNotice')}
          </p>

          <div className="rounded-xl border border-line bg-surface p-4 text-center">
            <span className="block text-xs font-semibold text-ink-soft mb-1">
              {t('temporaryPassword')}
            </span>
            <div className="flex items-center justify-center gap-2">
              <code
                className="select-all rounded-lg bg-background px-3 py-1.5 font-mono text-lg font-bold text-primary tracking-wider"
                dir="ltr"
              >
                {result.temporaryPassword}
              </code>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={copyPassword}
              className="flex-1 justify-center"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-600 me-1.5" />
                  <span className="text-emerald-700 font-bold">{t('passwordCopied')}</span>
                </>
              ) : (
                <>
                  <Copy size={16} className="me-1.5" />
                  <span>{t('copyPassword')}</span>
                </>
              )}
            </Button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
            >
              <MessageCircle size={16} className="me-1.5" />
              <span>{t('sendViaWhatsapp')}</span>
            </a>
          </div>
        </div>
      )}
    </Dialog>
  );
}
