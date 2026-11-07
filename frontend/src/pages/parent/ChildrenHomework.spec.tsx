import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../../lib/i18n';
import { ChildHomeworkSection } from './Children';
import { parentApi } from '../../lib/api';
import type { ParentChildHomeworkDto } from '../../../../shared/api';

afterEach(cleanup);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>,
  );
}

describe('Parent Portal Child Homework Monitoring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders child homework assignments with status badges, score, and urgent warning badge', async () => {
    const mockHomework: ParentChildHomeworkDto[] = [
      {
        id: 'hw-child-1',
        title: 'Math Equations Sheet',
        instructions: 'Complete exercises on page 34',
        maxScore: 10,
        groupName: 'Grade 10 Mathematics - Cohort A',
        dueDate: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        isUrgent: true,
        submission: null,
      },
      {
        id: 'hw-child-2',
        title: 'Arabic Poetry Analysis',
        instructions: 'Analyze the poem verses',
        maxScore: 15,
        groupName: 'Arabic Literature',
        dueDate: '2026-11-20T10:00:00Z',
        isUrgent: false,
        submission: {
          status: 'GRADED',
          score: 14,
          teacherFeedback: 'ممتاز جداً وتحليل رائع',
          submittedAt: '2026-11-05T12:00:00Z',
          isLate: false,
        },
      },
      {
        id: 'hw-child-3',
        title: 'Physics Lab Motion',
        instructions: 'Graph acceleration vs time',
        maxScore: 10,
        groupName: 'Physics 101',
        dueDate: null,
        isUrgent: false,
        submission: {
          status: 'REVISION_REQUESTED',
          score: null,
          teacherFeedback: 'يرجى تصحيح محور السينات في الرسم البياني',
          submittedAt: '2026-11-06T15:00:00Z',
          isLate: false,
        },
      },
    ];

    vi.spyOn(parentApi, 'getChildHomework').mockResolvedValue(mockHomework);

    renderWithProviders(<ChildHomeworkSection studentId="child-123" />);

    // Wait for data to load
    expect(await screen.findByText('Math Equations Sheet')).toBeTruthy();

    // Renders section heading and count badge
    expect(screen.getByText('الواجبات المنزلية')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    // Assignment 1: urgent warning pill and not submitted badge
    expect(screen.getByText('Math Equations Sheet')).toBeTruthy();
    expect(screen.getByText('Grade 10 Mathematics - Cohort A')).toBeTruthy();
    expect(screen.getByTestId('urgent-homework-warning')).toBeTruthy();
    expect(screen.getByText(/⚠️ موعد التسليم قريب أو متأخر/)).toBeTruthy();
    expect(screen.getByText('لم يسلّم')).toBeTruthy();

    // Assignment 2: graded with score and teacher feedback
    expect(screen.getByText('Arabic Poetry Analysis')).toBeTruthy();
    expect(screen.getByText(/مكتمل ومصحح \(14\/15\)/)).toBeTruthy();
    expect(screen.getByText(/الدرجة المحصلة: 14 من 15/)).toBeTruthy();
    expect(screen.getByText('ممتاز جداً وتحليل رائع')).toBeTruthy();

    // Assignment 3: revision requested
    expect(screen.getByText('Physics Lab Motion')).toBeTruthy();
    expect(screen.getByText('مطلوب تعديل')).toBeTruthy();
    expect(screen.getByText('يرجى تصحيح محور السينات في الرسم البياني')).toBeTruthy();
  });

  it('displays empty state when child has no homework assignments', async () => {
    vi.spyOn(parentApi, 'getChildHomework').mockResolvedValue([]);

    renderWithProviders(<ChildHomeworkSection studentId="child-empty" />);

    expect(await screen.findByText('لا توجد واجبات مسندة لهذا الطالب بعد.')).toBeTruthy();
  });
});
