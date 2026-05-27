import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Initialize Google Sign-In
export const initializeGoogleSignIn = async () => {
  try {
    GoogleSignin.configure({
      webClientId: '136966426864-ch20c88agbhnuodm0evkat0koho55ab4.apps.googleusercontent.com', // Web client ID
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      // @ts-ignore
      profileImageSize: 120, // Optional
      // @ts-ignore
      prompt: 'select_account', // This forces the account picker on Android
    });
    
    console.log('✅ Google Sign-In initialized');
  } catch (err) {
    console.error('❌ Google Sign-In init error:', err);
  }
};

// Sign in with Google (always shows account picker)
export const signInWithGoogle = async () => {
  try {
    // Check if device has a Google Play Services app
    await GoogleSignin.hasPlayServices();
    
    // Revoke access to fully clear cached account and force account picker
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        console.log('📱 Already signed in, revoking access to show full account picker...');
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      }
    } catch (revokeErr) {
      console.log('⚠️ RevokeAccess attempt:', revokeErr);
      // If revoke fails, still try signOut
      try { await GoogleSignin.signOut(); } catch (_) {}
    }
    
    // Now sign in - this will show account picker
    const userInfo = await GoogleSignin.signIn();
    console.log('📱 Google Sign-In Response:', JSON.stringify(userInfo, null, 2));
    
    // In v16+, signIn returns { type: 'cancelled' } when user dismisses
    if (!userInfo || userInfo.type === 'cancelled') {
      const cancelError = new Error('USER_CANCELLED');
      (cancelError as any).code = 'USER_CANCELLED';
      throw cancelError;
    }
    
    // Extract Google credential
    const googleIdToken = userInfo.idToken || userInfo.data?.idToken;
    
    if (!googleIdToken) {
      throw new Error('MISSING_TOKEN');
    }
    
    console.log('📱 Got Google ID Token, now signing in to Firebase...');
    
    // Create Firebase credential from Google token
    const credential = auth.GoogleAuthProvider.credential(googleIdToken);
    
    // Sign in to Firebase with the Google credential
    const firebaseUserCredential = await auth().signInWithCredential(credential);
    
    console.log('📱 Firebase Sign-In successful');
    
    // Get Firebase ID token
    const firebaseIdToken = await firebaseUserCredential.user.getIdToken();
    
    console.log('✅ Got Firebase ID Token');
    
    const email = firebaseUserCredential.user.email;
    const name = firebaseUserCredential.user.displayName || '';
    const photo = firebaseUserCredential.user.photoURL || '';
    const googleId = firebaseUserCredential.user.uid;

    if (!email) {
      throw new Error('MISSING_EMAIL');
    }

    console.log('✅ Google Sign-In successful:', email);
    
    return {
      email: email,
      name: name,
      photo: photo,
      idToken: firebaseIdToken,  // Firebase ID token, not Google token
      googleId: googleId,
    };
  } catch (err: any) {
    console.warn('❌ Google Sign-In error:', err.code, err.message);
    
    // Handle user cancellation silently — don't show any error
    if (
      err.code === statusCodes.SIGN_IN_CANCELLED ||
      err.code === 'SIGN_IN_CANCELLED' ||
      err.code === statusCodes.IN_PROGRESS ||
      err.message === 'SIGN_IN_CANCELLED'
    ) {
      // User cancelled — just throw a silent marker, don't show alerts
      const cancelError = new Error('USER_CANCELLED');
      (cancelError as any).code = 'USER_CANCELLED';
      throw cancelError;
    }
    
    // Handle Play Services not available
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      const psError = new Error('Google Play Services is not available on this device. Please update or install it.');
      (psError as any).code = 'PLAY_SERVICES_UNAVAILABLE';
      throw psError;
    }

    // Handle missing token gracefully
    if (err.message === 'MISSING_TOKEN') {
      const tokenError = new Error('Unable to complete sign-in. Please try again.');
      (tokenError as any).code = 'MISSING_TOKEN';
      throw tokenError;
    }

    // Handle missing email
    if (err.message === 'MISSING_EMAIL') {
      const emailError = new Error('Could not retrieve your email. Please try a different account.');
      (emailError as any).code = 'MISSING_EMAIL';
      throw emailError;
    }
    
    throw err;
  }
};

// Sign out from Google
export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    console.log('✅ Signed out from Google');
  } catch (err) {
    console.error('❌ Google Sign-Out error:', err);
  }
};

// Check if user is already signed in
export const isUserSignedInWithGoogle = async () => {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    return isSignedIn;
  } catch (err) {
    console.error('❌ Error checking Google Sign-In status:', err);
    return false;
  }
};
