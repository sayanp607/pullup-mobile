// API Service for Pullup Mobile App
import axios from 'axios';

// Base URL Configuration
// For Android Emulator: use 10.0.2.2
// For Real Device: use your laptop's IP address (both must be on same WiFi)
// Get your laptop IP: ipconfig (Windows) or ifconfig (Mac/Linux)
const API_BASE_URL = 'https://pullup-backend-w17o.onrender.com/api';
// For local development: 'http://10.0.2.2:4000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token management
let authToken: string | null = null;

// Axios Interceptor for Authorization
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
      console.log(`[API] Authorized: ${config.method?.toUpperCase()} ${config.url}`);
    } else {
      console.warn(`[API] No Token: ${config.method?.toUpperCase()} ${config.url}`);
    }
    console.log(`[API] Full URL: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response: ${response.status} ${response.statusText}`);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.message);
    if (error.response) {
      console.error('[API] Response data:', error.response.data);
      console.error('[API] Response status:', error.response.status);
    } else if (error.request) {
      console.error('[API] No response received from:', error.request.url);
    } else {
      console.error('[API] Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  console.log('[API] Setting Auth Token:', token ? '***EXISTS***' : '***NULL***');
  authToken = token;
};

export const clearAuthToken = () => {
  console.log('[API] Clearing Auth Token');
  authToken = null;
};

export const getAuthToken = () => authToken;

// Auth APIs
export const authApi = {
  sendOtp: async (phone: string, countryCode: string) => {
    const { data } = await api.post('/auth/send-otp', { phone, countryCode });
    return data;
  },

  verifyOtp: async (phone: string, otp: string) => {
    const { data } = await api.post('/auth/verify-otp', { phone, otp });
    return data;
  },

  signup: async (userData: any) => {
    const { data } = await api.post('/auth/signup', userData);
    return data;
  },

  login: async (credentials: { email: string; password: string }) => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  checkUsername: async (username: string) => {
    const { data } = await api.post('/auth/check-username', { username });
    return data;
  },

  // Email Verification
  sendVerifyEmail: async (email: string) => {
    const { data } = await api.post('/auth/send-verify-email', { email });
    return data;
  },

  verifyEmail: async (email: string, code: string) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    return data;
  },

  // Phone Verification for Signup
  verifySignupPhone: async (userId: string, phone: string, otp: string) => {
    const { data } = await api.post('/auth/verify-signup-phone', { userId, phone, otp });
    return data;
  },

  // Google Sign-In
  googleSignIn: async (idToken: string, username?: string) => {
    const { data } = await api.post('/auth/google-signin', { idToken, username });
    return data;
  },
};

// Users APIs
export const usersApi = {
  getMe: async () => {
    const { data } = await api.get('/users/me');
    return data;
  },

  updateMe: async (updates: any) => {
    const { data } = await api.patch('/users/me', updates);
    return data;
  },

  addXp: async (amount: number, type?: string) => {
    const { data } = await api.post('/users/me/xp', { amount, type });
    return data;
  },

  updateKycStatus: async (kycStatus: string) => {
    const { data } = await api.patch('/users/me/kyc', { kycStatus });
    return data;
  },

  submitKyc: async (aadhaarNumber: string, imageUri: string) => {
    const formData = new FormData();
    formData.append('aadhaarNumber', aadhaarNumber);

    // Create file object for React Native
    const filename = imageUri.split('/').pop() || 'aadhaar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('aadhaarImage', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const { data } = await api.post('/kyc/verify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60s timeout for OCR processing
    });
    return data;
  },

  getKycStatus: async () => {
    const { data } = await api.get('/kyc/status');
    return data;
  },

  initiateAadhaarKyc: async (aadhaarNumber: string) => {
    const { data } = await api.post('/kyc/initiate', { aadhaarNumber });
    return data;
  },

  verifyAadhaarOtp: async (transactionId: string, otp: string) => {
    const { data } = await api.post('/kyc/verify-otp', { transactionId, otp });
    return data;
  },

  searchUsers: async (query: string) => {
    const { data } = await api.get(`/users-public/search?q=${query}`);
    return data;
  },

  getUserById: async (userId: string) => {
    const { data } = await api.get(`/users-public/${userId}`);
    return data;
  },

  updateAvatar: async (formData: FormData) => {
    const { data } = await api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  discover: async (query?: string) => {
    const { data } = await api.get(`/users/discover${query ? `?query=${query}` : ''}`);
    return data;
  },
};

