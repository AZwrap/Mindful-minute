import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Updates from 'expo-updates';
import { AlertTriangle, RefreshCcw } from 'lucide-react-native';

// 1. Define Props (It wraps other components)
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// 2. Define State (Tracks if an error occurred)
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console (or a service like Sentry in production)
    console.error("🔥 ErrorBoundary Caught Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      // Fallback if not using Expo updates (e.g. dev client)
      console.log('Reload not supported in this environment');
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <AlertTriangle size={64} color="#EF4444" style={{ marginBottom: 16 }} />
            
            <Text style={styles.title}>Oops! Something went wrong.</Text>
            <Text style={styles.subtitle}>
              We're sorry, but an unexpected error occurred.
            </Text>

            <View style={styles.errorBox}>
              <ScrollView>
                <Text style={styles.errorText}>
                  {this.state.error?.toString()}
                </Text>
                {this.state.errorInfo && (
                   <Text style={[styles.errorText, { marginTop: 10, opacity: 0.7 }]}>
                     {/* Clean up the component stack for display */}
                     {this.state.errorInfo.componentStack?.trim()}
                   </Text>
                )}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={this.handleRestart}
              activeOpacity={0.8}
            >
              <RefreshCcw size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Restart App</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorBox: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});