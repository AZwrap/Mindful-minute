import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import PremiumPressable from '../components/PremiumPressable';
import { useSettings } from '../stores/settingsStore'; // Import store

export default function PremiumScreen() {
  const navigation = useNavigation();
  const setPremium = useSettings((s) => s.setPremium); // Get action

  const Benefit = ({ icon, text }: { icon: string, text: string }) => (
    <View style={styles.benefitRow}>
      <View style={styles.iconContainer}>
        <Feather name={icon as any} size={20} color="#6366F1" />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PRO</Text>
            </View>
            <Text style={styles.title}>Unlock Full Potential</Text>
            <Text style={styles.subtitle}>
              Take your mindfulness journey to the next level.
            </Text>
          </View>

          <View style={styles.card}>
            <Benefit icon="zap" text="Unlimited AI Smart Prompts" />
            <Benefit icon="bar-chart-2" text="Advanced Analytics & Trends" />
            <Benefit icon="cloud" text="Cloud Backup & Sync" />
            <Benefit icon="edit-3" text="Unlimited Custom Moods" />
            <Benefit icon="users" text="Create Shared Journals" />
          </View>

<View style={styles.footer}>
<PremiumPressable 
                style={styles.button} 
                haptic="medium" 
                onPress={() => {
                  setPremium(true); 
                  alert("Premium Unlocked! (No charge for testers)");
                  navigation.goBack();
                }}
             >
                <LinearGradient
                  colors={['#10B981', '#059669']} // Green to signal "Safe/Free"
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.btnText}>Unlock Premium (Beta: FREE)</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                    Click to test all features. No payment required.
                  </Text>
                </LinearGradient>
             </PremiumPressable>
             
             <PremiumPressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
               <Text style={{ color: '#94A3B8', textAlign: 'center' }}>Restore Purchases</Text>
             </PremiumPressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  badge: { backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 16 },
  badgeText: { fontWeight: '900', color: 'white', fontSize: 12 },
  title: { fontSize: 32, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, gap: 20, marginBottom: 40 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
  benefitText: { color: 'white', fontSize: 16, fontWeight: '500' },
  footer: { marginTop: 'auto' },
  button: { borderRadius: 20, overflow: 'hidden' },
  gradient: { paddingVertical: 18, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' },
});