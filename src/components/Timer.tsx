import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

interface TimerProps {
  seconds: number;
  running: boolean;
  onTick?: (secondsLeft: number) => void;
  onDone?: () => void;
}

export default function Timer({ 
  seconds, 
  running, 
  onTick, 
  onDone
}: TimerProps) {
  const [left, setLeft] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep the latest callback in a ref to avoid stale closures
  const onTickRef = useRef(onTick);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  // 1. Sync state if prop changes
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

// 2. Handle Countdown (Drift-corrected)
  useEffect(() => {
    if (!running || left <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Calculate target end time based on current seconds left
    const endTime = Date.now() + left * 1000;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const secondsRemaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setLeft(secondsRemaining);
      
      if (secondsRemaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // Removed 'left' from dependencies to prevent interval churn
  }, [running]);

// 3. Handle Side Effects (Tick & Done)
  useEffect(() => {
    if (running && left < seconds) {
        if (onTickRef.current) onTickRef.current(left);
    }

    if (left === 0 && running) {
      if (onDone) onDone();
    }
  }, [left, running, seconds]);

  const min = Math.floor(left / 60);
  const sec = left % 60;
  
  const formatted = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  return (
    <Text style={{ color: '#6366F1', fontWeight: '600', fontSize: 15 }}>
      {formatted}
    </Text>
  );
}