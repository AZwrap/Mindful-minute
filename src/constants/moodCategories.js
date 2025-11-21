export const getMoodCategories = (isDark = false) => [
  {
    id: 'all',
    name: 'All Entries',
    moods: [{ value: 'all', label: 'All Entries' }],
    color: isDark ? '#9CA3AF' : '#6B7280'
  },
  {
    id: 'positive',
    name: 'Positive',
    moods: [
      { value: 'Grateful', label: 'Grateful' },
      { value: 'Happy', label: 'Happy' },
      { value: 'Calm', label: 'Calm' },
      { value: 'Focused', label: 'Focused' },
      { value: 'Energized', label: 'Energized' },
      { value: 'Optimistic', label: 'Optimistic' },
    ],
    color: '#10B981'
  },
  {
    id: 'neutral',
    name: 'Neutral',
    moods: [
      { value: 'Reflective', label: 'Reflective' },
      { value: 'Tired', label: 'Tired' },
    ],
    color: '#F59E0B'
  },
  {
    id: 'challenging',
    name: 'Challenging',
    moods: [
      { value: 'Anxious', label: 'Anxious' },
      { value: 'Overwhelmed', label: 'Overwhelmed' },
    ],
    color: '#EF4444'
  },
  {
    id: 'custom',
    name: 'Custom',
    moods: [{ value: 'custom', label: 'Custom Prompts' }],
    color: '#8B5CF6'
  }
];