import React, { useState, useEffect, useCallback } from 'react';
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
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';
import { Party, User, UserRole, KYCStatus } from '../types';
import { partiesApi, joinRequestsApi, paymentsApi } from '../services/api';
import RazorpayCheckout from 'react-native-razorpay';

interface PartyDetailsScreenProps {
  route: any;
  navigation: any;
  user: User;
  forceKyc: (onVerified: () => void) => void;
}

const PartyDetailsScreen: React.FC<PartyDetailsScreenProps> = ({ route, navigation, user, forceKyc }) => {
  const { partyId } = route.params;
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [rejectionCount, setRejectionCount] = useState(0);

  const isHost = party?.hostId === user.id;

  const loadParty = useCallback(async () => {
    try {
      const data = await partiesApi.getById(partyId);
      setParty(data);
      const myRequest = (data as any).myRequest;
      const attendee = data.joiners?.find((j: any) => j.id === user.id);
      if (attendee) {
        setJoinStatus('APPROVED');
        setPaymentStatus('PAID');
        setRejectionCount(0);
      } else if (myRequest) {
        setJoinStatus(myRequest.status);
        setPaymentStatus(myRequest.paymentStatus);
        setRejectionCount(myRequest.rejectionCount || 0);
      } else {
        setJoinStatus(null);
        setPaymentStatus(null);
        setRejectionCount(0);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to load party');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partyId, user.id, navigation]);

  useEffect(() => {
    loadParty();
  }, [loadParty]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadParty();
  };

  const handleRequestJoin = async () => {
    if (!party) return;
    // KYC ENFORCEMENT DEACTIVATED
    /*
    if ((user.kycStatus as any) !== KYCStatus.VERIFIED && (user.kycStatus as any) !== 'VERIFIED') {
      forceKyc(handleRequestJoin);
      return;
    }
    */
    setJoining(true);
    try {
      await joinRequestsApi.create(party.id);
      setJoinStatus('PENDING');
      Alert.alert('Request Sent', 'Your request has been sent to the host.');
      loadParty();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to send request');
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteParty = () => {
    Alert.alert(
      "Delete Party",
      "Are you sure you want to delete this party? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!party) return;
              await partiesApi.delete(party.id);
              Alert.alert("Success", "Party deleted successfully");
              navigation.goBack();
            } catch (error: any) {
              const msg = error?.response?.data?.error || "Failed to delete party";
              Alert.alert("Error", msg);
            }
          }
        }
      ]
    );
  };

  const handleJoinAndPay = async () => {
    if (!party) return;
    // KYC ENFORCEMENT DEACTIVATED
    /*
    if ((user.kycStatus as any) !== KYCStatus.VERIFIED && (user.kycStatus as any) !== 'VERIFIED') {
      forceKyc(handleJoinAndPay);
      return;
    }
    */
    setJoining(true);
    try {
      // --- FINAL RACE CONDITION CHECK (Last Second) ---
      const latestParty = await partiesApi.getById(party.id);
      if (latestParty.occupied >= latestParty.capacity) {
        Alert.alert('Too Late!', 'This party just filled up! You cannot join anymore.');
        loadParty();
        return;
      }

      const orderData = await paymentsApi.createOrder(party.id);
      const options: any = {
        description: `Join ${party.title}`,
        currency: orderData.currency,
        key: orderData.razorpayKeyId,
        amount: Number(orderData.amount),
        name: 'Pullup',
        order_id: orderData.orderId,
        prefill: {
          email: user.email || '',
          contact: user.phone || '',
          name: user.name,
        },
        theme: { color: Colors.primary },
        retry: { enabled: false }, // Prevent SDK's own "Something went wrong" retry UI
      };
      if (party.images && party.images.length > 0 && party.images[0]) options.image = party.images[0];
      const paymentResult = await RazorpayCheckout.open(options);
      const verifyResult = await paymentsApi.verify({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        partyId: party.id,
      });
      if (verifyResult.verified) {
        setJoinStatus('APPROVED');
        setPaymentStatus('PAID');
        Alert.alert('Joined Successfully', 'Your payment is confirmed. You are in!');
        try {
          await loadParty();
        } catch (loadErr) {
          console.error('Refresh failed after success:', loadErr);
        }
      } else {
        throw new Error(verifyResult.error || 'Payment verification failed');
      }
    } catch (error: any) {
      setJoining(false);

      // Robust detection of cancellations and interruptions
      const errorStr = JSON.stringify(error).toLowerCase();

      const isCancellation =
        error?.code === 2 ||
        error?.code === 'PAYMENT_CANCELLED' ||
        error?.error?.code === 'BAD_REQUEST_ERROR' || // Razorpay sometimes nests the error
        errorStr.includes('payment_cancelled') ||
        errorStr.includes('user cancelled') ||
        errorStr.includes('go back and retry') ||
        (errorStr.includes('bad_request_error') && errorStr.includes('payment_error')) || // Deep check
        (errorStr.includes('payment_authentication') && errorStr.includes('payment_error')); // 3DS cancel/exit

      if (isCancellation) return;

      console.error('Payment flow error:', error);
      const msg = error?.response?.data?.error || error?.description || error?.message || 'Payment failed';
      Alert.alert('Payment Error', typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    } finally {
      setJoining(false);
    }
  };

  const handleApprove = async (requestId: string, userName: string) => {
    try {
      await joinRequestsApi.approve(requestId);
      Alert.alert('Approved', `${userName} has been approved!`);
      loadParty();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async (requestId: string, userName: string) => {
    Alert.alert('Reject Request', `Reject ${userName}'s join request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await joinRequestsApi.reject(requestId);
            Alert.alert('Rejected', `${userName}'s request rejected.`);
            loadParty();
          } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Failed to reject');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!party) return null;
  const isFull = party.occupied >= party.capacity;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}>
        <View style={styles.heroContainer}>
          <Image source={{ uri: party.images?.[0] }} style={styles.heroImage} resizeMode="cover" />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backButtonText}>←</Text></TouchableOpacity>
          {isFull && <View style={styles.fullBadge}><Text style={styles.fullBadgeText}>FULL</Text></View>}
        </View>

        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{party.title}</Text>
            <View style={styles.priceTag}><Text style={styles.priceText}>{party.price === 0 ? 'FREE' : `₹${party.price}`}</Text></View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}><Text style={styles.infoIcon}>📅</Text><Text style={styles.infoText}>{party.date} • {party.time}</Text></View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View>
              <Text style={styles.infoText}>{party.location.toLowerCase().includes(party.city.toLowerCase()) ? party.location : `${party.location}, ${party.city}`}</Text>
              {party.secretLocation && (
                <Text style={styles.secretText}>🔐 {party.secretLocation}</Text>
              )}
            </View>
          </View>
          <View style={styles.infoRow}><Text style={styles.infoIcon}>👥</Text><Text style={styles.infoText}>{party.occupied}/{party.capacity} spots filled</Text></View>
        </View>

        <View style={styles.section}><Text style={styles.sectionTitle}>About</Text><Text style={styles.description}>{party.description}</Text></View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hosted by</Text>
          <View style={styles.hostCard}>
            <Image source={{ uri: party.hostAvatar }} style={styles.hostAvatar} />
            <View><Text style={styles.hostName}>{party.hostName}</Text>{party.hostUsername ? <Text style={styles.hostUsername}>@{party.hostUsername}</Text> : null}</View>
          </View>
        </View>

        {party.joiners && party.joiners.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendees ({party.joiners.length})</Text>
            <View style={styles.joinersGrid}>
              {party.joiners.map((joiner: any) => (
                <View key={joiner.id} style={styles.joinerItem}><Image source={{ uri: joiner.avatar }} style={styles.joinerAvatar} /><Text style={styles.joinerName} numberOfLines={1}>{joiner.name}</Text></View>
              ))}
            </View>
          </View>
        )}

        {isHost && party.pendingRequests && party.pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔔 Pending Requests ({party.pendingRequests.length})</Text>
            {party.pendingRequests.map((req: any) => (
              <View key={req.id} style={styles.requestCard}>
                <Image source={{ uri: req.userAvatar }} style={styles.requestAvatar} />
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{req.userName}</Text>
                  <View style={styles.statusBadgeRow}>
                    <Text style={[styles.requestStatus, { color: req.status === 'APPROVED' ? '#4CAF50' : '#FFB300' }]}>{req.status === 'APPROVED' ? '✅ APPROVED' : '⏳ PENDING'}</Text>
                    <Text style={styles.requestPayment}>{req.paymentStatus === 'PAID' ? ` • 💰 Paid ₹${req.amountPaid / 100}` : req.paymentStatus === 'FREE' ? ' • 🆓 Free entry' : ' • 💳 Awaiting Payment'}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  {req.status === 'PENDING' ? (
                    <>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(req.id, req.userName)}><Text style={styles.approveBtnText}>✓</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(req.id, req.userName)}><Text style={styles.rejectBtnText}>✗</Text></TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(req.id, req.userName)}><Text style={styles.rejectBtnText}>✗</Text></TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {(isHost || user.role === UserRole.SUPER_ADMIN) && (
          <TouchableOpacity 
            style={[
              styles.joinButton, 
              { 
                backgroundColor: party.occupied > 0 && user.role !== UserRole.SUPER_ADMIN ? '#8E8E8E' : '#FF5252', 
                marginBottom: !isHost ? Spacing.sm : 0 
              }
            ]} 
            onPress={handleDeleteParty}
            disabled={party.occupied > 0 && user.role !== UserRole.SUPER_ADMIN}
          >
            <Text style={[styles.joinButtonText, { color: '#FFF' }]}>
              {party.occupied > 0 && user.role !== UserRole.SUPER_ADMIN 
                ? '🔒 Party Active (No Delete)' 
                : '🗑️ Delete Party'}
            </Text>
          </TouchableOpacity>
        )}

        {!isHost && (
          <View>
            {paymentStatus === 'PAID' || (joinStatus === 'APPROVED' && party.price === 0) ? (
              <View style={[styles.joinButton, styles.joinedButton]}><Text style={styles.joinedText}>✅ You're In!</Text></View>
            ) : joinStatus === 'APPROVED' ? (
              <TouchableOpacity
                style={[styles.joinButton, isFull && styles.fullButton]}
                onPress={handleJoinAndPay}
                disabled={joining || isFull}
              >
                {joining ? (
                  <ActivityIndicator color={isFull ? Colors.error : "#000"} />
                ) : (
                  <Text style={[styles.joinButtonText, isFull && styles.fullText]}>
                    {isFull ? 'Party Full' : `💳 Pay ₹${party.price} to Join`}
                  </Text>
                )}
              </TouchableOpacity>
            ) : joinStatus === 'PENDING' ? (
              <View style={[styles.joinButton, styles.pendingButton]}><Text style={styles.pendingText}>⏳ Waiting for Host Approval</Text></View>
            ) : joinStatus === 'REJECTED' && rejectionCount >= 2 ? (
              <View style={[styles.joinButton, styles.fullButton]}><Text style={styles.fullText}>🚫 Request Blocked (Rejected 2x)</Text></View>
            ) : (
              <View>
                {joinStatus === 'REJECTED' && rejectionCount === 1 && <Text style={styles.rejectionWarning}>⚠️ Host declined your request. Try again for the last time!</Text>}
                <TouchableOpacity style={[styles.joinButton, isFull && styles.fullButton]} onPress={handleRequestJoin} disabled={joining || isFull}>{joining ? <ActivityIndicator color="#000" /> : <Text style={styles.joinButtonText}>{isFull ? 'Party Full' : '👋 Request to Join'}</Text>}</TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
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
    paddingBottom: 20,
  },
  // Hero
  heroContainer: {
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  fullBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  fullBadgeText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  // Title
  titleSection: {
    padding: Spacing.lg,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    marginRight: Spacing.md,
  },
  priceTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  // Info
  infoSection: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    width: 24,
  },
  infoText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    fontWeight: '600',
  },
  secretText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  // Sections
  section: {
    padding: Spacing.lg,
    paddingTop: 0,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  // Host
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
  },
  hostName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  hostUsername: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Joiners
  joinersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  joinerItem: {
    alignItems: 'center',
    width: 70,
  },
  joinerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  joinerName: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Pending Requests
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  requestStatus: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  requestPayment: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 30, // SafeArea padding
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '900',
    color: '#000',
  },
  pendingButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  joinedButton: {
    backgroundColor: '#4CAF5020',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  joinedText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#4CAF50',
  },
  rejectionWarning: {
    fontSize: 12,
    color: '#FFB300',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    backgroundColor: '#FFB30015',
    padding: 8,
    borderRadius: 8,
  },
  fullButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  fullText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.error,
  },
});

export default PartyDetailsScreen;
