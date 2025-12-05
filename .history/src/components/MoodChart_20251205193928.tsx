import React from 'react';
import { View, Text, useColorScheme, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../stores/themeStore';
import { JournalEntry } from '../stores/entriesStore';

interface MoodChartProps {
  entries: JournalEntry[];
}

const MoodChart = ({ entries }: MoodChartProps) => {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  const palette = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? '#1F2937' : '#E2E8F0',
    text: isDark ? '#E5E7EB' : '#0F172A',
    sub: isDark ? '#CBD5E1' : '#334155',
    accent: '#6366F1',
  };

  // Get last 7 days of entries
  const last7DaysEntries = entries.slice(0, 7).reverse();

  if (last7DaysEntries.length < 2) {
    return (
      <View>
        <Text style={{ color: palette.sub, textAlign: 'center', marginTop: 16 }}>
          Not enough data to display a chart. Please add more entries.
        </Text>
      </View>
    );
  }

  // Define mood values strictly
  const moodValues: Record<string, number> = {
    'happy': 5, 'grateful': 5, 'optimistic': 5,
    'focused': 4, 'energized': 4, 'calm': 4,
    'reflective': 3, 'neutral': 3,
    'tired': 2,
    'anxious': 1, 'overwhelmed': 1,
  };

  // Prepare data for the chart
  const chartData = {
    labels: last7DaysEntries.map(entry => {
      // Use date parsing that is safe for different locales
      const d = new Date(entry.date + 'T00:00:00');
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        data: last7DaysEntries.map(entry => {
          const mood = entry.moodTag?.value?.toLowerCase() || '';
          return moodValues[mood] || 3; // Default to neutral (3) if unknown
        }),
      },
    ],
  };

  return (
    <View>
      <LineChart
        data={chartData}
        width={Dimensions.get("window").width - 64} // Responsive width with padding
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1}
        chartConfig={{
          backgroundColor: palette.card,
          backgroundGradientFrom: palette.card,
          backgroundGradientTo: palette.card,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255,' : '0, 0, 0,'} ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#6366F1',
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    </View>
  );
};

export default MoodChart;