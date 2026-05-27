import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/colors';
import { adminApi } from '../services/api';

const UserActivityScreen = ({ route, navigation }: any) => {
  const { userId, userName } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = async () => {
    try {
      const result = await adminApi.getUserActivity(userId);
      setData(result);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load activity');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const { user, partiesCreated, partiesJoined, stats } = data;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return { color: '#FFD700', label: '👑 SUPER ADMIN' };
      case 'ADMIN': return { color: '#4CAF50', label: '🛡️ ADMIN' };
      default: return { color: Colors.textSecondary, label: '👤 USER' };
    }
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return { color: '#4CAF50', label: '🛡️ VERIFIED' };
      case 'REJECTED':
        return { color: '#FF4444', label: '❌ REJECTED' };
      default:
        return { color: '#FFB300', label: '⏳ PENDING' };
    }
  };

  const badge = getRoleBadge(user.role);
  const kycBadge = getKycBadge(user.kycStatus);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadActivity(); }} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Activity</Text>
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.username}>@{user.username} • {user.city}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: kycBadge.color + '20' }]}>
              <Text style={[styles.badgeText, { color: kycBadge.color }]}>{kycBadge.label}</Text>
            </View>
          </View>
          <Text style={styles.joinDate}>
            Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalCreated}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalJoined}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{Math.round(stats.totalSpent / 100)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* Parties Created */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎉 Parties Created ({partiesCreated.length})</Text>
          {partiesCreated.length === 0 ? (
            <Text style={styles.emptyText}>No parties created yet</Text>
          ) : (
            partiesCreated.map((party: any) => (
              <View key={party.id} style={styles.partyCard}>
                <Image source={{ uri: party.images?.[0] }} style={styles.partyImage} />
                <View style={styles.partyInfo}>
                  <Text style={styles.partyTitle}>{party.title}</Text>
                  <Text style={styles.partyMeta}>{party.date} • {party.location.toLowerCase().includes(party.city.toLowerCase()) ? party.location : `${party.location}, ${party.city}`}</Text>
                  <Text style={styles.partyMeta}>
                    👥 {party.occupied}/{party.capacity} • ₹{party.price} • {party.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Parties Joined */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎫 Parties Joined ({partiesJoined.length})</Text>
          {partiesJoined.length === 0 ? (
            <Text style={styles.emptyText}>No parties joined yet</Text>
          ) : (
            partiesJoined.map((party: any, idx: number) => (
              <View key={`joined-${idx}`} style={styles.partyCard}>
                <Image source={{ uri: party.images?.[0] }} style={styles.partyImage} />
                <View style={styles.partyInfo}>
                  <Text style={styles.partyTitle}>{party.title}</Text>
                  <Text style={styles.partyMeta}>{party.date} • {party.location.toLowerCase().includes(party.city.toLowerCase()) ? party.location : `${party.location}, ${party.city}`}</Text>
                  <Text style={styles.partyMeta}>
                    {party.paymentStatus === 'PAID'
                      ? `✅ Paid ₹${party.amountPaid / 100}`
                      : party.paymentStatus === 'FREE'
                        ? '🆓 Free entry'
                        : '⏳ Payment pending'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  backText: {
    fontSize: 20,
    color: Colors.text,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '900',
    color: Colors.text,
  },
  // Profile Card
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  joinDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statSep: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    opacity: 0.3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  // Sections
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  // Party Cards
  partyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partyImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  partyInfo: {
    flex: 1,
  },
  partyTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  partyMeta: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default UserActivityScreen;
