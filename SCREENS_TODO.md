# PULLUP MOBILE - COMPLETE SCREENS TO CREATE

This document lists all the screens that need to be created to match the web app functionality.

## 🎯 SCREENS ALREADY CREATED ✅

1. **LoginScreen.tsx** - Phone OTP and Email/Password login
2. **SignupScreen.tsx** - Account creation with username validation
3. **PartyCard.tsx** - Reusable party card component

---

## 📱 SCREENS TO CREATE

### 1. LobbyScreen.tsx

**Location**: `src/screens/LobbyScreen.tsx`

**Features**:

- City selector at the top
- FlatList of PartyCard components
- Pull-to-refresh
- Search bar (optional)
- Filter parties by city
- "Create Party" FAB (Floating Action Button)

**UI Elements**:

- Header with city dropdown
- Search icon
- Notification bell icon with badge
- Party cards list
- Bottom tab navigation

---

### 2. PartyDetailScreen.tsx

**Location**: `src/screens/PartyDetailScreen.tsx`

**Features**:

- Full party image carousel (swipeable)
- Party title, description, price
- Host info (avatar, name, trust score)
- Date, time, location
- Capacity progress bar
- Like button (heart icon)
- "Request to Join" / "Waiting for Host" / "Approved" button states
- Attendees list (avatars)

**UI Elements**:

- Image carousel with dots indicator
- Back button
- Like button (top right)
- Scrollable content
- Bottom action button

---

### 3. ProfileScreen.tsx

**Location**: `src/screens/ProfileScreen.tsx`

**Features**:

- Profile header (avatar, name, username, bio)
- Edit profile button
- Stats row (Parties Attended, Hosted, Trust Score)
- Followers / Following counts (tappable)
- XP and Rank display with progress bar
- Gallery grid (user photos)
- Settings button
- Logout button

**UI Elements**:

- Avatar with camera icon (editable)
- Bio with edit icon
- Rank badge with icon
- Stats grid
- Gallery photo grid
- Leaderboard preview
- Follow Back suggestions

---

### 4. CreatePartyScreen.tsx

**Location**: `src/screens/CreatePartyScreen.tsx`

**Features**:

- Party image upload (multiple images)
- Title input
- Description input (multiline)
- Price input (numeric)
- Date picker
- Time picker
- Location input (address autocomplete later)
- Capacity input (numeric)
- "Create Party" button

**UI Elements**:

- Image picker carousel
- Form inputs
- Date/Time pickers (modal)
- Submit button

---

### 5. ChatScreen.tsx

**Location**: `src/screens/ChatScreen.tsx`

**Features**:

- List of party chats
- Each chat shows: party title, last message, time, unread count
- Empty state when no chats

**UI Elements**:

- Chat items (similar to messaging apps)
- Avatar, title, last message preview
- Timestamp
- Unread badge

---

### 6. ChatDetailScreen.tsx

**Location**: `src/screens/ChatDetailScreen.tsx`

**Features**:

- Party chat header (party name, members count)
- Message list (reversed FlatList)
- Message bubbles (left for others, right for user)
- Input field at bottom
- Send button

**UI Elements**:

- Header with party info
- Message bubbles with avatars
- Timestamp
- Input bar with send icon
- Keyboard aware scroll

---

### 7. NotificationsScreen.tsx

**Location**: `src/screens/NotificationsScreen.tsx`

**Features**:

- List of notifications
- Types: New Follower, Follow Request, Like, Join Approved
- Mark as read
- Mark all as read button
- Navigate to relevant screen on tap

**UI Elements**:

- Notification items with icons
- User avatars
- Timestamps
- Read/unread indicator
- Action buttons (for follow requests)

---

### 8. UserSearchScreen.tsx

**Location**: `src/screens/UserSearchScreen.tsx`

**Features**:

- Search bar
- User results list
- User cards with avatar, name, username
- Tap to view profile

**UI Elements**:

- Search input
- User result cards
- Empty state

---

### 9. UserProfileViewScreen.tsx

**Location**: `src/screens/UserProfileViewScreen.tsx`

**Features**:

- View another user's profile
- Follow / Following / Requested button states
- Unfollow button
- Same layout as ProfileScreen but view-only
- Stats, gallery, rank

**UI Elements**:

- Similar to ProfileScreen
- Follow action button
- No edit options

---

### 10. VibeScreen.tsx (Join Requests)

**Location**: `src/screens/VibeScreen.tsx`

**Features**:

- Tabs: "Incoming" (for hosts) and "Outgoing" (your requests)
- Incoming: Join requests to approve/reject
- Outgoing: Your join requests with status
- Empty states

**UI Elements**:

