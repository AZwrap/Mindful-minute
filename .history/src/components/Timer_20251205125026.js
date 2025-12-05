import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

export default function Timer({ 
  seconds, 
  running, 
  onTick, 
  onDone
}) {
  const [left, setLeft] = useState(seconds);
  const intervalRef = useRef(null);

  // 1. Sync state if prop changes (Reset)
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  // 2. Handle Countdown (The "Tick")
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
  }, [running, left]); // Re-evaluates when running changes or left hits 0

  // 3. Handle Side Effects (Tick & Done) - separated from render/state updates
  useEffect(() => {
    // Call onTick whenever 'left' updates (but skip the initial mount if desired, or keep it)
    if (running && left < seconds) {
        if (onTick) onTick(left);
    }

    // Check for completion
    if (left === 0 && running) {
      if (onDone) onDone();
    }
  }, [left, running, seconds]); // Dependencies ensure this runs only after state updates

  const min = Math.floor(left / 60);
  const sec = left % 60;
  
  // FIXED: Pad minutes with 0 (01:00 instead of 1:00) to match tests & look better
  const formatted = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  return (
    <Text style={{ color: '#6366F1', fontWeight: '600', fontSize: 15 }}>
      {formatted}
    </Text>
  );
}