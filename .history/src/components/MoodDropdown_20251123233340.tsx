import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { getMoodCategories } from '../constants/moodCategories';

const MoodDropdown = ({
  selectedMood,
  onMoodSelect,
  isDark = false,
  textMain = '#0F172A',
  textSub = '#334155',
  borderColor = '#D1D5DB',
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [moodSearch, setMoodSearch] = useState('');
  const searchInputRef = useRef(null);
  const triggerRef = useRef(null);
  const [triggerPosition, setTriggerPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const moodCategories = getMoodCategories(isDark);

  const getSelectedMoodLabel = () => {
    if (selectedMood === 'all' || !selectedMood) return 'All Entries';
    
    for (const category of moodCategories) {
      const mood = category.moods.find(m => m.value === selectedMood);
      if (mood) return mood.label;
    }
    
    return selectedMood;
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

  const handleMoodSelect = (moodValue) => {
    onMoodSelect(moodValue);
    setShowDropdown(false);
    setMoodSearch('');
  };

  const renderMoodCategories = () => {
    return filteredCategories.map(category => (
      <View key={category.id}>
        {category.id !== 'all' && (
          <View style={[styles.categoryHeader, { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' 
          }]}>
            <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
            <Text style={[styles.categoryName, { color: textMain }]}>
              {category.name}
            </Text>
          </View>
        )}
        
        {category.moods.map((mood) => (
          <Pressable
            key={mood.value}
            onPress={() => handleMoodSelect(mood.value)}
            style={[
              styles.dropdownItem,
              selectedMood === mood.value && { 
                backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'
              },
              category.id === 'all' && styles.allEntriesItem
            ]}
          >
            <Text style={[
              styles.dropdownItemText,
              { 
                color: selectedMood === mood.value ? '#6366F1' : textMain,
                fontWeight: category.id === 'all' ? '600' : '400'
              }
            ]}>
              {mood.label}
            </Text>
          </Pressable>
        ))}
      </View>
    ));
  };

  return (
    <>
      {/* Dropdown Trigger */}
      <Pressable
        ref={triggerRef}
        onPress={handleDropdownOpen}
        style={[styles.dropdownTrigger, { 
          borderColor: borderColor,
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF' 
        }]}
      >
        <Text style={[styles.dropdownText, { color: textMain }]}>
          {getSelectedMoodLabel()}
        </Text>
        <Text style={{ color: textSub, fontSize: 12 }}>▼</Text>
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
              top: triggerPosition.y + triggerPosition.height - 16,
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
                  <Text style={[styles.clearButtonText, { color: textSub }]}>×</Text>
                </Pressable>
              ) : null}
            </View>
            
            {/* Mood List */}
            <ScrollView 
              style={styles.dropdownList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {renderMoodCategories()}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = {
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownContent: {
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 450,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownList: {
    maxHeight: 300,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  allEntriesItem: {
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  searchContainer: {
    position: 'relative',
    borderRadius: 12,
    margin: 8,
  },
  searchInput: {
    padding: 12,
    fontSize: 14,
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  clearButtonText: {
    fontSize: 20,
    fontWeight: '300',
  },
};

export default MoodDropdown;