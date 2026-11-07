import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../../lib/i18n';
import { GradingDrawerModal, HomeworkPacingSection, HomeworkSubmissionsDialog } from './HomeworkGrading';
import { teacherApi } from '../../lib/api';
import type { HomeworkRosterSummaryDto, HomeworkDto, HomeworkSubmissionDto } from '../../../../shared/api';

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

describe('Teacher Homework UI & Grading', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // HTMLDialogElement showModal polyfill for vitest jsdom
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  describe('HomeworkPacingSection', () => {
    it('renders lessons and displays homework with submissions button', async () => {
      const mockHw: HomeworkDto[] = [
        {
          id: 'hw-1',
          groupId: 'group-1',
          lessonId: 'l-1',
          title: 'Forces & Motion Problems',
          instructions: 'Solve questions 1-5',
          maxScore: 10,
          attachmentType: 'PDF',
          r2ObjectKey: 'storage/hw-1.pdf',
          url: null,
          fileSizeBytes: 1024,
          mimeType: 'application/pdf',
          dueDate: '2026-11-15T23:59:59.000Z',
          isHidden: false,
          displayOrder: 0,
          createdAt: '2026-11-01T00:00:00Z',
        },
      ];

      vi.spyOn(teacherApi, 'getLessonHomework').mockResolvedValue(mockHw);
      const onOpenSubmissions = vi.fn();

      renderWithProviders(
        <HomeworkPacingSection
          groupId="group-1"
          lessons={[{ id: 'l-1', title: 'Lesson 1: Newton Laws' }]}
          onOpenSubmissions={onOpenSubmissions}
        />,
      );

      expect(await screen.findByText(/Lesson 1: Newton Laws/)).toBeTruthy();
      expect(await screen.findByText('Forces & Motion Problems')).toBeTruthy();

      const submissionsBtn = screen.getByRole('button', { name: /الإجابات|Submissions/i });
      fireEvent.click(submissionsBtn);

      expect(onOpenSubmissions).toHaveBeenCalledWith({
        id: 'hw-1',
        title: 'Forces & Motion Problems',
        maxScore: 10,
      });
    });
  });

  describe('HomeworkSubmissionsDialog', () => {
    it('renders aggregate stats pills and student roster with status badges', async () => {
      const mockRosterSummary: HomeworkRosterSummaryDto = {
        homework: {
          id: 'hw-1',
          groupId: 'group-1',
          lessonId: 'l-1',
          title: 'Forces & Motion Problems',
          instructions: 'Solve questions 1-5',
          maxScore: 10,
          attachmentType: 'NONE',
          r2ObjectKey: null,
          url: null,
          fileSizeBytes: null,
          mimeType: null,
          dueDate: null,
          isHidden: false,
          displayOrder: 0,
          createdAt: '2026-11-01T00:00:00Z',
        },
        stats: {
          totalEnrolled: 25,
          submitted: 18,
          graded: 12,
          pendingReview: 5,
          revisionRequested: 1,
          notSubmitted: 7,
          late: 3,
        },
        submissions: [
          {
            studentId: 's-1',
            studentName: 'Ahmed Al-Busaidi',
            submission: {
              id: 'sub-1',
              homeworkId: 'hw-1',
              groupId: 'group-1',
              studentId: 's-1',
              studentName: 'Ahmed Al-Busaidi',
              status: 'SUBMITTED',
              content: 'My physics homework solution',
              attachmentType: 'PDF',
              r2ObjectKey: 'sub/doc.pdf',
              url: null,
              fileSizeBytes: 2048,
              mimeType: 'application/pdf',
              submittedAt: '2026-11-10T14:30:00Z',
              score: null,
              teacherFeedback: null,
              gradedAt: null,
              revisionCount: 0,
              isLate: true,
            },
          },
        ],
      };

      vi.spyOn(teacherApi, 'getHomeworkSubmissions').mockResolvedValue(mockRosterSummary);

      renderWithProviders(
        <HomeworkSubmissionsDialog
          groupId="group-1"
          homeworkId="hw-1"
          title="Forces & Motion Problems"
          maxScore={10}
          onClose={() => {}}
        />,
      );

      // Verify stats pills render values
      expect(await screen.findByText('25')).toBeTruthy();
      expect(await screen.findByText('18')).toBeTruthy();
      expect(await screen.findByText('12')).toBeTruthy();
      expect(await screen.findByText('5')).toBeTruthy();
      expect(await screen.findByText('7')).toBeTruthy();

      // Verify student row
      expect(await screen.findByText('Ahmed Al-Busaidi')).toBeTruthy();
      expect(screen.getByRole('button', { name: /تصحيح|مراجعة|Grade \/ Review/i })).toBeTruthy();
    });
  });

  describe('GradingDrawerModal', () => {
    const studentSubmission: HomeworkSubmissionDto = {
      id: 'sub-2',
      homeworkId: 'hw-1',
      groupId: 'group-1',
      studentId: 's-1',
      studentName: 'Fatima Al-Hinai',
      status: 'SUBMITTED',
      content: 'Completed all steps in detail.',
      attachmentType: 'LINK',
      r2ObjectKey: null,
      url: 'https://docs.google.com/document/d/xyz',
      fileSizeBytes: null,
      mimeType: null,
      submittedAt: '2026-11-10T12:00:00Z',
      score: null,
      teacherFeedback: null,
      gradedAt: null,
      revisionCount: 1,
      isLate: false,
    };

    it('renders submission details and handles Save Grade action', async () => {
      const gradeSpy = vi.spyOn(teacherApi, 'gradeHomeworkSubmission').mockResolvedValue({
        ...studentSubmission,
        status: 'GRADED',
        score: 9,
        teacherFeedback: 'Great explanation!',
        gradedAt: '2026-11-11T10:00:00Z',
      });

      const onSuccess = vi.fn();
      const onClose = vi.fn();

      renderWithProviders(
        <GradingDrawerModal
          groupId="group-1"
          homeworkId="hw-1"
          maxScore={10}
          studentName="Fatima Al-Hinai"
          submission={studentSubmission}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      // Verify student details and content
      expect(screen.getByText(/Fatima Al-Hinai/)).toBeTruthy();
      expect(screen.getByText('Completed all steps in detail.')).toBeTruthy();
      const link = screen.getByRole('link', { name: /فتح الرابط الخارجي|Open external link/i });
      expect(link.getAttribute('href')).toBe('https://docs.google.com/document/d/xyz');

      // Enter score (must be integer 0-10)
      const scoreInput = screen.getByLabelText(/الدرجة|Score/i);
      fireEvent.change(scoreInput, { target: { value: '9' } });

      // Enter feedback
      const feedbackInput = screen.getByLabelText(/ملاحظات|Feedback/i);
      fireEvent.change(feedbackInput, { target: { value: 'Great explanation!' } });

      // Click Save Grade
      const saveGradeBtn = screen.getByRole('button', { name: /حفظ الدرجة|Save Grade/i });
      fireEvent.click(saveGradeBtn);

      await waitFor(() => {
        expect(gradeSpy).toHaveBeenCalledWith('group-1', 'hw-1', 's-1', {
          action: 'SAVE_GRADE',
          score: 9,
          teacherFeedback: 'Great explanation!',
        });
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('handles Request Revision action and requires feedback', async () => {
      const gradeSpy = vi.spyOn(teacherApi, 'gradeHomeworkSubmission').mockResolvedValue({
        ...studentSubmission,
        status: 'REVISION_REQUESTED',
        teacherFeedback: 'Please rework step 3 with full formulas.',
        gradedAt: '2026-11-11T10:00:00Z',
      });

      const onSuccess = vi.fn();
      const onClose = vi.fn();

      renderWithProviders(
        <GradingDrawerModal
          groupId="group-1"
          homeworkId="hw-1"
          maxScore={10}
          studentName="Fatima Al-Hinai"
          submission={studentSubmission}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );

      // Enter feedback for revision
      const feedbackInput = screen.getByLabelText(/ملاحظات|Feedback/i);
      fireEvent.change(feedbackInput, { target: { value: 'Please rework step 3 with full formulas.' } });

      // Click Request Revision
      const requestRevisionBtn = screen.getByRole('button', { name: /طلب تعديل|Request Revision/i });
      fireEvent.click(requestRevisionBtn);

      await waitFor(() => {
        expect(gradeSpy).toHaveBeenCalledWith('group-1', 'hw-1', 's-1', {
          action: 'REQUEST_REVISION',
          teacherFeedback: 'Please rework step 3 with full formulas.',
        });
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
