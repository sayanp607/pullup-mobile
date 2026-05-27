/**
 * Pullup App Entry Point
 */

import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import KYCModal from './src/components/KYCModal';
import { Colors } from './src/theme/colors';
import { User } from './src/types';
import { usersApi } from './src/services/api';

function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  console.log('--- APP COMPONENT RENDERING ---');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [signupInitialData, setSignupInitialData] = useState<any>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const pendingKycAction = React.useRef<(() => void) | null>(null);

  const forceKyc = (onVerified: () => void) => {
    pendingKycAction.current = onVerified;
    setShowKycModal(true);
  };

  const handleLogin = (userData: User) => {
    console.log('=== LOGIN USER DATA ===');
    console.log('User:', JSON.stringify(userData, null, 2));
    console.log('KYC Status:', userData.kycStatus);
    console.log('Should show modal?', userData.kycStatus === 'PENDING' || !userData.kycStatus);

    setUser(userData);

    // Initial KYC check on login - but don't block yet, just suggest
    if (userData.kycStatus === 'PENDING' || !userData.kycStatus) {
      console.log('*** SHOWING KYC MODAL (OPTIONAL) ***');
      setShowKycModal(true);
    }
  };

  const handleSignup = (userData: User) => {
    console.log('=== SIGNUP USER DATA ===');
    console.log('User:', JSON.stringify(userData, null, 2));
    console.log('KYC Status:', userData.kycStatus);

    setUser(userData);

    // Initial KYC check on signup
    if (userData.kycStatus === 'PENDING' || !userData.kycStatus) {
      console.log('*** SHOWING KYC MODAL AFTER SIGNUP ***');
      setShowKycModal(true);
    }
  };

  const navigateToSignup = (data?: any) => {
    setSignupInitialData(data);
    setAuthView('signup');
  };

  const navigateToLogin = () => {
    setAuthView('login');
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleKycComplete = async (updatedUser?: any) => {
    setShowKycModal(false);

    let latestUser = updatedUser;

    if (!latestUser) {
      // Refresh user data to get verified status
      try {
        latestUser = await usersApi.getMe();
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }

    if (latestUser) {
      setUser(latestUser);

      // If there was a pending action and they are now verified, run it!
      if (pendingKycAction.current && latestUser.kycStatus === 'VERIFIED') {
        const action = pendingKycAction.current;
        pendingKycAction.current = null;
        action();
      }
    }

    pendingKycAction.current = null;
  };

  // Logged in state - SHOW THE MAIN TAB NAVIGATOR
  if (user) {
    console.log('Rendering logged in view - showKycModal:', showKycModal);
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
          <MainTabNavigator user={user} onLogout={handleLogout} forceKyc={forceKyc} />

          {/* KYC Modal */}
          <KYCModal
            visible={showKycModal}
            onComplete={handleKycComplete}
            onClose={() => {
              setShowKycModal(false);
              pendingKycAction.current = null;
            }}
          />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Show auth screens
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        {authView === 'login' ? (
          <LoginScreen
            onLogin={handleLogin}
            onNavigateToSignup={navigateToSignup}
          />
        ) : (
          <SignupScreen
            initialData={signupInitialData}
            onSignup={handleSignup}
            onNavigateToLogin={navigateToLogin}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default App;
