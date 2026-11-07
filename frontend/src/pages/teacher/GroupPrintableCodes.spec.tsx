import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../lib/i18n';
import { PrintableEntryCard, PrintQrCodesDialog } from './Group';
import type { Group, GroupEntryCode } from '../../../../shared/api';

afterEach(cleanup);

const mockGroup: Group = {
  id: 'g-1',
  courseId: 'c-1',
  name: 'Sun/Tue 4PM Batch',
  joinCode: 'OM4829',
  days: 'Sun,Tue',
  time: '16:00',
  whatsappMessage: null,
  requiresEntryCode: true,
  unlockAllByDefault: true,
  isActive: true,
  createdAt: '2026-11-01T00:00:00Z',
};

const mockCodes: GroupEntryCode[] = [
  {
    id: 'code-1',
    groupId: 'g-1',
    code: 'CODE-1234',
    maxUses: 10,
    usedCount: 2,
    usedUp: false,
    createdAt: '2026-11-01T00:00:00Z',
    uses: [],
  },
  {
    id: 'code-2',
    groupId: 'g-1',
    code: 'CODE-9999',
    maxUses: 5,
    usedCount: 5,
    usedUp: true,
    createdAt: '2026-11-01T00:00:00Z',
    uses: [],
  },
];

describe('Printable Entry Codes', () => {
  it('renders PrintableEntryCard with QR code, codes, and instruction', async () => {
    render(
      <LanguageProvider>
        <PrintableEntryCard
          groupName={mockGroup.name}
          courseTitle="Physics Grade 12"
          joinCode={mockGroup.joinCode}
          entryCode="CODE-1234"
          joinUrl="http://localhost:5173/join/OM4829?entry=CODE-1234"
          maxUses={10}
          remainingUses={8}
          usedUp={false}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Physics Grade 12')).toBeTruthy();
    expect(screen.getByText('Sun/Tue 4PM Batch')).toBeTruthy();
    expect(screen.getByText('CODE-1234')).toBeTruthy();
    expect(screen.getByText('OM4829')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('امسح الرمز أو ادخل الكود للانضمام إلى المجموعة')).toBeTruthy();

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    });
  });

  it('renders PrintQrCodesDialog and triggers window.print on print button click', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onOpenChange = vi.fn();

    // HTMLDialogElement showModal polyfill for vitest jsdom
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });

    render(
      <LanguageProvider>
        <PrintQrCodesDialog
          open={true}
          onOpenChange={onOpenChange}
          group={mockGroup}
          courseTitle="Physics Grade 12"
          codes={mockCodes}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('CODE-1234')).toBeTruthy();

    const printBtn = screen.getByRole('button', { name: /طباعة|Print/ });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();

    printSpy.mockRestore();
  });
});
