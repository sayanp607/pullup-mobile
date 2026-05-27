import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';
import { usersApi, chatsApi, followsApi } from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

const PublicProfileScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followStatus, setFollowStatus] = useState({ following: false, requested: false });
  const [followLoading, setFollowLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [userData, statusData] = await Promise.all([
        usersApi.getUserById(userId),
        followsApi.checkFollowStatus(userId)
      ]);
      setUser(userData);
      setFollowStatus(statusData);
    } catch (error) {
      console.error('Failed to fetch public profile:', error);
      Alert.alert('Error', 'Could not load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [userId]);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (followStatus.following) {
        await followsApi.unfollow(userId);
        setFollowStatus({ following: false, requested: false });
      } else {
        const result = await followsApi.follow(userId);
        setFollowStatus({
          following: result.status === 'following',
          requested: result.status === 'requested'
        });
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      const chat = await chatsApi.createDirectChat(userId);
      navigation.navigate('CHAT', {
        screen: 'GroupChat',
        params: {
          chatId: chat.id,
          chatName: user.name,
          chatType: 'DIRECT'
        }
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
      Alert.alert('Error', 'Could not start conversation');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!user) return null;

  const xpProgress = (user.xp / 1000) % 1; // Simplified for public view
  const gallery = Array.isArray(user.gallery) ? user.gallery : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>@{user.username}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv. {Math.floor(user.xp / 1000) + 1}</Text>
            </View>
          </View>

          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>🔥 {user.rank}</Text>
          </View>

          <Text style={styles.bioText}>{user.bio || 'Living life one vibe at a time. ✨'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.partiesAttended}</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.partiesHosted}</Text>
              <Text style={styles.statLabel}>Hosted</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.trustScore}%</Text>
              <Text style={styles.statLabel}>Trust</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.followButton,
                (followStatus.following || followStatus.requested) && styles.followingButton
              ]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              <Text style={[
                styles.followButtonText,
                (followStatus.following || followStatus.requested) && styles.followingButtonText
              ]}>
                {followStatus.following ? 'Following' : followStatus.requested ? 'Requested' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={handleMessage}
            >
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {gallery.length > 0 && (
          <View style={styles.gallerySection}>
            <Text style={styles.sectionTitle}>Vibe Gallery</Text>
            <FlatList
              data={gallery}
              keyExtractor={(_, index) => `img-${index}`}
              numColumns={2}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.galleryImage} />
              )}
            />
          </View>
        )}
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '900',
    color: Colors.text,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 4,
  },
  rankBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  bioText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    width: '100%',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '900',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statSeparator: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: Colors.primary,
  },
  followingButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: FontSizes.md,
  },
  followingButtonText: {
    color: Colors.text,
  },
  messageButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageButtonText: {
    color: Colors.text,
    fontWeight: '900',
    fontSize: FontSizes.md,
  },
  gallerySection: {
    padding: Spacing.xl,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  galleryImage: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    borderRadius: BorderRadius.lg,
    margin: Spacing.xs,
  },
});

export default PublicProfileScreen;
