import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../firebaseConfig';
import { useSettings } from '../stores/settingsStore';
import PremiumPressable from '../components/PremiumPressable';
import { useUIStore } from '../stores/uiStore';
import { RootStackParamList } from '../navigation/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: Props) {
  const setHasOnboarded = useSettings((s) => s.setHasOnboarded);
  const { showAlert } = useUIStore();
  // 1. Configure Google Sign-In (Get webClientId from Firebase Console -> Auth -> Sign-in method -> Google -> Web SDK config)
  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId: "223587015486-kjgm2tj1i1ne8qhacq09ffccqjheqkca.apps.googleusercontent.com", // <--- REPLACE THIS
    });
  }, []);

// 2. Handle Google Button Press
  const onGoogleButtonPress = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Force account picker by clearing previous session
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        // Ignore error if user wasn't signed in
      }

      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || response.idToken; // Support different library versions
      
      if (!idToken) throw new Error("No ID token found");

      // Create a Firebase credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Sign-in the user with the credential
      await signInWithCredential(auth, googleCredential);
      
      setHasOnboarded(true);
      navigation.replace('MainTabs');
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        // user cancelled the login flow
      } else {
        showAlert('Google Sign-In Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const handleForgotPassword = async () => {
    if (!email) {
showAlert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
showAlert('Email Sent', 'Check your inbox for password reset instructions.');
    } catch (error: any) {
showAlert('Error', error.message);
    }
  };
const handleAuth = async () => {
    if (!email || !password || (!isLogin && !confirmPassword)) {
showAlert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
showAlert('Password Mismatch', 'Passwords do not match.');
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
      // Do NOT call setLoading(false) here because component unmounts
    } catch (error: any) {
      setLoading(false); // Only stop loading on error (component remains mounted)
      
let msg = error.message;
      if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
      // Handle "invalid-credential" which covers both wrong password and user not found in newer Firebase versions
      if (msg.includes('auth/invalid-credential')) msg = 'Incorrect email or password.';
      if (msg.includes('auth/user-not-found')) msg = 'No account found with this email.';
      if (msg.includes('auth/wrong-password')) msg = 'Incorrect password.';
      if (msg.includes('auth/email-already-in-use')) msg = 'Email is already registered.';
showAlert('Authentication Error', msg);
    }
  };

const handleGuest = () => {
    showAlert(
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
                  placeholder="hello@micromuse.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

<View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', padding: 0, paddingHorizontal: 16 }]}>
                  <TextInput 
                    style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#1E293B' }} 
                    placeholder="••••••••" 
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <PremiumPressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#94A3B8" />
                 </PremiumPressable>
                </View>
              </View>

              {!isLogin && (
<View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', padding: 0, paddingHorizontal: 16 }]}>
                    <TextInput 
                      style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#1E293B' }} 
                      placeholder="••••••••" 
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <PremiumPressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                      <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#94A3B8" />
                    </PremiumPressable>
                  </View>
                </View>
              )}

              {isLogin && (
                <PremiumPressable onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginTop: -8 }}>
                  <Text style={{ color: '#6366F1', fontWeight: '600', fontSize: 13 }}>Forgot Password?</Text>
                </PremiumPressable>
              )}

              <PremiumPressable onPress={handleAuth} style={styles.mainButton} haptic="medium" disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.mainButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                )}
              </PremiumPressable>

              {/* Google Sign-In Button */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>OR</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              </View>

              <PremiumPressable 
                onPress={onGoogleButtonPress} 
                style={[styles.mainButton, { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 0 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {/* Simple G icon representation */}
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#EA4335' }}>G</Text>
                  <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '600' }}>Continue with Google</Text>
                </View>
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