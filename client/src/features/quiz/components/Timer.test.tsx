import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Timer } from './Timer';

describe('Timer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should render initial state as 00:00 and not count if inactive', () => {
    const onTimeChangeSpy = vi.fn();
    render(<Timer isActive={false} onTimeChange={onTimeChangeSpy} />);

    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.queryByTestId('timer-pulse')).not.toBeInTheDocument();

    // Advance time and check that it hasn't changed
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(onTimeChangeSpy).not.toHaveBeenCalled();
  });

  it('should tick and increment time when active', () => {
    const onTimeChangeSpy = vi.fn();
    render(<Timer isActive={true} onTimeChange={onTimeChangeSpy} />);

    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByTestId('timer-pulse')).toBeInTheDocument();

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:01')).toBeInTheDocument();
    expect(onTimeChangeSpy).toHaveBeenCalledWith(1);

    // Advance 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('00:03')).toBeInTheDocument();
    expect(onTimeChangeSpy).toHaveBeenLastCalledWith(3);
  });

  it('should format hours correctly when exceeding 1 hour (3600 seconds)', () => {
    render(<Timer isActive={true} />);

    // Advance 1 hour and 5 seconds (3605 seconds)
    act(() => {
      vi.advanceTimersByTime(3605 * 1000);
    });

    expect(screen.getByText('01:00:05')).toBeInTheDocument();
  });

  it('should stop counting when active status changes to false', () => {
    const onTimeChangeSpy = vi.fn();
    const { rerender } = render(<Timer isActive={true} onTimeChange={onTimeChangeSpy} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('00:02')).toBeInTheDocument();

    // Stop timer
    rerender(<Timer isActive={false} onTimeChange={onTimeChangeSpy} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Time should remain paused at 2 seconds
    expect(screen.getByText('00:02')).toBeInTheDocument();
    expect(onTimeChangeSpy).toHaveBeenCalledTimes(2); // Only called for the first 2 ticks
  });

  it('should cleanup interval upon component unmount to prevent memory leaks', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    
    const { unmount } = render(<Timer isActive={true} />);

    expect(clearIntervalSpy).not.toHaveBeenCalled();

    // Unmount the component
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
