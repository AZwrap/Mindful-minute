import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react-native';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface Props {
  onRecordingComplete: (uri: string | null) => void;
  existingUri?: string | null;
}

export default function AudioRecorder({ onRecordingComplete, existingUri }: Props) {
  const palette = useSharedPalette();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [uri, setUri] = useState<string | null>(existingUri || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState("00:00");
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timer) clearInterval(timer);
      if (sound) sound.unloadAsync();
    };
  }, [sound, timer]);

  // Format time helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert("Permission Required", "Please allow microphone access to record.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setSeconds(0);
      setTimer(setInterval(() => setSeconds(s => s + 1), 1000));
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    if (timer) clearInterval(timer);
    setRecording(null);
    await recording.stopAndUnloadAsync();
    
    const newUri = recording.getURI();
    setUri(newUri);
    onRecordingComplete(newUri);
  };

  const playSound = async () => {
    if (!uri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      setSound(sound);
      setIsPlaying(true);
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error("Playback failed", error);
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setUri(null);
    onRecordingComplete(null);
    setSeconds(0);
  };

  // --- UI RENDER ---
  
  // 1. Idle State (No recording, No file)
  if (!recording && !uri) {
    return (
      <TouchableOpacity onPress={startRecording} style={[styles.btn, { backgroundColor: palette.card }]}>
        <Mic size={24} color={palette.text} />
      </TouchableOpacity>
    );
  }

  // 2. Recording State
  if (recording) {
    return (
      <View style={[styles.container, { backgroundColor: palette.card }]}>
        <Text style={{ color: '#EF4444', fontWeight: '600' }}>{formatTime(seconds)}</Text>
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
}

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
  }
});