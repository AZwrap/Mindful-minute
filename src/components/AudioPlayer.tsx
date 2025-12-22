import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause } from 'lucide-react-native';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface Props {
  uri: string;
}

export default function AudioPlayer({ uri }: Props) {
  const palette = useSharedPalette();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup when leaving the screen
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const handlePlayPause = async () => {
    try {
      // 1. If sound exists, just toggle
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // 2. If no sound loaded, load it now
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);

      // Reset when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.setPositionAsync(0);
        }
      });

    } catch (error) {
      console.error("Audio playback error:", error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <TouchableOpacity onPress={handlePlayPause} style={[styles.btn, { backgroundColor: palette.accent }]}>
        {isPlaying ? (
            <Pause size={18} color="#FFF" fill="#FFF" />
        ) : (
            <Play size={18} color="#FFF" fill="#FFF" />
        )}
      </TouchableOpacity>
      
      <Text style={{ color: palette.text, fontWeight: '500', marginLeft: 12 }}>
        Voice Note
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});