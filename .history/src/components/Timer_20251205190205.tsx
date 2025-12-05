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

  // 1. Sync state if prop changes
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  // 2. Handle Countdown
  useEffect(() => {
    if (!running || left <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setLeft((prev) => {
        const next = Math.max(0, prev - 1);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, left]);

  // 3. Handle Side Effects (Tick & Done)
  useEffect(() => {
    if (running && left < seconds) {
        if (onTick) onTick(left);
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