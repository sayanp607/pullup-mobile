import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../theme/colors';
import { adminApi } from '../services/api';

interface UserItem {
  id: string;
  name: string;
  username: string;
  avatar: string;
  phone: string;
  role: string;
  city: string;
  xp: number;
  partiesHosted: number;
  partiesAttended: number;
  kycStatus: string;
}

const ManageUsersScreen = ({ navigation, route }: any) => {
  const userRole = route?.params?.userRole || 'ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async (searchTerm?: string) => {
    try {
      const data = await adminApi.listUsers(searchTerm || '', 1);
      setUsers(data.users);
      setTotal(data.total);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  const handleRoleToggle = (user: UserItem) => {
    if (user.role === 'SUPER_ADMIN') {
      Alert.alert('Cannot Change', 'Super Admin role cannot be changed.');
      return;
    }

    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    Alert.alert(
      'Change Role',
      `Change ${user.name}'s role from ${user.role} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await adminApi.changeRole(user.id, newRole as 'USER' | 'ADMIN');
              setUsers(prev =>
                prev.map(u => u.id === user.id ? { ...u, role: newRole } : u)
              );
              Alert.alert('✅ Done', `${user.name} is now ${newRole}`);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to change role');
            }
          },
        },
      ]
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { bg: '#FFD70030', text: '#FFD700', label: '👑 SUPER ADMIN' };
      case 'ADMIN':
        return { bg: '#4CAF5030', text: '#4CAF50', label: '🛡️ ADMIN' };
      default:
        return { bg: Colors.surface, text: Colors.textSecondary, label: '👤 USER' };
    }
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return { color: '#4CAF50', label: 'KYC Verified' };
      case 'REJECTED':
        return { color: '#FF4444', label: 'KYC Rejected' };
      default:
        return { color: '#FFB300', label: 'KYC Pending' };
    }
  };

  const renderUser = ({ item }: { item: UserItem }) => {
    const roleBadge = getRoleBadge(item.role);
    const kycBadge = getKycBadge(item.kycStatus);
    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('UserActivity', { userId: item.id, userName: item.name })}
      >
        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userUsername}>@{item.username} • {item.city}</Text>

          <View style={styles.statusRow}>
            <Text style={[styles.kycStatusText, { color: kycBadge.color }]}>
              {kycBadge.label}
            </Text>
          </View>

          <View style={styles.userStats}>
            <Text style={styles.statText}>🎉 {item.partiesHosted} hosted</Text>
            <Text style={styles.statText}>🎫 {item.partiesAttended} joined</Text>
          </View>
        </View>

        {isSuperAdmin ? (
          <TouchableOpacity
            style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}
            onPress={() => handleRoleToggle(item)}
          >
            <Text style={[styles.roleText, { color: roleBadge.text }]}>{roleBadge.label}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
            <Text style={[styles.roleText, { color: roleBadge.text }]}>{roleBadge.label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👑 Manage Roles</Text>
        <Text style={styles.headerCount}>{total} users</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, username or phone..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadUsers(search); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}
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
    flex: 1,
    fontSize: FontSizes.xl,
    fontWeight: '900',
    color: Colors.text,
  },
  headerCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  clearBtn: {
    fontSize: 16,
    color: Colors.textSecondary,
    padding: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  userUsername: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  kycStatusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  userStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

export default ManageUsersScreen;