- Tab selector
- Request cards with user info
- Approve / Reject buttons (for incoming)
- Status labels (for outgoing)

---

### 11. LeaderboardScreen.tsx

**Location**: `src/screens/LeaderboardScreen.tsx`

**Features**:

- City selector dropdown
- Top users list with rank, XP, avatar
- Current user position highlighted
- Rank badges/icons
- Medal icons for top 3

**UI Elements**:

- City filter
- Leaderboard list items
- Rank numbers
- XP display
- Current user highlight

---

### 12. FollowersModal.tsx

**Location**: `src/components/FollowersModal.tsx`

**Features**:

- Modal showing followers or following list
- User cards with avatar, name, username
- Follow back button (for followers)
- Unfollow button (for following)
- Search bar within modal

**UI Elements**:

- Modal container
- User list
- Action buttons
- Close button

---

### 13. EditProfileScreen.tsx

**Location**: `src/screens/EditProfileScreen.tsx`

**Features**:

- Edit name
- Edit bio
- Edit avatar (image picker)
- Edit Instagram handle
- Toggle private account
- Save button

**UI Elements**:

- Form inputs
- Image picker
- Toggle switch
- Save button

---

### 14. SettingsScreen.tsx

**Location**: `src/screens/SettingsScreen.tsx`

**Features**:

- Account settings
- Privacy options
- Notification preferences
- Logout

**UI Elements**:

- Settings list items
- Toggle switches
- Logout button (red)

---

## 🧩 REUSABLE COMPONENTS TO CREATE

### src/components/

1. **Button.tsx** - Reusable button with variants
2. **Input.tsx** - Styled text input
3. **Avatar.tsx** - User avatar with size variants
4. **RankBadge.tsx** - Rank display with icon
5. **EmptyState.tsx** - Empty state placeholder
6. **LoadingSpinner.tsx** - Loading indicator
7. **CityPicker.tsx** - City selection modal
8. **ImagePicker.tsx** - Image upload component
9. **ProgressBar.tsx** - XP progress bar
10. **TabSelector.tsx** - Custom tab component

---

## 🗺 NAVIGATION STRUCTURE

```
AppNavigator
├── AuthStack (not logged in)
│   ├── LoginScreen
│   └── SignupScreen
│
└── MainStack (logged in)
    ├── BottomTabs
    │   ├── LobbyTab → LobbyScreen
    │   ├── VibeTab → VibeScreen
    │   ├── ChatsTab → ChatScreen
    │   └── ProfileTab → ProfileScreen
    │
    └── Modals/Stacks
        ├── PartyDetailScreen
        ├── CreatePartyScreen
        ├── ChatDetailScreen
        ├── NotificationsScreen
        ├── UserSearchScreen
        ├── UserProfileViewScreen
        ├── LeaderboardScreen
        ├── EditProfileScreen
        └── SettingsScreen
```

---

## 📋 PRIORITY ORDER FOR DEVELOPMENT

### Phase 1: Core Functionality (Must Have)

1. LobbyScreen
2. PartyDetailScreen
3. ProfileScreen
4. Navigation setup

### Phase 2: Party Features

5. CreatePartyScreen
6. VibeScreen (Join Requests)

### Phase 3: Social Features

7. UserSearchScreen
8. UserProfileViewScreen
9. NotificationsScreen
10. FollowersModal

### Phase 4: Chat Features

11. ChatScreen
12. ChatDetailScreen

### Phase 5: Gamification

13. LeaderboardScreen
14. Rank system integration

### Phase 6: Settings & Polish

15. EditProfileScreen
16. SettingsScreen
17. All reusable components
18. Polish UI/UX

---

## 🎨 UI/UX GUIDELINES

- **Dark Theme**: Black background (#000000) with dark gray cards (#1C1C1E)
- **Primary Color**: Neon yellow (#D9FE00) for CTAs and accents
- **Typography**: Bold headings (900), semibold body (600)
- **Spacing**: Consistent 16px padding on screens
- **Border Radius**: Rounded (12-24px) for modern feel
- **Touch Targets**: Minimum 44px for buttons
- **Animations**: Subtle scale on press (0.98x)
- **Icons**: Use emojis or react-native-vector-icons

---

## 🚀 DEVELOPMENT WORKFLOW

1. Create screen file
2. Define interface for props
3. Set up state management
4. Build UI structure
5. Add styling (StyleSheet)
6. Integrate API calls
7. Add navigation
8. Test on both platforms
9. Handle edge cases (loading, errors, empty states)
10. Optimize performance

---

**Total Screens to Create**: 14  
**Total Components to Create**: 10+  
**Estimated Development Time**: 20-30 hours for full UI parity with web app

---

Start with **LobbyScreen** as it's the main entry point after login!
