import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createAudioPlayer, AudioPlayer as ExpoAudioPlayer } from 'expo-audio';
import { Play, Pause } from 'lucide-react-native';
import { useSharedPalette } from '../hooks/useSharedPalette';

interface Props {
  uri: string;
}

export default function AudioPlayer({ uri }: Props) {
  const palette = useSharedPalette();
  const [player, setPlayer] = useState<ExpoAudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (player) player.remove();
    };
  }, [player]);

  const handlePlayPause = async () => {
    try {
      if (player) {
        if (isPlaying) {
          player.pause();
          setIsPlaying(false);
        } else {
          player.play();
          setIsPlaying(true);
        }
        return;
      }

      const newPlayer = createAudioPlayer({ uri });
      setPlayer(newPlayer);
      setIsPlaying(true);
      newPlayer.play();

      newPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          newPlayer.pause();
          newPlayer.seekTo(0);
          setIsPlaying(false);
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
