import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';
import { chatsApi, getAuthToken } from '../services/api';
import socket from '../services/socket';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  seenByAll?: boolean;
  senderAvatar?: string;
}

interface Participant {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isHost: boolean;
}

const GroupChatScreen = ({ currentUser }: { currentUser: any }) => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { chatId, chatName, chatType } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ id: string, name: string }[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);

  const fetchInitialData = async () => {
    console.log('[CHAT] Fetching initial data for:', chatId);
    const token = getAuthToken();
    if (!token) {
      console.error('[CHAT] ERROR: App logic error - No token available when entering chat!');
      // This is the 401 culprit - if the app reloads, api.ts loses token but App.tsx keeps user state.
    }

    try {
      const [msgData, partData] = await Promise.all([
        chatsApi.getMessages(chatId),
        chatsApi.getParticipants(chatId)
      ]);
      setMessages(msgData);
      setParticipants(partData);
      // Mark as read once messages are loaded
      await chatsApi.markAsRead(chatId);
    } catch (error) {
      console.error('Failed to load chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    // Join room
    socket.emit('join-chat', chatId);

    // Socket listeners
    const chatEvent = `chat:${chatId}`;

    const onNewMessage = (newMessage: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      // If we are on this screen, mark new message as read
      chatsApi.markAsRead(chatId);
    };

    const onReadUpdate = () => {
      // Someone read the chat, refresh messages to update seenByAll
      chatsApi.getMessages(chatId).then(setMessages);
    };

    const onTyping = (data: { chatId: string, userId: string, userName: string }) => {
      if (data.chatId === chatId && String(data.userId) !== String(currentUser.id)) {
        setTypingUsers(prev => {
          if (prev.find(u => u.id === data.userId)) return prev;
          return [...prev, { id: data.userId, name: data.userName }];
        });
      }
    };

    const onStopTyping = (data: { chatId: string, userId: string }) => {
      if (data.chatId === chatId) {
        setTypingUsers(prev => prev.filter(u => u.id !== data.userId));
      }
    };

    socket.on(chatEvent, onNewMessage);
    socket.on(`chat:${chatId}:read`, onReadUpdate);
    socket.on('user-typing', onTyping);
    socket.on('user-stop-typing', onStopTyping);

    return () => {
      socket.off(chatEvent, onNewMessage);
      socket.off(`chat:${chatId}:read`, onReadUpdate);
      socket.off('user-typing', onTyping);
      socket.off('user-stop-typing', onStopTyping);
    };
  }, [chatId]);

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!isTypingRef.current && text.length > 0) {
      isTypingRef.current = true;
      socket.emit('typing', { chatId, userId: currentUser.id, userName: currentUser.name });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('stop-typing', { chatId, userId: currentUser.id });
    }, 2000);

    if (text.length === 0 && isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('stop-typing', { chatId, userId: currentUser.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await chatsApi.sendMessage(chatId, inputText.trim());
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const getLastSeenMessageId = () => {
    // Collect own messages that are seenByAll
    const mySeenMessages = messages.filter(m => m.seenByAll && m.senderId === currentUser.id);
    if (mySeenMessages.length === 0) return null;
    // Get the ID of the last one
    return mySeenMessages[mySeenMessages.length - 1].id;
  };

  const lastSeenId = getLastSeenMessageId();

  const getGroupedMessages = () => {
    const grouped: any[] = [];
    let lastDate = '';

    messages.forEach((msg) => {
      const date = new Date(msg.timestamp).toDateString();
      if (date !== lastDate) {
        grouped.push({ id: `date-${date}`, isDate: true, dateString: date });
        lastDate = date;
      }
      grouped.push(msg);
    });
    return grouped;
  };

  const navigateToProfile = (userId: string) => {
    navigation.navigate('PublicProfile', { userId });
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.isDate) {
      return (
        <View style={styles.dateHeader}>
          <View style={styles.dateLine} />
          <Text style={styles.dateHeaderText}>{formatDateHeader(item.dateString)}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const isMe = item.senderId === currentUser.id;
    const isGroup = chatType !== 'DIRECT';

    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && isGroup && (
          <TouchableOpacity onPress={() => navigateToProfile(item.senderId)} style={styles.senderInfo}>
            <Image source={{ uri: item.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200' }} style={styles.senderAvatarIcon} />
            <Text style={styles.senderName}>{item.senderName}</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {item.text}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {item.id === lastSeenId && <Text style={styles.seenText}> • Seen by all</Text>}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
          {chatType !== 'DIRECT' && (
            <Text style={styles.headerSubtitle}>{participants.length} Squad Members</Text>
          )}
        </View>
        {chatType !== 'DIRECT' && (
          <TouchableOpacity onPress={() => setShowParticipants(true)} style={styles.infoBtn}>
            <Ionicons name="people" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={getGroupedMessages()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={
            typingUsers.length > 0 ? (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].name} typing...`
                    : typingUsers.length === 2
                      ? `${typingUsers[0].name} and ${typingUsers[1].name} typing...`
                      : `${typingUsers.length} members typing...`}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textSecondary}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="send" size={20} color="#000" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Participants Modal */}
      <Modal visible={showParticipants} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Squad Members</Text>
              <TouchableOpacity onPress={() => setShowParticipants(false)}>
                <Ionicons name="close" size={28} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.participantItem}
                  onPress={() => {
                    setShowParticipants(false);
                    navigateToProfile(item.id);
                  }}
                >
                  <Image source={{ uri: item.avatar }} style={styles.miniAvatar} />
                  <View style={styles.participantInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.participantName}>{item.name}</Text>
                      {item.isHost && (
                        <View style={styles.hostBadge}>
                          <Text style={styles.hostBadgeText}>HOST</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.participantUsername}>@{item.username}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.border} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '900',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoBtn: {
    padding: Spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dateHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  messageContainer: {
    marginBottom: Spacing.md,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '800',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  senderAvatarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#000',
    fontWeight: '600',
  },
  theirMessageText: {
    color: Colors.text,
  },
  timestamp: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
    marginRight: 4,
    fontWeight: '600',
  },
  seenText: {
    color: Colors.primary,
    fontWeight: '900',
    fontStyle: 'normal',
  },
  typingContainer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginLeft: 4,
    marginBottom: Spacing.sm,
  },
  typingText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: FontSizes.md,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '75%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '900',
    color: Colors.text,
    textTransform: 'uppercase',
  },
  modalList: {
    paddingBottom: 40,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.text,
  },
  hostBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  hostBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: Colors.primary,
  },
  participantUsername: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default GroupChatScreen;
