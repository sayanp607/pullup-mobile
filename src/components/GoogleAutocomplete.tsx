import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '../config/googleConfig';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/colors';

interface GoogleAutocompleteProps {
  placeholder?: string;
  onPlaceSelected: (address: string, details?: any) => void;
  value?: string;
}

const GoogleAutocomplete: React.FC<GoogleAutocompleteProps> = ({
  placeholder = 'Search address...',
  onPlaceSelected,
  value = '',
}) => {
  const [inputText, setInputText] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const typingTimer = useRef<any>(null);

  useEffect(() => {
    setInputText(value);
  }, [value]);

  const fetchPredictions = async (text: string) => {
    if (!text || text.length < 3) {
      setPredictions([]);
      setShowResults(false);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.startsWith('YOUR_')) {
      console.warn('[GOOGLE] No API Key provided in googleConfig.ts');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&key=${GOOGLE_MAPS_API_KEY}&types=geocode`
      );

      if (response.data.status === 'OK') {
        setPredictions(response.data.predictions);
        setShowResults(true);
      } else {
        console.error('[GOOGLE] Places Error:', response.data.status);
        setPredictions([]);
      }
    } catch (error) {
      console.error('[GOOGLE] Fetch Error:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    
    // De-bounce the API calls
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 500);
  };

  const handleSelectPlace = (item: any) => {
    const address = item.description;
    setInputText(address);
    setPredictions([]);
    setShowResults(false);
    onPlaceSelected(address, item);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          value={inputText}
          onChangeText={handleTextChange}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onFocus={() => predictions.length > 0 && setShowResults(true)}
        />
        {loading && (
          <ActivityIndicator
            style={styles.loader}
            size="small"
            color={Colors.primary}
          />
        )}
      </View>

      {showResults && predictions.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView 
            style={styles.resultsList}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {predictions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.resultItem}
                onPress={() => handleSelectPlace(item)}
              >
                <Text style={styles.resultText}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  inputWrapper: {
    position: 'relative',
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
  loader: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  resultsList: {
    paddingBottom: Spacing.sm,
  },
  resultsContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2000,
  },
  resultItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
  },
});

export default GoogleAutocomplete;
