import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders an action when provided', async () => {
    const onAction = vi.fn();
    render(<EmptyState title="No rows" message="Add data first." actionLabel="Add row" onAction={onAction} />);

    expect(screen.getByRole('heading', { name: 'No rows' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add row/i }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
