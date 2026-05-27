import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/colors';
import { Party, User } from '../types';
import { partiesApi } from '../services/api';
import PartyCard from '../components/PartyCard';

interface LobbyScreenProps {
  user: User;
  onPartyPress: (party: Party) => void;
  onCreateParty: () => void;
  onCityChange: (city: string) => void;
  onNotificationsPress: () => void;
}

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Kolkata', 'Pune', 'Gurgaon', 'Noida'];

const LobbyScreen: React.FC<LobbyScreenProps> = ({
  user,
  onPartyPress,
  onCreateParty,
  onCityChange,
  onNotificationsPress,
}) => {
  const [selectedCity, setSelectedCity] = useState(user.city || 'Bengaluru');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadParties();
  }, [selectedCity]);

  const loadParties = async () => {
    try {
      setIsLoading(true);
      const data = await partiesApi.list(selectedCity);
      setParties(data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load parties');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadParties();
    setIsRefreshing(false);
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setShowCityPicker(false);
    onCityChange(city);
  };

  const renderPartyCard = ({ item }: { item: Party }) => (
    <PartyCard party={item} onPress={onPartyPress} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎉</Text>
      <Text style={styles.emptyText}>No parties in {selectedCity}</Text>
      <Text style={styles.emptySubtext}>
        Be the first to create one!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.citySelector}
          onPress={() => setShowCityPicker(!showCityPicker)}
        >
          <Text style={styles.cityIcon}>📍</Text>
          <Text style={styles.cityText}>{selectedCity}</Text>
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationsPress}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {/* TODO: Add unread badge */}
        </TouchableOpacity>
      </View>

      {/* City Picker */}
      {showCityPicker && (
        <View style={styles.cityPicker}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityOption,
                city === selectedCity && styles.cityOptionSelected,
              ]}
              onPress={() => handleCitySelect(city)}
            >
              <Text
                style={[
                  styles.cityOptionText,
                  city === selectedCity && styles.cityOptionTextSelected,
                ]}
              >
                {city}
              </Text>
              {city === selectedCity && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Parties List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={parties}
          renderItem={renderPartyCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Create Party FAB */}
      <TouchableOpacity style={styles.fab} onPress={onCreateParty}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  cityIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  cityText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  chevron: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },
  cityPicker: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cityOptionSelected: {
    backgroundColor: Colors.surface,
  },
  cityOptionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  cityOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 80, // Above bottom tab bar
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.black,
    fontWeight: '300',
  },
});

export default LobbyScreen;
