import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, GestureResponderEvent } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause } from 'lucide-react-native';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface Props {
  uri: string;
}

const BAR_COUNT = 28;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 24;

// Deterministic pseudo-random bar heights so they don't reshuffle each render.
function generateBarHeights(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const heights: number[] = [];
  let s = hash || 1;
  for (let i = 0; i < BAR_COUNT; i++) {
    s = (s * 1103515245 + 12345) | 0;
    const rand = ((s >>> 0) % 1000) / 1000;
    heights.push(MIN_BAR_HEIGHT + rand * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT));
  }
  return heights;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VoiceNotePlayer({ uri }: Props) {
  const palette = useSharedPalette();
  const player = useAudioPlayer({ uri }, { updateInterval: 10 });
  const status = useAudioPlayerStatus(player);
  const waveformRef = useRef<View>(null);
  const [waveformBox, setWaveformBox] = useState({ pageX: 0, width: 0 });

  const heights = useMemo(() => generateBarHeights(uri), [uri]);

  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const playing = status.playing;

  const togglePlay = () => {
    if (playing) {
      player.pause();
      return;
    }
    if (duration > 0 && currentTime >= duration - 0.1) {
      player.seekTo(0);
    }
    player.play();
  };

  const measureWaveform = () => {
    waveformRef.current?.measure((_x, _y, width, _height, pageX) => {
      setWaveformBox({ pageX, width });
    });
  };

  const handleSeek = (e: GestureResponderEvent) => {
    const { pageX: boxX, width } = waveformBox;
    if (!duration || !width) return;
    const localX = e.nativeEvent.pageX - boxX;
    const ratio = Math.max(0, Math.min(1, localX / width));
    player.seekTo(ratio * duration);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <Pressable
        onPress={togglePlay}
        style={[styles.playBtn, { backgroundColor: palette.accent }]}
      >
        {playing ? (
          <Pause size={16} color="white" fill="white" />
        ) : (
          <Play size={16} color="white" fill="white" />
        )}
      </Pressable>

      <View
        ref={waveformRef}
        style={styles.waveform}
        onLayout={measureWaveform}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleSeek}
        onResponderMove={handleSeek}
        onResponderRelease={handleSeek}
      >
        {heights.map((h, i) => {
          // Bar is colored once the playhead has crossed its center.
          const filled = (i + 0.5) / BAR_COUNT <= progress;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: h,
                  backgroundColor: filled ? palette.accent : palette.subtleText,
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={[styles.time, { color: palette.subtleText }]}>
        {formatTime(playing || currentTime > 0 ? currentTime : duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: MAX_BAR_HEIGHT,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  time: {
    fontSize: 12,
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
