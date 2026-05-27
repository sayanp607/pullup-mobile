// Type definitions for Pullup Mobile App

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  username: string;
  avatar: string;
  role: UserRole;
  kycStatus: KYCStatus;
  trustScore: number;
  city: string;
  bio?: string;
  instagram?: string;
  isPrivate: boolean;
  partiesAttended: number;
  partiesHosted: number;
  rank: string;
  friendsCount: number;
  xp: number;
  nextMilestoneXp: number;
  gallery?: string[];
  streak?: number;
  createdAt: string;
}

export enum UserRole {
  USER = 'USER',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum KYCStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface Party {
  id: string;
  hostId: string;
  hostName: string;
  hostUsername?: string;
  hostAvatar: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  date: string;
  time: string;
  city: string;
  location: string;
  secretLocation?: string;
  capacity: number;
  occupied: number;
  joiners?: { id: string; name: string; username: string; avatar: string }[];
  pendingRequests?: {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    status: string;
    paymentStatus: string;
    amountPaid: number;
    rejectionCount: number;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  partyId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentId?: string;
  paymentStatus?: string;
  amountPaid?: number;
  rejectionCount?: number;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
  partyTitle?: string;
}

export interface Chat {
  id: string;
  partyId: string;
  partyTitle: string;
  partyImage: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userAvatar: string;
}

export interface Notification {
  id: string;
  userId: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  type: 'NEW_FOLLOWER' | 'FOLLOW_REQUEST' | 'FOLLOW_ACCEPTED' | 'LIKE' | 'JOIN_APPROVED' | 'JOIN_REQUEST' | 'JOIN_REJECTED' | 'JOIN_PAID';
  refId?: string;
  refType?: string;
  read: boolean;
  createdAt: string;
  message?: string;
}

export interface FollowUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

declare module 'react-native-razorpay';
