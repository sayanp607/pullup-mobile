import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, FontSizes, Spacing } from '../theme/colors';
import { User } from '../types';

// Screens
import LobbyScreen from '../screens/LobbyScreen';
import PartyDetailsScreen from '../screens/PartyDetailsScreen';
import HostScreen from '../screens/HostScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ChatListScreen from '../screens/ChatListScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ManageUsersScreen from '../screens/ManageUsersScreen';
import UserActivityScreen from '../screens/UserActivityScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';

const Tab = createBottomTabNavigator();
const LobbyStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();

interface MainTabNavigatorProps {
  user: User;
  onLogout?: () => void;
  forceKyc: (onVerified: () => void) => void;
}

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'HOST': return '➕';
      case 'LOBBY': return '🧭';
      case 'ACTIVITY': return '❤️';
      case 'CHAT': return '💬';
      case 'PROFILE': return '👤';
      default: return '❓';
    }
  };

  return (
    <View style={styles.iconContainer}>
      <View style={[
        styles.iconWrapper,
        focused && styles.iconWrapperFocused
      ]}>
        <Text style={[styles.iconText, focused && styles.iconTextFocused]}>
          {getIcon(label)}
        </Text>
      </View>
      <Text style={[styles.labelText, focused && styles.labelTextFocused]}>
        {label}
      </Text>
    </View>
  );
};

// Lobby Stack Navigator (Lobby → Party Details)
const LobbyStackNavigator = ({ user, forceKyc }: { user: User; forceKyc: any }) => {
  return (
    <LobbyStack.Navigator screenOptions={{ headerShown: false }}>
      <LobbyStack.Screen name="LobbyList">
        {(props) => (
          <LobbyScreen
            {...props}
            user={user}
            onPartyPress={(party) => props.navigation.navigate('PartyDetails', { partyId: party.id })}
            onCreateParty={() => props.navigation.navigate('HOST')}
            onCityChange={(city) => console.log('City:', city)}
            onNotificationsPress={() => console.log('Notifications')}
          />
        )}
      </LobbyStack.Screen>
      <LobbyStack.Screen name="PartyDetails">
        {(props) => <PartyDetailsScreen {...props} user={user} forceKyc={forceKyc} />}
      </LobbyStack.Screen>
      <LobbyStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </LobbyStack.Navigator>
  );
};

// Profile Stack Navigator (Profile → Manage Users → User Activity)
const ProfileStackNavigator = ({ user, onLogout }: { user: User; onLogout?: () => void }) => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain">
        {(props) => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="ManageUsers" component={ManageUsersScreen} />
      <ProfileStack.Screen name="UserActivity" component={UserActivityScreen} />
      <ProfileStack.Screen name="Discover" component={DiscoverScreen} />
      <ProfileStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </ProfileStack.Navigator>
  );
};

// Chat Stack Navigator (Chat List → Group Chat)
const ChatStackNavigator = ({ user }: { user: User }) => {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList">
        {(props) => <ChatListScreen {...props} currentUser={user} />}
      </ChatStack.Screen>
      <ChatStack.Screen name="GroupChat">
        {(props) => <GroupChatScreen {...props} currentUser={user} />}
      </ChatStack.Screen>
      <ChatStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </ChatStack.Navigator>
  );
};

const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({ user, onLogout, forceKyc }) => {
  return (
    <Tab.Navigator
      initialRouteName="LOBBY"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HOST"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="HOST" focused={focused} />,
        }}
      >
        {() => <HostScreen user={user} forceKyc={forceKyc} />}
      </Tab.Screen>
      <Tab.Screen
        name="ACTIVITY"
        component={ActivityScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="ACTIVITY" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LOBBY"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="LOBBY" focused={focused} />,
        }}
      >
        {() => <LobbyStackNavigator user={user} forceKyc={forceKyc} />}
      </Tab.Screen>
      <Tab.Screen
        name="CHAT"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="CHAT" focused={focused} />,
        }}
      >
        {() => <ChatStackNavigator user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="PROFILE"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="PROFILE" focused={focused} />,
        }}
      >
        {() => <ProfileStackNavigator user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    paddingTop: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconWrapperFocused: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  iconText: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconTextFocused: {
    opacity: 1,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  labelTextFocused: {
    color: Colors.primary,
  },
});

export default MainTabNavigator;
