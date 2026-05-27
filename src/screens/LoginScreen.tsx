import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, BorderRadius, FontSizes, Shadow } from '../theme/colors';
import { authApi, setAuthToken } from '../services/api';
import { initializeGoogleSignIn, signInWithGoogle } from '../services/googleAuth';

interface LoginScreenProps {
  onLogin: (user: any) => void;
  onNavigateToSignup: (initialData?: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToSignup }) => {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  
  // Phone login states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  
  // Email login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Google Sign-In
  useEffect(() => {
    initializeGoogleSignIn();
  }, []);

  // Send OTP Handler
  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.sendOtp(phoneNumber, countryCode);
      
      setShowOtpInput(true);
      setOtpTimer(30);
      Alert.alert('OTP Sent', 'A 6-digit verification code has been sent to your phone.');
      
      // Start countdown timer
      const interval = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('[OTP] Error:', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to send OTP. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP Handler
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.verifyOtp(phoneNumber, otp);
      if ('token' in result && result.user) {
        setAuthToken(result.token);
        onLogin(result.user);
      } else if ('exists' in result && !result.exists) {
        onNavigateToSignup({ phoneNumber, countryCode });
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const googleUser = await signInWithGoogle();
      
      // Send to backend
      const response = await authApi.googleSignIn(
        googleUser.idToken,
        googleUser.email.split('@')[0] // Auto-generate username from email
      );
      
      if (response.user && response.token) {
        setAuthToken(response.token);
        onLogin(response.user);
      }
    } catch (err: any) {
      // User cancelled — do nothing at all, completely silent
      if (err.code === 'USER_CANCELLED') {
        return;
      }

      console.warn('Google Sign-In error:', err.code, err.message);

      // Play Services not available
      if (err.code === 'PLAY_SERVICES_UNAVAILABLE') {
        Alert.alert(
          'Google Play Services Required',
          'Please install or update Google Play Services to sign in with Google.',
        );
        return;
      }

      // Missing token or email — already has friendly message from googleAuth.ts
      if (err.code === 'MISSING_TOKEN' || err.code === 'MISSING_EMAIL') {
        Alert.alert('Sign-In Issue', err.message);
        return;
      }

      // Backend errors (axios)
      if (err.isAxiosError) {
        if (err.response?.status === 409) {
          Alert.alert(
            'Account Already Exists',
            'This email is already registered. Try logging in with your email and password instead.',
          );
        } else if (!err.response) {
          Alert.alert(
            'Connection Problem',
            'Unable to reach our servers. Please check your internet connection and try again.',
          );
        } else {
          Alert.alert(
            'Something Went Wrong',
            'We couldn\'t complete sign-in right now. Please try again in a moment.',
          );
        }
        return;
      }

      // Network-related errors
      if (err.message?.includes('NETWORK') || err.message?.includes('Network Error')) {
        Alert.alert(
          'Connection Problem',
          'Unable to reach our servers. Please check your internet connection and try again.',
        );
        return;
      }

      // Any other unexpected error — still user-friendly
      Alert.alert(
        'Sign-In Unavailable',
        'Google Sign-In couldn\'t be completed right now. Please try again or use email/phone login.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Email Login Handler
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const { user, token } = await authApi.login({ email, password });
      setAuthToken(token);
      onLogin(user);
    } catch (err: any) {
      // Check if email not found - suggest signup
      if (err.response?.status === 404 && err.response?.data?.notFound) {
        Alert.alert(
          'Account Not Found',
          'No account registered with this email. Would you like to create one?',
          [
            { text: 'Cancel', onPress: () => {} },
            { text: 'Signup', onPress: () => onNavigateToSignup({ email }) }
          ]
        );
      } else {
        // Invalid password or other error
        const errorMsg = err.response?.data?.message || err?.message || 'Invalid email or password';
        Alert.alert('Login Failed', errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Logo */}
            <Text style={styles.logo}>PULLUP</Text>
            <Text style={styles.tagline}>Connect. Vibe. Party.</Text>

            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <View style={styles.googleButtonContent}>
                  <Icon name="google" size={24} color="#4285F4" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.divider}>OR</Text>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, loginMethod === 'phone' && styles.tabActive]}
                onPress={() => setLoginMethod('phone')}
              >
                <Text style={[styles.tabText, loginMethod === 'phone' && styles.tabTextActive]}>
                  Phone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, loginMethod === 'email' && styles.tabActive]}
                onPress={() => setLoginMethod('email')}
              >
                <Text style={[styles.tabText, loginMethod === 'email' && styles.tabTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone Login */}
            {loginMethod === 'phone' && !showOtpInput && (
              <View style={styles.form}>
                <Text style={styles.label}>MOBILE NUMBER</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeWrapper}>
                    <Text style={styles.countryCode}>{countryCode}</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="9876543210"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.black} />
                  ) : (
                    <Text style={styles.buttonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* OTP Input */}
            {loginMethod === 'phone' && showOtpInput && (
              <View style={styles.form}>
                <Text style={styles.label}>ENTER OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.black} />
                  ) : (
                    <Text style={styles.buttonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
                {otpTimer > 0 ? (
                  <Text style={styles.timer}>Resend in {otpTimer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp}>
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Email Login */}
            {loginMethod === 'email' && (
              <View style={styles.form}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <Text style={styles.label}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleEmailLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.black} />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Signup Link */}
            <TouchableOpacity onPress={() => onNavigateToSignup()}>
              <Text style={styles.signupText}>
                Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.black,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  countryCodeWrapper: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryCode: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.black,
  },
  timer: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  resendText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  signupText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  signupLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    ...Shadow.md,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: Spacing.md,
  },
  googleButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.gray[700],
    letterSpacing: 0.5,
  },
  divider: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
});

export default LoginScreen;
