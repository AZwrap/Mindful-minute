import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import {
  createAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  AudioPlayer,
} from 'expo-audio';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react-native';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface Props {
  onRecordingComplete: (uri: string | null) => void;
  existingUri?: string | null;
}

export interface AudioRecorderHandle {
  /** If a recording is in progress, stop it and return the URI. Otherwise return the current URI. */
  stopIfRecording: () => Promise<string | null>;
}

const BAR_COUNT = 24;
const METER_DB_MIN = -60;
const METER_DB_MAX = 0;

const AudioRecorder = forwardRef<AudioRecorderHandle, Props>(function AudioRecorder(
  { onRecordingComplete, existingUri },
  ref,
) {
  const palette = useSharedPalette();
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 100);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [uri, setUri] = useState<string | null>(existingUri || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [meterHistory, setMeterHistory] = useState<number[]>(() => Array(BAR_COUNT).fill(0));

  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
      if (player) player.remove();
    };
  }, [player, timer]);

  useEffect(() => {
    if (!recorderState.isRecording) {
      setMeterHistory(Array(BAR_COUNT).fill(0));
      return;
    }
    const m = recorderState.metering;
    if (m === undefined || !Number.isFinite(m)) return;
    const clamped = Math.max(METER_DB_MIN, Math.min(METER_DB_MAX, m));
    const norm = (clamped - METER_DB_MIN) / (METER_DB_MAX - METER_DB_MIN);
    setMeterHistory((prev) => [...prev.slice(1), norm]);
  }, [recorderState.metering, recorderState.isRecording]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert("Permission Required", "Please allow microphone access to record.");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setSeconds(0);
      setTimer(setInterval(() => setSeconds(s => s + 1), 1000));
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (timer) clearInterval(timer);
    setTimer(null);

    await recorder.stop();
    const newUri = recorder.uri;
    setUri(newUri);
    onRecordingComplete(newUri);
    return newUri;
  };

  useImperativeHandle(
    ref,
    () => ({
      async stopIfRecording() {
        if (recorderState.isRecording) {
          return stopRecording();
        }
        return uri;
      },
    }),
    [recorderState.isRecording, uri],
  );

  const playSound = async () => {
    if (!uri) return;
    try {
      const newPlayer = createAudioPlayer({ uri });
      setPlayer(newPlayer);
      setIsPlaying(true);
      newPlayer.play();

      newPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newPlayer.remove();
        }
      });
    } catch (error) {
      console.error("Playback failed", error);
    }
  };

  const stopSound = async () => {
    if (player) {
      player.pause();
      player.seekTo(0);
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setUri(null);
    onRecordingComplete(null);
    setSeconds(0);
  };

  // 1. Idle State (No recording, No file)
  if (!recorderState.isRecording && !uri) {
    return (
      <TouchableOpacity onPress={startRecording} style={[styles.btn, { backgroundColor: palette.card }]}>
        <Mic size={24} color={palette.text} />
      </TouchableOpacity>
    );
  }

  // 2. Recording State
  if (recorderState.isRecording) {
    return (
      <View style={[styles.container, { backgroundColor: palette.card, flex: 1 }]}>
        <Text style={{ color: '#EF4444', fontWeight: '600' }}>{formatTime(seconds)}</Text>
        <View style={styles.waveform}>
          {meterHistory.map((amp, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { height: 4 + amp * 24, backgroundColor: '#EF4444' },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
            <Square size={20} color="#FFF" fill="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Review State (Has file)
  return (
    <View style={[styles.container, { backgroundColor: palette.card, justifyContent: 'space-between' }]}>
      <TouchableOpacity onPress={isPlaying ? stopSound : playSound}>
        {isPlaying ? <Pause size={24} color={palette.accent} /> : <Play size={24} color={palette.accent} />}
      </TouchableOpacity>

      <Text style={{ color: palette.text, fontSize: 14 }}>Audio Recorded</Text>

      <TouchableOpacity onPress={deleteRecording}>
        <Trash2 size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
});

export default AudioRecorder;

const styles = StyleSheet.create({
  btn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 16,
    minWidth: 150,
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
