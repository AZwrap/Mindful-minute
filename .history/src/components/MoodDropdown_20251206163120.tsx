import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { getMoodCategories } from '../constants/moodCategories';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface MoodDropdownProps {
  selectedMood: string;
  onMoodSelect: (mood: string) => void;
  isDark?: boolean;
  textMain?: string;
  textSub?: string;
  borderColor?: string;
}

interface TriggerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
const MoodDropdown = ({
  selectedMood,
  onMoodSelect,
  isDark = false,
  textMain = '#0F172A',
  textSub = '#334155',
  borderColor = '#D1D5DB',
}: MoodDropdownProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [moodSearch, setMoodSearch] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  
  // We use View instead of Pressable for the ref to ensure .measure works consistently on Android
  const triggerRef = useRef<View>(null);
  const [triggerPosition, setTriggerPosition] = useState<TriggerLayout>({ x: 0, y: 0, width: 0, height: 0 });

  const moodCategories = getMoodCategories(isDark);

  const getSelectedMoodLabel = () => {
    if (selectedMood === 'all' || !selectedMood) return 'All Entries';
    
    for (const category of moodCategories) {
      const mood = category.moods.find(m => m.value === selectedMood);
      if (mood) return mood.label;
    }
    
    return selectedMood; // Fallback for custom moods
  };

  const filteredCategories = moodCategories.map(category => ({
    ...category,
    moods: category.moods.filter(mood => 
      mood.label.toLowerCase().includes(moodSearch.toLowerCase())
    )
  })).filter(category => category.moods.length > 0);

  const handleDropdownOpen = () => {
    if (triggerRef.current) {
      triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
        setTriggerPosition({ x: pageX, y: pageY, width, height });
        setShowDropdown(true);
      });
    }
  };

  const handleMoodSelect = (moodValue: string) => {
    onMoodSelect(moodValue);
    setShowDropdown(false);
    setMoodSearch('');
  };

  // Helper styles for consistent typing
  const triggerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    borderColor: borderColor,
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF'
  };

  return (
    <>
      {/* Dropdown Trigger - Wrapped in a View for reliable ref measuring */}
      <Pressable onPress={handleDropdownOpen}>
        <View ref={triggerRef} style={triggerStyle}>
          <Text style={{ color: textMain, fontSize: 14, fontWeight: '500' }}>
            {getSelectedMoodLabel()}
          </Text>
          <Text style={{ color: textSub, fontSize: 12 }}>▼</Text>
        </View>
      </Pressable>

      {/* Modal Dropdown */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <View style={[
            styles.dropdownContent,
            {
              position: 'absolute',
              top: triggerPosition.y + triggerPosition.height + 2, // Added small gap
              left: triggerPosition.x,
              width: triggerPosition.width,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: borderColor,
            }
          ]}>
            {/* Search Input */}
            <View style={[styles.searchContainer, { 
              backgroundColor: isDark ? '#111827' : '#F9FAFB'
            }]}>
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { 
                  color: textMain,
                  paddingRight: moodSearch ? 40 : 12,
                }]}
                placeholder="Tap to search moods..."
                placeholderTextColor={textSub}
                value={moodSearch}
                onChangeText={setMoodSearch}
                onSubmitEditing={() => {
                  if (moodSearch.trim()) {
                    handleMoodSelect(moodSearch.trim());
                  }
                }}
                returnKeyType="done"
              />
              {moodSearch ? (
                <Pressable
                  onPress={() => setMoodSearch('')}
                  style={styles.clearButton}
                >
                  <Text style={{ color: textSub, fontSize: 20 }}>×</Text>
                </Pressable>
              ) : null}
            </View>
            
            {/* Mood List */}
            <ScrollView 
              style={styles.dropdownList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCategories.map(category => (
                <View key={category.id}>
                  {category.id !== 'all' && (
                    <View style={[styles.categoryHeader, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' 
                    }]}>
                      <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                      <Text style={{ color: textMain, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>
                        {category.name}
                      </Text>
                    </View>
                  )}
                  
                  {category.moods.map((mood) => (
                    <Pressable
                      key={mood.value}
                      onPress={() => handleMoodSelect(mood.value)}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        { backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent' },
                        selectedMood === mood.value && { 
                          backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'
                        },
                        category.id === 'all' && styles.allEntriesItem
                      ]}
                    >
                      <Text style={{ 
                        color: selectedMood === mood.value ? '#6366F1' : textMain,
                        fontWeight: category.id === 'all' ? '600' : '400',
                        fontSize: 14
                      }}>
                        {mood.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  } as ViewStyle,
  dropdownContent: {
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 450,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  } as ViewStyle,
  dropdownList: {
    maxHeight: 300,
  } as ViewStyle,
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  } as ViewStyle,
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  } as ViewStyle,
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  } as ViewStyle,
  allEntriesItem: {
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  } as ViewStyle,
  searchContainer: {
    position: 'relative',
    borderRadius: 12,
    margin: 8,
  } as ViewStyle,
  searchInput: {
    padding: 12,
    fontSize: 14,
  } as TextStyle,
  clearButton: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  } as ViewStyle,
};

export default MoodDropdown;