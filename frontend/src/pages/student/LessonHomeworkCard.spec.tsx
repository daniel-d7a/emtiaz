import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../../lib/i18n';
import { HomeworkItemCard, LessonHomeworkCard, formatDueDateCountdown } from './LessonHomeworkCard';
import { studentApi } from '../../lib/api';
import type { StudentHomeworkDto } from '../../../../shared/api';

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

describe('Student Lesson Homework Card', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatDueDateCountdown', () => {
    it('returns null for empty due date', () => {
      expect(formatDueDateCountdown(null)).toBeNull();
      expect(formatDueDateCountdown(undefined)).toBeNull();
    });

    it('returns overdue for past due date', () => {
      const past = new Date(Date.now() - 3600 * 1000).toISOString();
      const res = formatDueDateCountdown(past, 'ar');
      expect(res?.isPast).toBe(true);
      expect(res?.text).toBe('متأخر');

      const resEn = formatDueDateCountdown(past, 'en');
      expect(resEn?.text).toBe('Overdue');
    });

    it('returns tomorrow for due date within 24-48 hours', () => {
      const tomorrow = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
      const res = formatDueDateCountdown(tomorrow, 'ar');
      expect(res?.isPast).toBe(false);
      expect(res?.text).toBe('ينتهي غداً');
    });

    it('returns 2 days for due date within 48-72 hours', () => {
      const in2Days = new Date(Date.now() + 50 * 3600 * 1000).toISOString();
      const res = formatDueDateCountdown(in2Days, 'ar');
      expect(res?.isPast).toBe(false);
      expect(res?.text).toBe('ينتهي بعد يومين');
    });
  });

  describe('LessonHomeworkCard integration', () => {
    it('fetches homework and renders assignment details with reference attachment and download link', async () => {
      const mockHw: StudentHomeworkDto[] = [
        {
          id: 'hw-101',
          groupId: 'g-1',
          lessonId: 'l-1',
          title: 'Physics Homework 1',
          instructions: 'Solve questions 1 through 5 in the workbook',
          maxScore: 10,
          attachmentType: 'PDF',
          r2ObjectKey: 'homework/physics1.pdf',
          url: null,
          fileSizeBytes: 2048,
          mimeType: 'application/pdf',
          dueDate: new Date(Date.now() + 86400 * 1000 * 2).toISOString(),
          displayOrder: 0,
          createdAt: new Date().toISOString(),
          submission: null,
        },
      ];

      vi.spyOn(studentApi, 'getLessonHomework').mockResolvedValue(mockHw);

      renderWithProviders(<LessonHomeworkCard groupId="g-1" lessonId="l-1" />);

      expect(await screen.findByText('Physics Homework 1')).toBeTruthy();
      expect(screen.getByText('Solve questions 1 through 5 in the workbook')).toBeTruthy();
      expect(screen.getByText(/10/)).toBeTruthy();
      expect(screen.getByText(/لم يسلّم/i)).toBeTruthy();
      expect(screen.getByText(/تنزيل/i)).toBeTruthy();
      expect(screen.getByTestId('due-countdown-badge')).toBeTruthy();
    });

    it('submits text note when TEXT mode is used', async () => {
      const mockHw: StudentHomeworkDto = {
        id: 'hw-102',
        groupId: 'g-1',
        lessonId: 'l-1',
        title: 'Math Problems',
        instructions: 'Show your calculations',
        maxScore: 20,
        attachmentType: 'NONE',
        r2ObjectKey: null,
        url: null,
        fileSizeBytes: null,
        mimeType: null,
        dueDate: null,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        submission: null,
      };

      const submitSpy = vi.spyOn(studentApi, 'submitHomework').mockResolvedValue({
        id: 'sub-1',
        homeworkId: 'hw-102',
        groupId: 'g-1',
        studentId: 'student-1',
        content: 'Calculations result: x = 42',
        attachmentType: 'NONE',
        r2ObjectKey: null,
        url: null,
        fileSizeBytes: null,
        mimeType: null,
        status: 'SUBMITTED',
        isLate: false,
        revisionCount: 0,
        score: null,
        teacherFeedback: null,
        submittedAt: new Date().toISOString(),
        gradedAt: null,
      });

      renderWithProviders(<HomeworkItemCard hw={mockHw} groupId="g-1" lessonId="l-1" />);

      const textarea = screen.getByTestId('homework-content-input');
      fireEvent.change(textarea, { target: { value: 'Calculations result: x = 42' } });

      const submitBtn = screen.getByTestId('submit-homework-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith('g-1', 'hw-102', {
          content: 'Calculations result: x = 42',
          attachmentType: 'NONE',
        });
      });
    });

    it('submits external URL when LINK mode is selected', async () => {
      const mockHw: StudentHomeworkDto = {
        id: 'hw-103',
        groupId: 'g-1',
        lessonId: 'l-1',
        title: 'Biology Project',
        instructions: 'Share your Google Slides presentation',
        maxScore: 15,
        attachmentType: 'NONE',
        r2ObjectKey: null,
        url: null,
        fileSizeBytes: null,
        mimeType: null,
        dueDate: null,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        submission: null,
      };

      const submitSpy = vi.spyOn(studentApi, 'submitHomework').mockResolvedValue({
        id: 'sub-2',
        homeworkId: 'hw-103',
        groupId: 'g-1',
        studentId: 'student-1',
        content: null,
        attachmentType: 'LINK',
        r2ObjectKey: null,
        url: 'https://docs.google.com/presentation/d/123',
        fileSizeBytes: null,
        mimeType: null,
        status: 'SUBMITTED',
        isLate: false,
        revisionCount: 0,
        score: null,
        teacherFeedback: null,
        submittedAt: new Date().toISOString(),
        gradedAt: null,
      });

      renderWithProviders(<HomeworkItemCard hw={mockHw} groupId="g-1" lessonId="l-1" />);

      // Switch to LINK mode
      const linkTab = screen.getByTestId('mode-tab-link');
      fireEvent.click(linkTab);

      const urlInput = screen.getByTestId('homework-url-input');
      fireEvent.change(urlInput, { target: { value: 'https://docs.google.com/presentation/d/123' } });

      const submitBtn = screen.getByTestId('submit-homework-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith('g-1', 'hw-103', {
          content: null,
          url: 'https://docs.google.com/presentation/d/123',
          attachmentType: 'LINK',
        });
      });
    });

    it('validates file size <= 10MB in FILE mode and allows submission', async () => {
      const mockHw: StudentHomeworkDto = {
        id: 'hw-104',
        groupId: 'g-1',
        lessonId: 'l-1',
        title: 'Chemistry Lab Report',
        instructions: 'Upload your lab report PDF',
        maxScore: 10,
        attachmentType: 'NONE',
        r2ObjectKey: null,
        url: null,
        fileSizeBytes: null,
        mimeType: null,
        dueDate: null,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        submission: null,
      };

      const submitSpy = vi.spyOn(studentApi, 'submitHomework').mockResolvedValue({
        id: 'sub-3',
        homeworkId: 'hw-104',
        groupId: 'g-1',
        studentId: 'student-1',
        content: null,
        attachmentType: 'PDF',
        r2ObjectKey: 'submissions/hw-104/report.pdf',
        url: null,
        fileSizeBytes: 1024 * 500,
        mimeType: 'application/pdf',
        status: 'SUBMITTED',
        isLate: false,
        revisionCount: 0,
        score: null,
        teacherFeedback: null,
        submittedAt: new Date().toISOString(),
        gradedAt: null,
      });

      renderWithProviders(<HomeworkItemCard hw={mockHw} groupId="g-1" lessonId="l-1" />);

      // Switch to FILE mode
      const fileTab = screen.getByTestId('mode-tab-file');
      fireEvent.click(fileTab);

      // Select oversized file (> 10MB)
      const fileInput = screen.getByTestId('homework-file-input');
      const hugeFile = new File(['x'.repeat(100)], 'huge.pdf', { type: 'application/pdf' });
      Object.defineProperty(hugeFile, 'size', { value: 11 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [hugeFile] } });

      // Should show validation error
      const errorEl = screen.getByTestId('file-error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('10 ميجابايت');

      // Submit button should be disabled
      const submitBtn = screen.getByTestId('submit-homework-button');
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

      // Select valid file (500KB)
      const validFile = new File(['content'], 'report.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 500 * 1024 });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // Error should be gone and file name visible
      expect(screen.queryByTestId('file-error')).toBeNull();
      expect(screen.getByText('report.pdf')).toBeTruthy();

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith('g-1', 'hw-104', {
          content: null,
          attachmentType: 'PDF',
          r2ObjectKey: 'submissions/hw-104/report.pdf',
          fileSizeBytes: 500 * 1024,
          mimeType: 'application/pdf',
        });
      });
    });

    it('renders REVISION_REQUESTED status with teacher feedback and resubmit button', async () => {
      const mockHw: StudentHomeworkDto = {
        id: 'hw-105',
        groupId: 'g-1',
        lessonId: 'l-1',
        title: 'History Essay',
        instructions: 'Write 500 words about the Silk Road',
        maxScore: 25,
        attachmentType: 'NONE',
        r2ObjectKey: null,
        url: null,
        fileSizeBytes: null,
        mimeType: null,
        dueDate: null,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        submission: {
          id: 'sub-rev',
          homeworkId: 'hw-105',
          groupId: 'g-1',
          studentId: 'student-1',
          content: 'My draft essay',
          attachmentType: 'NONE',
          r2ObjectKey: null,
          url: null,
          fileSizeBytes: null,
          mimeType: null,
          status: 'REVISION_REQUESTED',
          isLate: false,
          revisionCount: 1,
          score: null,
          teacherFeedback: 'Please expand on the Oman trade routes section and resubmit.',
          submittedAt: new Date().toISOString(),
          gradedAt: null,
        },
      };

      renderWithProviders(<HomeworkItemCard hw={mockHw} groupId="g-1" lessonId="l-1" />);

      // Status badge: مطلوب تعديل
      expect(screen.getByText(/مطلوب تعديل/)).toBeTruthy();

      // Teacher feedback prominently displayed
      const feedback = screen.getByTestId('teacher-feedback-callout');
      expect(feedback).toBeTruthy();
      expect(screen.getByText(/Please expand on the Oman trade routes section/)).toBeTruthy();

      // Action button should say "إعادة التسليم"
      expect(screen.getByRole('button', { name: /إعادة التسليم/i })).toBeTruthy();
    });

    it('renders GRADED status with earned score and locks the submission form', () => {
      const mockHw: StudentHomeworkDto = {
        id: 'hw-106',
        groupId: 'g-1',
        lessonId: 'l-1',
        title: 'Grammar Quiz Review',
        instructions: 'Complete exercises',
        maxScore: 10,
        attachmentType: 'NONE',
        r2ObjectKey: null,
        url: null,
        fileSizeBytes: null,
        mimeType: null,
        dueDate: null,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        submission: {
          id: 'sub-graded',
          homeworkId: 'hw-106',
          groupId: 'g-1',
          studentId: 'student-1',
          content: 'Answer 1: A, Answer 2: B',
          attachmentType: 'NONE',
          r2ObjectKey: null,
          url: null,
          fileSizeBytes: null,
          mimeType: null,
          status: 'GRADED',
          isLate: false,
          revisionCount: 0,
          score: 9,
          teacherFeedback: 'Great work! Well done.',
          submittedAt: new Date().toISOString(),
          gradedAt: new Date().toISOString(),
        },
      };

      renderWithProviders(<HomeworkItemCard hw={mockHw} groupId="g-1" lessonId="l-1" />);

      // Status badge shows graded with score: 9/10
      expect(screen.getByText(/مكتمل ومصحح/)).toBeTruthy();
      expect(screen.getByText(/9\/10/)).toBeTruthy();

      // Teacher feedback
      expect(screen.getByText('Great work! Well done.')).toBeTruthy();

      // Form should be locked / hidden (no submit button)
      expect(screen.queryByTestId('submit-homework-button')).toBeNull();
    });
  });
});
