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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/colors';
import { authApi, setAuthToken } from '../services/api';

interface SignupScreenProps {
  initialData?: any;
  onSignup: (user: any) => void;
  onNavigateToLogin: () => void;
}

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Kolkata', 'Pune', 'Gurgaon', 'Noida'];

const SignupScreen: React.FC<SignupScreenProps> = ({ initialData, onSignup, onNavigateToLogin }) => {
  const [profileImage, setProfileImage] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [city, setCity] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Verification flow states
  const [verificationStep, setVerificationStep] = useState<'form' | 'email' | 'phone'>('form');
  const [verificationUser, setVerificationUser] = useState<any>(null);
  const [emailCode, setEmailCode] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailTimer, setEmailTimer] = useState(0);
  const [phoneTimer, setPhoneTimer] = useState(0);

  // Pre-fill phone/email if coming from OTP verification or login redirect
  useEffect(() => {
    if (initialData?.phoneNumber) {
      setPhoneNumber(initialData.phoneNumber);
      setCountryCode(initialData.countryCode || '+91');
    }
    if (initialData?.email) {
      setEmail(initialData.email);
    }
  }, [initialData]);

  // Check username availability with debounce
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { available } = await authApi.checkUsername(username);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleCreateAccount = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!username.trim() || username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Error', 'Username already taken');
      return;
    }

    // Both email and phone are required now
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!city) {
      Alert.alert('Error', 'Please select your city');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'Please accept Terms & Conditions');
      return;
    }

    setIsLoading(true);
    try {
      // Always send both phone and email
      const response = await authApi.signup({
        name: fullName,
        username: username.toLowerCase(),
        email: email,
        phone: phoneNumber,
        countryCode: countryCode,
        city,
        password,
        avatar: profileImage || undefined,
      });

      // Check if email and phone verification required
      if (response.requiresVerification) {
        setVerificationUser(response.user);
        setVerificationStep('email');
        setEmailTimer(60);
      } else {
        // No verification required, auto-login
        setAuthToken(response.token);
        onSignup(response.user);
      }
    } catch (err: any) {
      const errorCode = err?.response?.data?.code;
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to create account';
      
      // Handle duplicate account errors with helpful suggestions
      if (errorCode === 'EMAIL_EXISTS') {
        Alert.alert(
          'Email Already Registered',
          errorMessage,
          [
            { text: 'Try Login', onPress: onNavigateToLogin },
            { text: 'Use Different Email', onPress: () => setEmail('') },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
      } else if (errorCode === 'PHONE_EXISTS') {
        Alert.alert(
          'Phone Already Registered',
          errorMessage,
          [
            { text: 'Try Login', onPress: onNavigateToLogin },
            { text: 'Use Different Number', onPress: () => setPhoneNumber('') },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
      } else if (errorCode === 'USERNAME_EXISTS') {
        Alert.alert(
          'Username Taken',
          errorMessage,
          [
            { text: 'Try Another Username', onPress: () => setUsername('') },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
      } else if (errorCode === 'ACCOUNT_EXISTS') {
        Alert.alert(
          'Account Already Exists',
          errorMessage,
          [
            { text: 'Go to Login', onPress: onNavigateToLogin },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Email verification timer effect
  useEffect(() => {
    if (emailTimer <= 0) return;
    const interval = setInterval(() => {
      setEmailTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [emailTimer]);

  // Phone verification timer effect
  useEffect(() => {
    if (phoneTimer <= 0) return;
    const interval = setInterval(() => {
      setPhoneTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneTimer]);

  const handleVerifyEmailCode = async () => {
    if (!emailCode || emailCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.verifyEmail(email, emailCode);
      // Email verified, move to phone verification
      setVerificationStep('phone');
      setPhoneTimer(60);
      setEmailCode('');
      Alert.alert('Success', 'Email verified! Now verify your phone number.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifySignupPhone(verificationUser.id, phoneNumber, phoneOtp);
      // Phone verified, user is now fully verified and logged in
      setAuthToken(response.token);
      Alert.alert('Success', 'Account created and verified!');
      onSignup(response.user);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailCode = async () => {
    setIsLoading(true);
    try {
      await authApi.sendVerifyEmail(email);
      setEmailTimer(60);
      Alert.alert('Success', 'Verification code sent to your email');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    setIsLoading(true);
    try {
      await authApi.sendOtp(phoneNumber, countryCode);
      setPhoneTimer(60);
      Alert.alert('Success', 'OTP sent to your phone');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend OTP');
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
            {/* Signup Form */}
            {verificationStep === 'form' && (
              <>
                {/* Logo */}
                <Text style={styles.logo}>CREATE ACCOUNT</Text>
                <Text style={styles.tagline}>Join the party community</Text>

                {/* Form */}
                <View style={styles.form}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={Colors.textTertiary}
                    value={fullName}
                    onChangeText={setFullName}
                  />

                  <Text style={styles.label}>USERNAME</Text>
                  <TextInput
                    style={[
                      styles.input,
                      usernameAvailable === true && styles.inputSuccess,
                      usernameAvailable === false && styles.inputError,
                    ]}
                    placeholder="johndoe"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                  />
                  {usernameAvailable === true && (
                    <Text style={styles.successText}>✓ Username available</Text>
                  )}
                  {usernameAvailable === false && (
                    <Text style={styles.errorText}>✗ Username already taken</Text>
                  )}

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

                  <Text style={styles.label}>CITY</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowCityPicker(!showCityPicker)}
                  >
                    <Text style={city ? styles.inputText : styles.inputPlaceholder}>
                      {city || 'Select your city'}
                    </Text>
                  </TouchableOpacity>
                  {showCityPicker && (
                    <View style={styles.cityPicker}>
                      {CITIES.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={styles.cityOption}
                          onPress={() => {
                            setCity(c);
                            setShowCityPicker(false);
                          }}
                        >
                          <Text style={styles.cityOptionText}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.label}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />

                  <Text style={styles.label}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />

                  {/* Terms & Conditions */}
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setTermsAccepted(!termsAccepted)}
                  >
                    <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                      {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      I accept the Terms & Conditions
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleCreateAccount}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.black} />
                    ) : (
                      <Text style={styles.buttonText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Login Link */}
                <TouchableOpacity onPress={onNavigateToLogin}>
                  <Text style={styles.loginText}>
                    Already have an account? <Text style={styles.loginLink}>Login</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Email Verification Screen */}
            {verificationStep === 'email' && (
              <>
                <Text style={styles.logo}>VERIFY EMAIL</Text>
                <Text style={styles.tagline}>We sent a 6-digit code to {email}</Text>

                <View style={styles.form}>
                  <Text style={styles.label}>ENTER VERIFICATION CODE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="000000"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={emailCode}
                    onChangeText={setEmailCode}
                  />

                  <Text style={styles.timerText}>
                    Code expires in <Text style={styles.timerBold}>{emailTimer}s</Text>
                  </Text>

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleVerifyEmailCode}
                    disabled={isLoading || emailCode.length !== 6}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.black} />
                    ) : (
                      <Text style={styles.buttonText}>Verify Email</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary, (isLoading || emailTimer > 0) && styles.buttonDisabled]}
                    onPress={handleResendEmailCode}
                    disabled={isLoading || emailTimer > 0}
                  >
                    <Text style={styles.buttonSecondaryText}>
                      {emailTimer > 0 ? `Resend in ${emailTimer}s` : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Phone Verification Screen */}
            {verificationStep === 'phone' && (
              <>
                <Text style={styles.logo}>VERIFY PHONE</Text>
                <Text style={styles.tagline}>We sent an OTP to {countryCode} {phoneNumber}</Text>

                <View style={styles.form}>
                  <Text style={styles.label}>ENTER OTP</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="000000"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={phoneOtp}
                    onChangeText={setPhoneOtp}
                  />

                  <Text style={styles.timerText}>
                    OTP expires in <Text style={styles.timerBold}>{phoneTimer}s</Text>
                  </Text>

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleVerifyPhoneOtp}
                    disabled={isLoading || phoneOtp.length !== 6}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.black} />
                    ) : (
                      <Text style={styles.buttonText}>Verify Phone</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary, (isLoading || phoneTimer > 0) && styles.buttonDisabled]}
                    onPress={handleResendPhoneOtp}
                    disabled={isLoading || phoneTimer > 0}
                  >
                    <Text style={styles.buttonSecondaryText}>
                      {phoneTimer > 0 ? `Resend in ${phoneTimer}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    paddingTop: Spacing.lg,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputSuccess: {
    borderColor: Colors.success,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputText: {
    color: Colors.text,
  },
  inputPlaceholder: {
    color: Colors.textTertiary,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
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
  cityPicker: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityOption: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityOptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  successText: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.black,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
  buttonSecondary: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonSecondaryText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  timerText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  timerBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  loginText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  loginLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default SignupScreen;
