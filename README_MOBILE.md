# PULLUP MOBILE APP - React Native (CLI)

A React Native mobile application for the Pullup party discovery and social networking platform. Built using React Native CLI for maximum customization and native capabilities.

## 🎯 Project Status

### ✅ Completed

- [x] React Native CLI project initialization
- [x] Project structure organized (src folder with screens, components, services, types, theme)
- [x] TypeScript types defined
- [x] API service layer created (ready to connect to backend)
- [x] Theme and styling system (matching web app's neon yellow and dark theme)
- [x] Login Screen (Phone OTP & Email/Password)
- [x] Signup Screen (with username validation)
- [x] PartyCard Component

### 🚧 In Progress / To-Do

- [ ] Install and configure React Navigation
- [ ] Create main navigation structure (Bottom Tabs)
- [ ] LobbyScreen (Party listings with city filter)
- [ ] PartyDetailScreen (Full party view with join button)
- [ ] ProfileScreen (User profile with stats, rank system)
- [ ] ChatScreen (Party chats list)
- [ ] ChatDetailScreen (Individual chat messages)
- [ ] CreatePartyScreen
- [ ] NotificationsScreen
- [ ] UserSearchScreen
- [ ] UserProfileViewScreen (View other users)
- [ ] LeaderboardComponent
- [ ] FollowersModal
- [ ] Configure React Native Vector Icons
- [ ] Configure React Native Gesture Handler
- [ ] Add image picker for profile and party images
- [ ] Set up AsyncStorage for token persistence
- [ ] Android-specific configuration
- [ ] iOS-specific configuration (Podfile, permissions)

## 📁 Project Structure

```
PullupMobile/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── components/       # Reusable UI components
│   │   └── PartyCard.tsx
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   ├── services/         # API and external services
│   │   └── api.ts
│   ├── theme/            # Styling and theme
│   │   └── colors.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   └── navigation/       # Navigation configuration (to be created)
├── App.tsx               # Main app entry point (to be updated)
└── package.json
```

## 🎨 Design System

### Colors

- **Primary**: `#D9FE00` (Neon Yellow - matching web app)
- **Background**: `#000000` (Pure Black)
- **Card Background**: `#1C1C1E` (Dark Gray)
- **Text**: `#FFFFFF` (White)
- **Success**: `#34C759` (Green)
- **Error**: `#FF3B30` (Red)

### Typography

- Headings: 900 weight (Black)
- Buttons: 700 weight (Bold)
- Body: 400-600 weight
- Accent text uses Primary color

### Spacing

- xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

## 🔌 Backend Integration

The API service (`src/services/api.ts`) is pre-configured to connect to:

- **Base URL**: `https://pullup-backend-w17o.onrender.com/api`
- Update this URL in `src/services/api.ts` for local development if needed.

### Available API Methods

- `authApi`: login, signup, sendOtp, verifyOtp
- `usersApi`: getMe, updateMe, addXp, searchUsers
- `partiesApi`: list, create, getById, update, delete
- `joinRequestsApi`: list, create, approve, reject
- `chatsApi`: list, getMessages, sendMessage
- `followsApi`: follow, unfollow, getFollowers, getFollowing
- `likesApi`: likeParty, unlikeParty
- `notificationsApi`: list, markAsRead

## 📦 Dependencies to Install

```bash
npm install --legacy-peer-deps @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-vector-icons axios
```

### Additional Native Dependencies Needed

```bash
npm install @react-native-async-storage/async-storage react-native-image-picker
```

## 🚀 Next Steps

### 1. Complete Navigation Setup

Create `src/navigation/AppNavigator.tsx` with:

- Auth Stack (Login, Signup)
- Main Bottom Tabs (Lobby, Vibe, Chats, Profile)
- Modal screens for details

### 2. Create Remaining Screens

Priority order:

1. LobbyScreen - Browse parties by city
2. ProfileScreen - User profile with gamification
3. PartyDetailScreen - View party details and join
4. ChatScreen - List of party chats
5. CreatePartyScreen - Host can create parties
6. NotificationsScreen - Social notifications

### 3. Add Native Features

- Image picker for avatars and party images
- AsyncStorage for token persistence
- Permissions (Camera, Gallery)

### 4. Platform-Specific Configuration

#### Android

- Update `AndroidManifest.xml` for permissions
- Configure vector icons in `build.gradle`

#### iOS

- Run `pod install` in ios folder
- Update `Info.plist` for permissions
- Link vector icon fonts

### 5. Testing

- Test on Android emulator/device
- Test on iOS simulator/device
- Test all user flows end-to-end

## 🏃 Running the App

### Android

```bash
npx react-native run-android
```

### iOS

```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

## 📝 Features Matching Web App

### Authentication

- ✅ Phone OTP login
- ✅ Email/Password login
- ✅ Username availability check
- ✅ City selection

### Parties

- Party browsing with city filter
- Party creation with images
- Join request system
- Like/unlike parties

### Social

- Follow/unfollow users
- Private accounts with follow requests
- Followers/following lists
- User search
- Notifications

### Gamification

- XP system (10 rank levels)
- Leaderboard by city
- Progress tracking
- Rank badges

### Chat

- Party-based group chats
- Real-time messaging
- Message history

## 🎯 Design Principles

1. **Native Feel**: Use React Native components, not web views
2. **Performance**: Optimize FlatList, Images, avoid re-renders
3. **Accessibility**: Screen readers, touch targets min 44px
4. **Responsive**: Support various screen sizes
5. **Offline-First**: Cache data, handle network errors gracefully

## 🛠 Development Tips

- Use TypeScript strictly for type safety
- Follow React Native best practices
- Test on both platforms regularly
- Use React DevTools and Flipper for debugging
- Keep bundle size optimized

## 📱 Platform Compatibility

- **Minimum Android**: API 21 (Android 5.0)
- **Minimum iOS**: iOS 12.4
- **Target**: Latest stable versions

## 🔐 Security

- Store auth tokens securely in AsyncStorage
- Validate all user inputs
- Handle API errors gracefully
- Implement request throttling
- Sanitize user-generated content

---

**Created by**: React Native CLI v0.84.0  
**License**: Private  
**Version**: 1.0.0
