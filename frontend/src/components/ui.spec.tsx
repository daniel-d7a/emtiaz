import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, ErrorBox, Input, Progress } from './ui';

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
