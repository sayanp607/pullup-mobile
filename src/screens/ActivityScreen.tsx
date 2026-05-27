import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';
import socket from '../services/socket';

interface ActivityItem {
  id: string;
  type: 'NEW_FOLLOWER' | 'FOLLOW_REQUEST' | 'FOLLOW_ACCEPTED' | 'LIKE' | 'JOIN_APPROVED' | 'JOIN_REQUEST' | 'JOIN_REJECTED' | 'JOIN_PAID' | 'NEW_PARTY';
  fromUser?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  title?: string;
  message?: string;
  refId?: string;
  refType?: string;
  read: boolean;
  createdAt: string;
}

const getRelativeTime = (timestamp: string) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInMs = now.getTime() - past.getTime();
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSecs < 60) return 'Just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return past.toLocaleDateString();
};

const ActivityScreen = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timer, setTimer] = useState(0);

  const fetchHistory = async () => {
    try {
      const { notificationsApi } = await import('../services/api');

      // Fetch persistent notifications only
      const notifications = await notificationsApi.list();

      // Sort by createdAt desc (Server does this, but good to ensure)
      const sorted = [...notifications].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setActivities(sorted);
    } catch (error) {
      console.error('Failed to fetch activity history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    socket.on('NEW_PARTY', (data: any) => {
      const newActivity: ActivityItem = {
        id: `party_${data.id || Math.random().toString()}`,
        type: 'NEW_PARTY',
        title: data.title,
        message: data.message || `New Pullup at ${data.location.toLowerCase().includes(data.city.toLowerCase()) ? data.location : `${data.location}, ${data.city}`} on ${data.date} at ${data.time} (${data.capacity - data.occupied} spots left)`,
        createdAt: data.createdAt || new Date().toISOString(),
        read: false,
      };
      setActivities(prev => {
        if (prev.find(a => a.id === newActivity.id)) return prev;
        return [newActivity, ...prev];
      });
    });

    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 60000);

    return () => {
      socket.off('NEW_PARTY');
      clearInterval(interval);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getNotificationContent = (item: ActivityItem) => {
    const name = item.fromUser?.name || 'Someone';
    switch (item.type) {
      case 'NEW_PARTY':
        return {
          icon: '🎉',
          title: item.title || 'New Pullup',
          message: item.message || 'A new pullup was just created!'
        };
      case 'JOIN_REQUEST':
        return { icon: '👋', title: 'Join Request', message: `${name} wants to join your party!` };
      case 'JOIN_APPROVED':
        return { icon: '✅', title: 'Request Approved', message: `${name} approved your request. Tap to pay and join!` };
      case 'JOIN_REJECTED':
        return { icon: '❌', title: 'Request Declined', message: `Your request to join ${name}'s party was declined.` };
      case 'JOIN_PAID':
        return { icon: '💰', title: 'New Attendee', message: `${name} has paid and joined your party!` };
      case 'NEW_FOLLOWER':
        return { icon: '👤', title: 'New Follower', message: `${name} started following you.` };
      case 'FOLLOW_REQUEST':
        return { icon: '🔒', title: 'Follow Request', message: `${name} requested to follow you.` };
      case 'FOLLOW_ACCEPTED':
        return { icon: '✨', title: 'Follow Accepted', message: `${name} accepted your follow request.` };
      case 'LIKE':
        return { icon: '❤️', title: 'New Like', message: `${name} liked your party!` };
      default:
        return { icon: '🔔', title: 'Notification', message: 'You have a new update.' };
    }
  };

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const content = getNotificationContent(item);
    return (
      <TouchableOpacity
        style={[styles.activityItem, !item.read && styles.unreadItem]}
        activeOpacity={0.7}
      >
        <View style={styles.activityIcon}>
          <Text style={styles.iconText}>{content.icon}</Text>
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{content.title}</Text>
            <Text style={styles.activityTime}>{getRelativeTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.activityMessage}>{content.message}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {loading && activities.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : activities.length > 0 ? (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>❤️</Text>
          <Text style={styles.emptyTitle}>Your Activity</Text>
          <Text style={styles.emptySubtitle}>Notifications and requests will appear here.</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '900',
    color: Colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unreadItem: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary + '30',
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  activityMessage: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  refreshBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
  },
  refreshText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSizes.md,
  }
});

export default ActivityScreen;
