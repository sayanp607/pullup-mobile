import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/colors';
import { Party } from '../types';

interface PartyCardProps {
  party: Party;
  onPress: (party: Party) => void;
}

const PartyCard: React.FC<PartyCardProps> = ({ party, onPress }) => {
  const locality = party.location.split(',')[0];
  const isFull = party.occupied >= party.capacity;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(party)}
      activeOpacity={0.7}
    >
      <View style={styles.card}>
        {/* Party Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: party.images[0] }}
            style={styles.image}
            resizeMode="cover"
          />
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>FULL</Text>
            </View>
          )}
        </View>

        {/* Party Info */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {party.title}
            </Text>
            <Text style={styles.price}>₹{party.price}</Text>
          </View>

          <Text style={styles.dateTime}>
            {party.date} • {party.time}
          </Text>

          <View style={styles.footer}>
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.location} numberOfLines={1}>
                {locality}
              </Text>
            </View>

            <View style={styles.capacityContainer}>
              <Text style={styles.capacityIcon}>👥</Text>
              <Text style={[styles.capacity, isFull && styles.capacityFull]}>
                {party.occupied}/{party.capacity}
              </Text>
            </View>
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrow}>
          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginRight: Spacing.md,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fullBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  fullBadgeText: {
    color: Colors.white,
    fontSize: 8,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: FontSizes.md + 1,
    fontWeight: '700',
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  price: {
    fontSize: FontSizes.md + 1,
    fontWeight: '900',
    color: Colors.primary,
  },
  dateTime: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  location: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  capacity: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  capacityFull: {
    color: Colors.error,
  },
  arrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    fontSize: 24,
    color: Colors.textTertiary,
    fontWeight: '300',
  },
});

export default PartyCard;
