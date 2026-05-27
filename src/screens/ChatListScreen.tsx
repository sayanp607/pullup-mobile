import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';
import { chatsApi } from '../services/api';
import socket from '../services/socket';

interface ChatItem {
  id: string;
  name: string;
  type: 'GROUP' | 'DIRECT';
  lastMessage: string;
  avatar: string;
  partyId?: string;
  unseenCount?: string | null;
}

const ChatListScreen = ({ currentUser }: { currentUser: any }) => {
  const navigation = useNavigation<any>();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, { id: string, name: string }[]>>({});

  const fetchChats = async () => {
    try {
      const data = await chatsApi.list();
      setChats(data);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();

      const onTyping = (data: { chatId: string, userId: string, userName: string }) => {
        setTypingUsers(prev => {
          const chatTyping = prev[data.chatId] || [];
          if (chatTyping.find(u => u.id === data.userId)) return prev;
          return {
            ...prev,
            [data.chatId]: [...chatTyping, { id: data.userId, name: data.userName }]
          };
        });
      };

      const onStopTyping = (data: { chatId: string, userId: string }) => {
        setTypingUsers(prev => {
          const chatTyping = prev[data.chatId] || [];
          const updated = chatTyping.filter(u => u.id !== data.userId);
          if (updated.length === 0) {
            const newTyping = { ...prev };
            delete newTyping[data.chatId];
            return newTyping;
          }
          return { ...prev, [data.chatId]: updated };
        });
      };

      // Real-time message listener for list updates
      const onGlobalMessage = (msg: { chatId: string, text: string, senderId: string, senderName: string }) => {
        setChats(prev => prev.map(chat => {
          if (chat.id === msg.chatId) {
            let newUnseen = chat.unseenCount;
            // Only increment if not sender (strictly compare string IDs)
            if (String(msg.senderId) !== String(currentUser.id)) {
              const currentNum = chat.unseenCount === '5+' ? 6 : parseInt(chat.unseenCount || '0');
              const nextNum = currentNum + 1;
              newUnseen = nextNum > 5 ? '5+' : String(nextNum);
            }
            return {
              ...chat,
              lastMessage: `${msg.senderName}: ${msg.text}`,
              unseenCount: newUnseen
            };
          }
          return chat;
        }));
      };

      // Real-time read status listener (if read on another device)
      const onGlobalRead = (data: { chatId: string, userId: string }) => {
        if (String(data.userId) === String(currentUser.id)) {
          setChats(prev => prev.map(chat => {
            if (chat.id === data.chatId) {
              return { ...chat, unseenCount: null };
            }
            return chat;
          }));
        }
      };

      socket.on('user-typing', onTyping);
      socket.on('user-stop-typing', onStopTyping);

      // We need to attach listeners for each chat
      const chatIds: string[] = [];

      setChats(currentChats => {
        currentChats.forEach(chat => {
          socket.on(`chat:${chat.id}`, onGlobalMessage);
          socket.on(`chat:${chat.id}:read`, onGlobalRead);
          chatIds.push(chat.id);
        });
        return currentChats;
      });

      return () => {
        socket.off('user-typing', onTyping);
        socket.off('user-stop-typing', onStopTyping);
        chatIds.forEach(id => {
          socket.off(`chat:${id}`, onGlobalMessage);
          socket.off(`chat:${id}:read`, onGlobalRead);
        });
      };
    }, [currentUser.id])
  );

  useEffect(() => {
    // Join all chat rooms to receive typing events even when not in the chat page
    if (chats.length > 0) {
      chats.forEach(chat => {
        socket.emit('join-chat', chat.id);
      });
    }
  }, [chats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('CHAT', {
        screen: 'GroupChat',
        params: { chatId: item.id, chatName: item.name, chatType: item.type }
      })}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {item.unseenCount && (
              <View style={styles.unseenBadge}>
                <Text style={styles.unseenCount}>{item.unseenCount}</Text>
              </View>
            )}
            <Text style={[
              styles.chatType,
              item.type === 'DIRECT' && { color: Colors.secondary, backgroundColor: Colors.secondary + '20' }
            ]}>
              {item.type === 'DIRECT' ? 'Direct' : 'Group'}
            </Text>
          </View>
        </View>
        {typingUsers[item.id] ? (
          <Text style={styles.typingIndicator} numberOfLines={1}>
            {typingUsers[item.id].length === 1
              ? `${typingUsers[item.id][0].name} typing...`
              : typingUsers[item.id].length === 2
                ? `${typingUsers[item.id][0].name} and ${typingUsers[item.id][1].name} typing...`
                : `${typingUsers[item.id].length} members typing...`}
          </Text>
        ) : (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet. Say hi! 👋'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading && chats.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Your Chats</Text>
              <Text style={styles.emptySubtitle}>Join a party to start vibing with the squad!</Text>
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
  header: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
    backgroundColor: Colors.surface,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  chatType: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  lastMessage: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  unseenBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unseenCount: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  typingIndicator: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
    paddingHorizontal: Spacing.xl,
  },
});

export default ChatListScreen;
