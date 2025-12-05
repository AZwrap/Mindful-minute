import React from 'react';
import { render, act } from '@testing-library/react-native';
import Timer from '../Timer';

// Use Fake Timers to control time in tests
jest.useFakeTimers();

describe('Timer Component', () => {
  it('renders correctly with initial duration', () => {
    const { getByText } = render(
      <Timer 
        seconds={60}        // Fixed: was duration
        running={false}     // Fixed: was isActive
        onDone={jest.fn()}  // Fixed: was onComplete
      />
    );
    // 60 seconds = 01:00
    expect(getByText('01:00')).toBeTruthy();
  });

  it('counts down when active', () => {
    const { getByText } = render(
      <Timer 
        seconds={60} 
        running={true} 
        onDone={jest.fn()} 
      />
    );

    // Fast-forward 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should now show 59 seconds (00:59)
    expect(getByText('00:59')).toBeTruthy();
  });

  it('triggers onDone when finished', () => {
    const mockDone = jest.fn();
    render(
      <Timer 
        seconds={10} 
        running={true} 
        onDone={mockDone} 
      />
    );

    // Fast-forward past the duration
    act(() => {
      jest.advanceTimersByTime(11000); 
    });

    expect(mockDone).toHaveBeenCalledTimes(1);
  });
});