// Parties APIs
export const partiesApi = {
  list: async (city?: string) => {
    const { data } = await api.get(`/parties${city ? `?city=${city}` : ''}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/parties/${id}`);
    return data;
  },

  create: async (partyData: any) => {
    const { data } = await api.post('/parties', partyData);
    return data;
  },

  update: async (id: string, updates: any) => {
    const { data } = await api.patch(`/parties/${id}`, updates);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/parties/${id}`);
    return data;
  },

  uploadImage: async (formData: FormData) => {
    const { data } = await api.post('/parties/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};

// Join Requests APIs
export const joinRequestsApi = {
  list: async (params?: { forHost?: string }) => {
    const { data } = await api.get('/join-requests', { params });
    return data;
  },

  create: async (partyId: string) => {
    const { data } = await api.post('/join-requests', { partyId });
    return data;
  },

  approve: async (id: string) => {
    const { data } = await api.patch(`/join-requests/${id}/approve`);
    return data;
  },

  reject: async (id: string) => {
    const { data } = await api.patch(`/join-requests/${id}/reject`);
    return data;
  },

  listForParty: async (partyId: string) => {
    const { data } = await api.get(`/join-requests?partyId=${partyId}`);
    return data;
  },
};

// Payments APIs
export const paymentsApi = {
  createOrder: async (partyId: string) => {
    const { data } = await api.post('/payments/create-order', { partyId });
    return data;
  },

  verify: async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    partyId: string;
  }) => {
    const { data } = await api.post('/payments/verify', paymentData);
    return data;
  },
};

// Admin APIs
export const adminApi = {
  listUsers: async (search?: string, page: number = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.append('search', search);
    const { data } = await api.get(`/admin/users?${params}`);
    return data;
  },

  changeRole: async (userId: string, role: 'USER' | 'ADMIN') => {
    const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
    return data;
  },

  getUserActivity: async (userId: string) => {
    const { data } = await api.get(`/admin/users/${userId}/activity`);
    return data;
  },
};

// Chats APIs
export const chatsApi = {
  list: async () => {
    const { data } = await api.get('/chats');
    return data;
  },

  getMessages: async (chatId: string) => {
    const { data } = await api.get(`/chats/${chatId}/messages`);
    return data;
  },

  sendMessage: async (chatId: string, text: string) => {
    const { data } = await api.post(`/chats/${chatId}/messages`, { text });
    return data;
  },

  getParticipants: async (chatId: string) => {
    const { data } = await api.get(`/chats/${chatId}/participants`);
    return data;
  },

  createDirectChat: async (userId: string) => {
    const { data } = await api.post(`/chats/direct/${userId}`);
    return data;
  },
  markAsRead: async (chatId: string) => {
    const { data } = await api.post(`/chats/${chatId}/read`);
    return data;
  },
};

// Follows APIs
export const followsApi = {
  getCounts: async (userId: string) => {
    const { data } = await api.get(`/follows/${userId}/counts`);
    return data;
  },

  getFollowers: async (userId: string) => {
    const { data } = await api.get(`/follows/${userId}/followers`);
    return data;
  },

  getFollowing: async (userId: string) => {
    const { data } = await api.get(`/follows/${userId}/following`);
    return data;
  },

  follow: async (userId: string) => {
    const { data } = await api.post(`/follows/${userId}`);
    return data;
  },

  unfollow: async (userId: string) => {
    const { data } = await api.delete(`/follows/${userId}`);
    return data;
  },

  getFollowBack: async () => {
    const { data } = await api.get('/follows/me/follow-back');
    return data;
  },

  checkFollowStatus: async (userId: string) => {
    const { data } = await api.get(`/follows/${userId}/status`);
    return data;
  },
};

// Follow Requests APIs
export const followRequestsApi = {
  list: async () => {
    const { data } = await api.get('/follow-requests');
    return data;
  },

  accept: async (id: string) => {
    const { data } = await api.patch(`/follow-requests/${id}/accept`);
    return data;
  },

  reject: async (id: string) => {
    const { data } = await api.patch(`/follow-requests/${id}/reject`);
    return data;
  },
};

// Notifications APIs
export const notificationsApi = {
  list: async () => {
    const { data } = await api.get('/notifications');
    return data;
  },

  markAsRead: async (id: string) => {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.post('/notifications/read-all');
    return data;
  },
};

// Likes APIs
export const likesApi = {
  likeParty: async (partyId: string) => {
    const { data } = await api.post(`/likes/party/${partyId}`);
    return data;
  },

  unlikeParty: async (partyId: string) => {
    const { data } = await api.delete(`/likes/party/${partyId}`);
    return data;
  },

  getLikedParties: async () => {
    const { data } = await api.get('/likes/me');
    return data;
  },
};

// Leaderboard APIs
export const leaderboardApi = {
  get: async (city?: string) => {
    const { data } = await api.get(`/leaderboard${city ? `?city=${city}` : ''}`);
    return data;
  },
};

export default api;
