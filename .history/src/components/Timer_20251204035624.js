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

  // Sync state if prop changes
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setLeft((prev) => {
        const next = Math.max(0, prev - 1);
        // Call onTick directly
        if (onTick) onTick(next);
        
        if (next === 0) {
          clearInterval(intervalRef.current);
          if (onDone) onDone();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onDone, onTick]);

  const min = Math.floor(left / 60);
  const sec = left % 60;
  const formatted = `${min}:${sec.toString().padStart(2, '0')}`;

  return (
    <Text style={{ color: '#6366F1', fontWeight: '600', fontSize: 15 }}>
      {formatted}
    </Text>
  );
}