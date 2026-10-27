import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button, ConfirmDialog, ErrorBox, Input, Progress } from './ui';

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
