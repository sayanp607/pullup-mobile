import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Platform,
  PermissionsAndroid,
  TextInput,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/colors';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { usersApi } from '../services/api';

interface KYCModalProps {
  visible: boolean;
  onComplete: (user?: any) => void;
  onClose?: () => void;
}

// ============================================
// CLIENT-SIDE VERHOEFF VALIDATION
// ============================================
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function validateAadhaarClient(num: string): { valid: boolean; error?: string } {
  const cleaned = num.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(cleaned)) return { valid: false, error: 'Must be exactly 12 digits' };
  if (cleaned[0] === '0' || cleaned[0] === '1') return { valid: false, error: 'Cannot start with 0 or 1' };
  let c = 0;
  const digits = cleaned.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) c = d[c][p[i % 8][digits[i]]];
  if (c !== 0) return { valid: false, error: 'Invalid Aadhaar number' };
  return { valid: true };
}

function formatAadhaar(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

const KYCModal: React.FC<KYCModalProps> = ({ visible, onComplete, onClose }) => {
  const [step, setStep] = useState(1); // 1=Info, 2=Number, 3=OTP, 4=Photo, 5=Result
  const [loading, setLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarImage, setAadhaarImage] = useState<string | null>(null);
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [linkedPhone, setLinkedPhone] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    confidence?: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setAadhaarNumber('');
      setAadhaarImage(null);
      setAadhaarOtp('');
      setTransactionId('');
      setLinkedPhone('');
      setValidationError(null);
      setVerificationResult(null);
      setLoading(false);
    }
  }, [visible]);

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const permission = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permission);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const handleImagePick = async () => {
    Alert.alert('Upload Aadhaar Card', 'Choose an option', [
      { text: 'Take Photo', onPress: () => openCamera() },
      { text: 'Choose from Gallery', onPress: () => openGallery() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;
    launchCamera({ mediaType: 'photo', quality: 0.8 }, handleImageResponse);
  };

  const openGallery = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, handleImageResponse);
  };

  const handleImageResponse = (response: any) => {
    if (response.assets && response.assets[0]?.uri) {
      setAadhaarImage(response.assets[0].uri);
    }
  };

  const handleInitiateKyc = async () => {
    const cleaned = aadhaarNumber.replace(/\s/g, '');
    if (cleaned.length !== 12) {
      setValidationError('Please enter all 12 digits');
      return;
    }
    const validation = validateAadhaarClient(cleaned);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const result = await usersApi.initiateAadhaarKyc(cleaned);
      if (result.success) {
        setTransactionId(result.transactionId);
        setLinkedPhone(result.linkedPhoneLast4);
        setStep(3);
      } else {
        setValidationError(result.error);
      }
    } catch (e: any) {
      setValidationError(e.response?.data?.error || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (aadhaarOtp.length !== 6) {
      setValidationError('Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const result = await usersApi.verifyAadhaarOtp(transactionId, aadhaarOtp);
      if (result.success) {
        setStep(4);
      } else {
        setValidationError(result.error);
      }
    } catch (e: any) {
      setValidationError(e.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) handleInitiateKyc();
    else if (step === 3) handleVerifyOtp();
    else if (step === 4) {
      if (!aadhaarImage) {
        Alert.alert('Error', 'Upload Aadhaar image');
        return;
      }
      submitFinalVerification();
    }
  };

  const submitFinalVerification = async () => {
    setLoading(true);
    setStep(5);
    try {
      const cleaned = aadhaarNumber.replace(/\s/g, '');
      const result = await usersApi.submitKyc(cleaned, aadhaarImage!);
      setVerificationResult({ success: true, message: 'Aadhaar Verified!' });
      setTimeout(() => onComplete(result.user), 1500);
    } catch (e: any) {
      setVerificationResult({ success: false, message: e.response?.data?.error || 'OCR Failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setStep(4);
    setAadhaarImage(null);
    setVerificationResult(null);
  };

  const getStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['Info', 'Number', 'OTP', 'Photo', 'Verify'].map((label, idx) => (
        <View key={label} style={styles.stepItem}>
          <View style={[styles.stepDot, idx + 1 <= step && styles.stepDotActive, idx + 1 < step && styles.stepDotCompleted]}>
            {idx + 1 < step ? <Text style={styles.stepDotCheck}>✓</Text> : <Text style={[styles.stepDotText, idx + 1 <= step && styles.stepDotTextActive]}>{idx + 1}</Text>}
          </View>
          <Text style={[styles.stepLabel, idx + 1 <= step && styles.stepLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.iconText}>🛡️</Text>
              <Text style={styles.title}>KYC Verification</Text>
              <Text style={styles.subtitle}>
                {step === 1 && 'Secure your account with Aadhaar'}
                {step === 2 && 'Enter your 12-digit Aadhaar number'}
                {step === 3 && 'OTP Sent to registered mobile'}
                {step === 4 && 'Upload card image'}
                {step === 5 && 'Verification Status'}
              </Text>
            </View>

            {getStepIndicator()}

            {step === 1 && (
              <View style={styles.content}>
                <View style={styles.infoBox}><Text style={styles.infoTitle}>Secure & Trusted</Text><Text style={styles.infoText}>• Verify your identity{'\n'}• Safe community{'\n'}• Encrypted storage</Text></View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.content}>
                <TextInput style={[styles.aadhaarInput, !!validationError && styles.inputError]} placeholder="XXXX XXXX XXXX" value={aadhaarNumber} onChangeText={t => setAadhaarNumber(formatAadhaar(t))} keyboardType="numeric" maxLength={14} />
                {!!validationError && <Text style={styles.errorText}>{validationError}</Text>}
              </View>
            )}

            {step === 3 && (
              <View style={styles.content}>
                <TextInput style={[styles.aadhaarInput, !!validationError && styles.inputError]} placeholder="XXXXXX" value={aadhaarOtp} onChangeText={t => setAadhaarOtp(t.slice(0, 6))} keyboardType="numeric" maxLength={6} />
                {!!validationError && <Text style={styles.errorText}>{validationError}</Text>}
                <Text style={styles.helperText}>Sent to phone ending in {linkedPhone}</Text>
                <Text style={[styles.helperText, { color: Colors.primary }]}>Mock OTP: 123456</Text>
              </View>
            )}

            {step === 4 && (
              <View style={styles.content}>
                <TouchableOpacity style={styles.uploadBox} onPress={handleImagePick}>
                  {aadhaarImage ? <Image source={{ uri: aadhaarImage }} style={styles.uploadedImage} /> : <Text style={styles.uploadText}>Tap to Upload Aadhaar</Text>}
                </TouchableOpacity>
              </View>
            )}

            {step === 5 && (
              <View style={styles.content}>
                {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : (
                  <View style={styles.resultContainer}>
                    <Text style={styles.resultIcon}>{verificationResult?.success ? '✅' : '❌'}</Text>
                    <Text style={styles.resultTitle}>{verificationResult?.success ? 'Verified!' : 'Failed'}</Text>
                    <Text style={styles.resultMessage}>{verificationResult?.message}</Text>
                    {!verificationResult?.success && <TouchableOpacity onPress={handleRetry}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity>}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {step < 5 && (
              <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleNext} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{step === 4 ? 'Submit' : 'Next'}</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onClose?.()} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '90%', maxHeight: '80%', backgroundColor: Colors.cardBackground, borderRadius: 20, overflow: 'hidden' },
  scrollContent: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  iconText: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 10 },
  stepItem: { alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotCompleted: { backgroundColor: '#4CAF50' },
  stepDotText: { fontSize: 10, color: Colors.textSecondary },
  stepDotTextActive: { color: '#FFF' },
  stepDotCheck: { color: '#FFF', fontSize: 12 },
  stepLabel: { fontSize: 8, color: Colors.textSecondary },
  stepLabelActive: { color: Colors.text },
  content: { flex: 1 },
  infoBox: { backgroundColor: Colors.background, padding: 15, borderRadius: 10 },
  infoTitle: { fontWeight: 'bold', marginBottom: 5, color: Colors.text },
  infoText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  aadhaarInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 15, fontSize: 20, textAlign: 'center', color: Colors.text },
  inputError: { borderColor: '#FF4444' },
  errorText: { color: '#FF4444', fontSize: 12, textAlign: 'center', marginTop: 5 },
  helperText: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 5 },
  uploadBox: { height: 150, backgroundColor: Colors.background, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  uploadText: { color: Colors.textSecondary },
  uploadedImage: { width: '100%', height: '100%', borderRadius: 15 },
  resultContainer: { alignItems: 'center', padding: 20 },
  resultIcon: { fontSize: 50, marginBottom: 10 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  resultMessage: { textAlign: 'center', color: Colors.textSecondary, marginTop: 10 },
  retryButtonText: { color: Colors.primary, marginTop: 20, fontWeight: 'bold' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.border },
  primaryButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.5 },
  skipButton: { alignItems: 'center', marginTop: 10 },
  skipButtonText: { color: Colors.textSecondary },
});

export default KYCModal;
