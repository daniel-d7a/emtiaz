import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, Circle, Compass } from 'lucide-react';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { Badge, Button, Card, Dialog } from './ui';
import type { MeResponse } from '../../../shared/api';

export type OnboardingGuideProps = {
  role: 'TEACHER' | 'STUDENT' | 'PARENT';
  completedSteps?: boolean[];
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

export function OnboardingGuide({ role, completedSteps = [] }: OnboardingGuideProps) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });

  const collapseStorageKey = `emtiaz:checklist-collapsed:${role}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(collapseStorageKey) === '1';
    } catch {
      return false;
    }
  });
  const [tourOpen, setTourOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const userId = me?.user?.id;
  const onboardingCompletedAt = me?.onboardingCompletedAt ?? me?.user?.onboardingCompletedAt ?? null;
  const tourSeenKey = userId ? `emtiaz:tour-seen:${userId}` : null;

  const completeTour = useMutation({
    mutationFn: () =>
      api('/api/me', {
        method: 'PATCH',
        body: { onboardingCompleted: true },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['session'] });
    },
  });

  useEffect(() => {
    if (!userId) return;
    if (onboardingCompletedAt) return;
    try {
      if (tourSeenKey && localStorage.getItem(tourSeenKey) === '1') return;
    } catch {
      // ignore storage errors
    }
    ensureDialogPolyfill();
    setStepIndex(0);
    setTourOpen(true);
  }, [userId, onboardingCompletedAt, tourSeenKey]);

  const handleCloseTour = () => {
    setTourOpen(false);
    try {
      if (tourSeenKey) localStorage.setItem(tourSeenKey, '1');
    } catch {
      // ignore storage errors
    }
    if (userId && !onboardingCompletedAt && !completeTour.isPending) {
      completeTour.mutate();
    }
  };

  const handleReopenTour = () => {
    ensureDialogPolyfill();
    setStepIndex(0);
    setTourOpen(true);
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(collapseStorageKey, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const tourTitle =
    role === 'TEACHER'
      ? t('tourWelcomeTeacherTitle')
      : role === 'STUDENT'
        ? t('tourWelcomeStudentTitle')
        : t('tourWelcomeParentTitle');

  const tourSteps =
    role === 'TEACHER'
      ? [
          { title: t('tourTeacherStep1Title'), body: t('tourTeacherStep1Body') },
          { title: t('tourTeacherStep2Title'), body: t('tourTeacherStep2Body') },
          { title: t('tourTeacherStep3Title'), body: t('tourTeacherStep3Body') },
        ]
      : role === 'STUDENT'
        ? [
            { title: t('tourStudentStep1Title'), body: t('tourStudentStep1Body') },
            { title: t('tourStudentStep2Title'), body: t('tourStudentStep2Body') },
            { title: t('tourStudentStep3Title'), body: t('tourStudentStep3Body') },
          ]
        : [
            { title: t('tourParentStep1Title'), body: t('tourParentStep1Body') },
            { title: t('tourParentStep2Title'), body: t('tourParentStep2Body') },
            { title: t('tourParentStep3Title'), body: t('tourParentStep3Body') },
          ];

  const checklistItems: Array<{ label: string; done: boolean; to?: string }> =
    role === 'TEACHER'
      ? [
          { label: t('checklistTeacher1'), done: Boolean(completedSteps[0]), to: '/teacher/courses/new' },
          { label: t('checklistTeacher2'), done: Boolean(completedSteps[1]) },
          { label: t('checklistTeacher3'), done: Boolean(completedSteps[2]) },
        ]
      : role === 'STUDENT'
        ? [
            { label: t('checklistStudent1'), done: Boolean(completedSteps[0]) },
            { label: t('checklistStudent2'), done: Boolean(completedSteps[1]) },
            { label: t('checklistStudent3'), done: Boolean(completedSteps[2]) },
          ]
        : [
            { label: t('checklistParent1'), done: Boolean(completedSteps[0]) },
            { label: t('checklistParent2'), done: Boolean(completedSteps[1]) },
          ];

  const doneCount = checklistItems.filter((item) => item.done).length;
  const currentTourStep = tourSteps[stepIndex] ?? tourSteps[0];
  const isLastStep = stepIndex >= tourSteps.length - 1;

  return (
    <>
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="text-primary" size={20} />
            <h2 className="text-base font-bold text-ink">{t('gettingStarted')}</h2>
            <Badge tone="primary" className="tabular-nums">
              {doneCount}/{checklistItems.length}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="!min-h-9 !px-3 text-xs"
              onClick={handleReopenTour}
            >
              <BookOpen className="inline" size={15} /> {t('platformGuide')}
            </Button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary"
            >
              {collapsed ? (
                <>
                  <ChevronDown size={14} /> {t('showChecklist')}
                </>
              ) : (
                <>
                  <ChevronUp size={14} /> {t('hideChecklist')}
                </>
              )}
            </button>
          </div>
        </div>

        {!collapsed && (
          <ol className="mt-3 flex flex-col gap-2">
            {checklistItems.map((item, idx) => (
              <li
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  {item.done ? (
                    <CheckCircle2 className="shrink-0 text-primary" size={18} />
                  ) : (
                    <Circle className="shrink-0 text-ink-soft" size={18} />
                  )}
                  <span className={item.done ? 'font-semibold text-ink-soft line-through' : 'font-semibold text-ink'}>
                    {idx + 1}. {item.label}
                  </span>
                </div>
                {item.to && !item.done && (
                  <Link
                    to={item.to}
                    className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                  >
                    {t('newCourse')}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {tourOpen && (
        <Dialog
          open={tourOpen}
          onOpenChange={(next) => {
            if (!next) handleCloseTour();
          }}
          title={tourTitle}
          className="!max-w-lg"
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {tourSteps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`${idx + 1} / ${tourSteps.length}`}
                    onClick={() => setStepIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === stepIndex ? 'w-5 bg-primary' : 'w-2 bg-line hover:bg-ink-soft'
                    }`}
                  />
                ))}
                <span dir="ltr" className="ms-2 text-xs font-bold tabular-nums text-ink-soft">
                  {stepIndex + 1} / {tourSteps.length}
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
                    onClick={() => setStepIndex((i) => Math.min(tourSteps.length - 1, i + 1))}
                  >
                    {lang === 'ar' ? 'التالي' : 'Next'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="!min-h-9 !px-4"
                    onClick={handleCloseTour}
                  >
                    {t('gotIt')}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="rounded-xl border border-line bg-background p-4">
            <h3 className="mb-1.5 text-base font-bold text-ink">{currentTourStep.title}</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{currentTourStep.body}</p>
          </div>
        </Dialog>
      )}
    </>
  );
}
