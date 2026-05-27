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
  Modal,
  TextInput
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';
import { User, UserRole } from '../types';
import { usersApi } from '../services/api';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface ProfileScreenProps {
  user: User;
  onLogout?: () => void;
  navigation?: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user: initialUser, onLogout, navigation }) => {
  const [user, setUser] = useState<User>(initialUser);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    name: initialUser.name,
    bio: initialUser.bio || '',
    city: initialUser.city,
    instagram: initialUser.instagram || '',
  });

  const fetchProfile = async () => {
    try {
      const latestData = await usersApi.getMe();
      setUser(latestData);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProfile();
  }, []);

  const handleEditAvatar = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri,
      name: filename,
      type,
    } as any);

    setLoading(true);
    try {
      const updatedUser = await usersApi.updateAvatar(formData);
      setUser(updatedUser);
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updatedUser = await usersApi.updateMe(editData);
      setUser(updatedUser);
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, []);

  const xpProgress = (user.xp / user.nextMilestoneXp) * 100;
  const isSuperAdmin = (user.role as string) === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || (user.role as string) === 'ADMIN';

  const getRoleBadge = () => {
    if (isSuperAdmin) return { color: '#FFD700', label: '👑 SUPER ADMIN' };
    if (isAdmin) return { color: '#4CAF50', label: '🛡️ ADMIN' };
    return { color: Colors.textSecondary, label: '👤 USER' };
  };

  const roleBadge = getRoleBadge();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleEditAvatar} disabled={loading}>
            <Image
              source={{ uri: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200' }}
              style={styles.avatar}
            />
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={20} color={Colors.black} />
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv. {Math.floor(user.xp / 1000) + 1}</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>🔥 {user.rank}</Text>
            </View>
            <Text style={styles.username}>@{user.username}</Text>
          </View>
          {/* Role Badge */}
          <View style={[styles.roleBadgeContainer, { backgroundColor: roleBadge.color + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
          </View>
        </View>

        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLabel}>Growth Progress</Text>
            <Text style={styles.xpValue}>{user.xp} / {user.nextMilestoneXp} XP</Text>
          </View>
          <View style={styles.xpBarBackground}>
            <View style={[styles.xpBarFill, { width: `${Math.min(xpProgress, 100)}%` }]} />
          </View>
          <Text style={styles.xpHint}>{user.nextMilestoneXp - user.xp} XP to next milestone</Text>
        </View>

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

        <View style={styles.actionSection}>
          {/* Admin/Super Admin: Manage Users */}
          {isAdmin && navigation && (
            <TouchableOpacity
              style={styles.manageRolesButton}
              onPress={() => navigation.navigate('ManageUsers', { userRole: user.role })}
            >
              <Text style={styles.manageRolesText}>
                {isSuperAdmin ? '👑 Manage Roles' : '🔍 View Users'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.manageRolesButton}
            onPress={() => navigation.navigate('Discover')}
          >
            <Text style={styles.manageRolesText}>🔍 Find Friends</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButton} onPress={() => {
            setEditData({
              name: user.name,
              bio: user.bio || '',
              city: user.city,
              instagram: user.instagram || '',
            });
            setShowEditModal(true);
          }}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Socials</Text>
          <View style={styles.socialItem}>
            <Ionicons name="logo-instagram" size={24} color={Colors.primary} style={{ marginRight: Spacing.md }} />
            <Text style={styles.socialText}>
              {user.instagram ? `@${user.instagram}` : 'No Instagram linked'}
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{user.bio || 'No bio yet. Tap edit to add one!'}</Text>
        </View>

        {/* Edit Profile Modal */}
        <Modal visible={showEditModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={editData.name}
                  onChangeText={(t) => setEditData(p => ({ ...p, name: t }))}
                  placeholder="Your Name"
                  placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Instagram Handle</Text>
                <TextInput
                  style={styles.input}
                  value={editData.instagram}
                  onChangeText={(t) => setEditData(p => ({ ...p, instagram: t }))}
                  placeholder="e.g. sayan_07"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={editData.city}
                  onChangeText={(t) => setEditData(p => ({ ...p, city: t }))}
                  placeholder="Your City"
                  placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={editData.bio}
                  onChangeText={(t) => setEditData(p => ({ ...p, bio: t }))}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
    zIndex: 10,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  levelText: {
    color: Colors.black,
    fontSize: 12,
    fontWeight: '900',
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  rankText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  username: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  xpSection: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  xpLabel: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.md,
  },
  xpValue: {
    color: Colors.primary,
    fontWeight: '900',
    fontSize: FontSizes.md,
  },
  xpBarBackground: {
    height: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  xpHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
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
  statSeparator: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    opacity: 0.3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  actionSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    color: Colors.black,
    fontWeight: '900',
    fontSize: FontSizes.lg,
  },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: '#ff4444',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ff4444',
    fontWeight: '900',
    fontSize: FontSizes.lg,
  },
  infoSection: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  socialIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  socialText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  bioText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '900',
    color: Colors.text,
  },
  closeBtn: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
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
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  saveButtonText: {
    color: '#000',
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  roleBadgeContainer: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  roleBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  manageRolesButton: {
    backgroundColor: '#FFD70020',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  manageRolesText: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: FontSizes.lg,
  }
});

export default ProfileScreen;
