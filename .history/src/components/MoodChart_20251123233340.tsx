
import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../stores/themeStore';

const MoodChart = ({ entries }) => {
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

  // Prepare data for the chart
  const chartData = {
    labels: last7DaysEntries.map(entry => {
      const d = new Date(entry.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        data: last7DaysEntries.map(entry => {
          // Assign a numerical value to each mood for charting
          const moodValue = {
            'happy': 5,
            'grateful': 5,
            'optimistic': 5,
            'focused': 4,
            'energized': 4,
            'calm': 4,
            'reflective': 3,
            'neutral': 3,
            'tired': 2,
            'anxious': 1,
            'overwhelmed': 1,
          }[entry.moodTag?.value] || 3; // Default to neutral
          return moodValue;
        }),
      },
    ],
  };

  if (last7DaysEntries.length < 2) {
    return (
      <View>
        <Text style={{ color: palette.sub, textAlign: 'center', marginTop: 16 }}>
          Not enough data to display a chart. Please add more entries.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <LineChart
        data={chartData}
        width={300} // from react-native
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={1} // optional, defaults to 1
        chartConfig={{
          backgroundColor: palette.card,
          backgroundGradientFrom: palette.card,
          backgroundGradientTo: palette.card,
          decimalPlaces: 0, // optional, defaults to 2dp
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
