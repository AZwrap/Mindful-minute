import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, Alert, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../firebaseConfig';
import { useSettings } from '../stores/settingsStore';
import PremiumPressable from '../components/PremiumPressable';
import { RootStackParamList } from '../navigation/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: Props) {
  const setHasOnboarded = useSettings((s) => s.setHasOnboarded);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // On success
      setHasOnboarded(true);
      navigation.replace('MainTabs');
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
      if (msg.includes('auth/user-not-found')) msg = 'No account found with this email.';
      if (msg.includes('auth/wrong-password')) msg = 'Incorrect password.';
      if (msg.includes('auth/email-already-in-use')) msg = 'Email is already registered.';
      Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    Alert.alert(
      "Continue as Guest?",
      "Your data will only be stored on this device. You can sync later in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Continue", 
          onPress: () => {
            setHasOnboarded(true);
            navigation.replace('MainTabs');
          }
        }
      ]
    );
  };

  return (
    <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Feather name="lock" size={32} color="#6366F1" />
              </View>
              <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Sign in to access your journal.' : 'Sign up to sync your mindfulness journey.'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="hello@mindful.com" 
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="••••••••" 
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <PremiumPressable onPress={handleAuth} style={styles.mainButton} haptic="medium" disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.mainButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                )}
              </PremiumPressable>

              <PremiumPressable onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
                <Text style={styles.switchText}>
                  {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
                </Text>
              </PremiumPressable>
            </View>

            {/* Guest Option */}
            <View style={styles.footer}>
              <PremiumPressable onPress={handleGuest}>
                <Text style={styles.guestText}>Continue as Guest</Text>
              </PremiumPressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 32, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366F1', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center' },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginLeft: 4 },
  input: {
    backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 16, padding: 16, fontSize: 16, color: '#1E293B',
  },
  mainButton: {
    backgroundColor: '#6366F1', paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  mainButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  switchButton: { alignItems: 'center', padding: 8 },
  switchText: { color: '#6366F1', fontWeight: '600', fontSize: 14 },
  footer: { marginTop: 40, alignItems: 'center' },
  guestText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
});