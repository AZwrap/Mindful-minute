import React from 'react';
import { render, act } from '@testing-library/react-native';
import Timer from '../Timer';

// Use Fake Timers to control time in tests
jest.useFakeTimers();

describe('Timer Component', () => {
  it('renders correctly with initial duration', () => {
    const { getByText } = render(
      <Timer 
        duration={60} 
        isActive={false} 
        onComplete={jest.fn()} 
      />
    );
    // 60 seconds = 01:00
    expect(getByText('01:00')).toBeTruthy();
  });

  it('counts down when active', () => {
    const { getByText } = render(
      <Timer 
        duration={60} 
        isActive={true} 
        onComplete={jest.fn()} 
      />
    );

    // Fast-forward 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should now show 59 seconds (00:59)
    expect(getByText('00:59')).toBeTruthy();
  });

  it('triggers onComplete when finished', () => {
    const mockComplete = jest.fn();
    render(
      <Timer 
        duration={10} 
        isActive={true} 
        onComplete={mockComplete} 
      />
    );

    // Fast-forward past the duration
    act(() => {
      jest.advanceTimersByTime(11000); 
    });

    expect(mockComplete).toHaveBeenCalledTimes(1);
  });
});