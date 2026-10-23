import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Input } from './ui';

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
});
