import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';
import { partiesApi } from '../services/api';
import { User, KYCStatus } from '../types';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GoogleAutocomplete from '../components/GoogleAutocomplete';

interface HostScreenProps {
  user: User;
  forceKyc: (onVerified: () => void) => void;
}

const HostScreen: React.FC<HostScreenProps> = ({ user, forceKyc }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    city: 'Kolkata',
    location: '',
    secretLocation: '',
    date: new Date().toLocaleDateString(),
    time: '20:00',
    category: 'Vibe',
    limit: '20',
    price: '0',
    banner: '',
  });

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSelectBanner = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'banner.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri,
      name: filename,
      type,
    } as any);

    setLoading(true);
    try {
      const { url } = await partiesApi.uploadImage(formData);
      setForm({ ...form, banner: url });
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      setForm({
        ...form,
        date: selectedDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      });
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Keep existing date but update time
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);

      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setForm({ ...form, time: `${hours}:${minutes}` });
    }
  };

  const handleHost = async () => {
    if (!form.title || !form.location || !form.city) {
      Alert.alert('Error', 'Please fill in title, city and location');
      return;
    }

    // --- KYC ENFORCEMENT DEACTIVATED ---
    /*
    if ((user.kycStatus as any) !== KYCStatus.VERIFIED && (user.kycStatus as any) !== 'VERIFIED') {
      forceKyc(handleHost);
      return;
    }
    */

    setLoading(true);
    try {
      const partyData = {
        title: form.title,
        description: form.description || 'No description provided',
        city: form.city,
        location: form.location,
        secretLocation: form.secretLocation,
        date: form.date,
        time: form.time, // Use form time instead of hardcoded
        capacity: parseInt(form.limit),
        price: parseFloat(form.price),
        images: [form.banner || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'],
      };

      console.log('[DEBUG] Sending Party Data:', JSON.stringify(partyData, null, 2));

      await partiesApi.create(partyData);
      Alert.alert('Success', 'Pullup hosted successfully! 🚀');
      setForm({
        title: '',
        description: '',
        city: 'Kolkata',
        location: '',
        date: new Date().toLocaleDateString(),
        time: '20:00',
        category: 'Vibe',
        limit: '20',
        price: '0',
        banner: '',
      });
    } catch (error: any) {
      console.error('Hosting error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to host pullup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Host a Pullup</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What's the vibe?"
            placeholderTextColor={Colors.textSecondary}
            value={form.title}
            onChangeText={(text) => setForm({ ...form, title: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Details about the party..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Party Banner</Text>
          <TouchableOpacity
            style={styles.bannerContainer}
            onPress={handleSelectBanner}
            disabled={loading}
          >
            {form.banner ? (
              <Image source={{ uri: form.banner }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={40} color={Colors.textSecondary} />
                <Text style={styles.placeholderText}>Upload Banner from Gallery</Text>
              </View>
            )}
            <View style={styles.uploadBadge}>
              <Ionicons name="camera" size={16} color={Colors.black} />
            </View>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Or Paste Image URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor={Colors.textSecondary}
            value={form.banner}
            onChangeText={(text) => setForm({ ...form, banner: text })}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.sm }]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={form.city}
              onChangeText={(text) => setForm({ ...form, city: text })}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={form.category}
              onChangeText={(text) => setForm({ ...form, category: text })}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.sm }]}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.inputText}>{form.date}</Text>
              <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.inputText}>{form.time}</Text>
              <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}

        <View style={[styles.formGroup, { zIndex: 1000 }]}>
          <Text style={styles.label}>Location / Street (Public)</Text>
          <GoogleAutocomplete
            placeholder="Search Address or Landmark"
            value={form.location}
            onPlaceSelected={(address: string) => {
              setForm({ ...form, location: address });
            }}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Private / Exact Address (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Room No, Flat, Landmark (Visible after payment)"
            placeholderTextColor={Colors.textSecondary}
            value={form.secretLocation}
            onChangeText={(text) => setForm({ ...form, secretLocation: text })}
          />
          <Text style={styles.helpText}>This will ONLY be shown to users who have joined and paid.</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: Spacing.sm }]}>
            <Text style={styles.label}>Guest Limit</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.limit}
              onChangeText={(text) => setForm({ ...form, limit: text })}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Price (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={form.price}
              onChangeText={(text) => setForm({ ...form, price: text })}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleHost}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.buttonText}>🚀 Broadcast Pullup</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  helpText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.black,
    fontWeight: '900',
    fontSize: FontSizes.lg,
  },
  bannerContainer: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  uploadBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});

export default HostScreen;
