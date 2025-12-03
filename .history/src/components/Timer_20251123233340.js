import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

export default function Timer({ 
  seconds, 
  running, 
  onTick, 
  onDone, 
  showProgress = false,
  totalSeconds 
}) {
  const [left, setLeft] = useState(seconds);
  const intervalRef = useRef(null);
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (onTick) onTick(next);
        if (next === 0) {
          clearInterval(intervalRef.current);
          onDone && onDone();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, onDone, onTick]);

  const min = Math.floor(left / 60);
  const sec = left % 60;
  const formatted = `${min}:${sec.toString().padStart(2, '0')}`;

  return (
    <Text style={{ color: '#6366F1', fontWeight: '600', fontSize: 15 }}>
      {formatted}
    </Text>
  );
    return (
    <View style={styles.timerWrapper}>
      <Text style={[
        styles.timerText,
        { color: running ? '#6366F1' : '#9CA3AF' }
      ]}>
        {formatTime(seconds)}
      </Text>
      {/* Progress could be handled here or in parent */}
    </View>
  );
}
