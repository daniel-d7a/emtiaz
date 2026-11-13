import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ActionMenu, Button, ConfirmDialog, ErrorBox, InfoHint, Input, Progress, Select } from './ui';
import { OnboardingGuide } from './OnboardingGuide';
import { LanguageProvider } from '../lib/i18n';

afterEach(cleanup);

describe('UI primitives', () => {
  it('Button renders and can be disabled', () => {
    render(<Button disabled>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('Input renders with visible label', () => {
    render(<Input label="Phone number" value="" onChange={() => {}} />);
    expect(screen.getByText('Phone number')).toBeTruthy();
  });

  it('Input announces an inline error', () => {
    render(<Input label="Phone number" value="" onChange={() => {}} error="Enter a valid phone number" />);
    expect(screen.getByRole('alert').textContent).toContain('Enter a valid phone number');
  });

  it('ErrorBox is announced as an alert', () => {
    render(<ErrorBox error={new Error('boom')} />);
    expect(screen.getByRole('alert').textContent).toContain('boom');
  });

  it('Progress exposes its value to assistive tech', () => {
    render(<Progress value={42} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('Select forwards ref and preserves value with react-hook-form on blur/change', () => {
    function TestForm() {
      const { register, watch } = useForm<{ courseType: 'ACADEMIC' | 'GENERAL' }>({
        defaultValues: { courseType: 'ACADEMIC' },
      });
      const type = watch('courseType');
      return (
        <div>
          <Select label="Course type" {...register('courseType')}>
            <option value="ACADEMIC">Academic</option>
            <option value="GENERAL">General</option>
          </Select>
          <span data-testid="watched-type">{type}</span>
        </div>
      );
    }

    render(<TestForm />);
    const select = screen.getByLabelText('Course type');
    expect(screen.getByTestId('watched-type').textContent).toBe('ACADEMIC');
    fireEvent.blur(select);
    expect(screen.getByTestId('watched-type').textContent).toBe('ACADEMIC');
    fireEvent.change(select, { target: { value: 'GENERAL' } });
    expect(screen.getByTestId('watched-type').textContent).toBe('GENERAL');
  });
});

describe('ActionMenu', () => {
  it('returns null if items array is empty', () => {
    const { container } = render(<ActionMenu label="More" items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('opens on click, renders items, and triggers action on click', () => {
    const handleAction = vi.fn();
    render(
      <ActionMenu
        label="More actions"
        items={[
          { label: 'Reset password', onClick: handleAction },
          { label: 'Delete', danger: true, onClick: vi.fn() },
        ]}
      />,
    );

    expect(screen.queryByRole('menu')).toBeNull();
    const trigger = screen.getByRole('button', { name: 'More actions' });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeTruthy();
    const item = screen.getByRole('menuitem', { name: 'Reset password' });
    fireEvent.click(item);

    expect(handleAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape key press', () => {
    render(
      <ActionMenu
        label="More actions"
        items={[{ label: 'Edit', onClick: vi.fn() }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('ConfirmDialog', () => {

  it('runs the confirmed action', () => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
    let confirmed = false;
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete student?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { confirmed = true; }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(confirmed).toBe(true);
  });
});

describe('InfoHint', () => {
  it('opens a simple 1-sentence hint dialog when clicked and closes on Got it', () => {
    render(
      <InfoHint
        title="Pacing explained"
        hint="Unlock lessons all at once or week by week for your cohort."
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Pacing explained' });
    fireEvent.click(trigger);

    expect(screen.getByText('Pacing explained')).toBeTruthy();
    expect(screen.getByText('Unlock lessons all at once or week by week for your cohort.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'حسناً' }));
    expect(screen.queryByText('Unlock lessons all at once or week by week for your cohort.')).toBeNull();
  });

  it('steps through a multi-step onboarding modal and closes on the final step', () => {
    render(
      <InfoHint
        title="Courses vs. Groups"
        steps={[
          { title: 'Step 1: Master Course', body: 'Build your curriculum once.' },
          { title: 'Step 2: Student Cohorts', body: 'Create multiple groups per course.' },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Courses vs. Groups' }));

    expect(screen.getByText('Step 1: Master Course')).toBeTruthy();
    expect(screen.getByText('Build your curriculum once.')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));

    expect(screen.getByText('Step 2: Student Cohorts')).toBeTruthy();
    expect(screen.getByText('Create multiple groups per course.')).toBeTruthy();
    expect(screen.getByText('2 / 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'السابق' }));
    expect(screen.getByText('Step 1: Master Course')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    fireEvent.click(screen.getByRole('button', { name: 'حسناً' }));

    expect(screen.queryByText('Step 2: Student Cohorts')).toBeNull();
  });
});

describe('OnboardingGuide', () => {
  it('auto-opens the 3-step welcome tour on first visit and calls PATCH /api/me when finished', async () => {
    localStorage.clear();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/me') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            user: { id: 'teacher-1', name: 'Salim', role: 'TEACHER', onboardingCompletedAt: null },
            onboardingCompletedAt: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/api/me') && init?.method === 'PATCH') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 200 });
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <LanguageProvider>
        <QueryClientProvider client={qc}>
          <OnboardingGuide role="STUDENT" completedSteps={[true, false, false]} />
        </QueryClientProvider>
      </LanguageProvider>,
    );

    expect(screen.getByText('كيف أبدأ؟')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('مرحباً بك في منصة امتياز')).toBeTruthy();
    });

    const nextBtn = await screen.findByRole('button', { name: 'التالي' });
    fireEvent.click(nextBtn);
    fireEvent.click(await screen.findByRole('button', { name: 'التالي' }));
    fireEvent.click(await screen.findByRole('button', { name: 'حسناً' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/me'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ onboardingCompleted: true }),
        }),
      );
    });

    fetchSpy.mockRestore();
  });

  it('hides the checklist once every step is complete', async () => {
    localStorage.clear();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).endsWith('/api/me')) {
        return new Response(
          JSON.stringify({
            user: { id: 'student-1', name: 'Maha', role: 'STUDENT', onboardingCompletedAt: '2026-01-01' },
            onboardingCompletedAt: '2026-01-01',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 200 });
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <LanguageProvider>
        <QueryClientProvider client={qc}>
          <OnboardingGuide role="STUDENT" completedSteps={[true, true, true]} />
        </QueryClientProvider>
      </LanguageProvider>,
    );

    expect(screen.queryByText('كيف أبدأ؟')).toBeNull();
    fetchSpy.mockRestore();
  });
});
