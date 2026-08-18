export type AccountType = 'exchange' | 'paid';
export type UserRole = 'user' | 'advertiser' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  state?: string;
  gender?: string;
  ageRange?: string;
  businessCategory?: string;
  profileCompleted: boolean;
  businessName?: string;
  accountType: AccountType;
  role: UserRole;
  receivesAds: boolean;
  isPremium: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarInitials: string;
  referralCode: string;
  referrerId?: string;
  adCredits?: number;
  notificationPrefs: {
    push: boolean;
    email: boolean;
    marketing: boolean;
  };
}

export interface AppNotification {
  id: string;
  type: 'ad_delivered' | 'campaign_approved' | 'campaign_rejected' | 'campaign_boosted' | 'referral_reward';
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft' | 'pending_approval' | 'rejected';

export type ReportType = 'spam' | 'fraud' | 'abusive' | 'other';

export interface AbuseReport {
  id: string;
  reporterId: string;
  reportedCampaignId?: string | null;
  reportedUserId?: string | null;
  type: ReportType;
  details: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
}

export interface MediaModerationRecord {
  id: string;
  userId: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}

export interface Campaign {
  id: string;
  advertiserId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  ageRange?: string;
  gender?: string;
  businessName?: string;
  websiteLink?: string;
  contact?: string;
  callToAction?: string;
  targetReach: number;
  delivered: number;
  opened: number;
  clicked: number;
  spent: number;
  status: CampaignStatus;
  campaignType: AccountType;
  createdAt: string;
  imageColor: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaStoragePath?: string;
  mediaThumbnailUrl?: string;
  rejectionReason?: string | null;
}

export interface AvailableAd {
  id: string;
  deliveryId: string;
  campaignId: string;
  title: string;
  subtitle: string;
  reward: number;
  duration: number;
  imageColor: string;
  advertiser: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  websiteLink?: string;
  contact?: string;
  callToAction?: string;
  status?: 'delivered' | 'opened' | 'clicked';
  deliveredAt?: string;
}

export interface Transaction {
  id: string;
  type: 'topup' | 'spend' | 'spend_adcredits' | 'earn' | 'withdraw' | 'referral';
  title: string;
  amount: number;
  date: string;
  status: 'success' | 'pending' | 'failed';
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  method: string;
  date: string;
  status: 'success' | 'pending' | 'failed';
}

export interface ReferralEntry {
  id: string;
  name: string;
  joinedDate: string;
  status: 'active' | 'pending';
  reward: number;  referredId?: string;
  referrerId?: string;
  activatedAt?: string;}

export interface NewAdDraft {
  title: string;
  description: string;
  businessName: string;
  websiteLink: string;
  contact: string;
  callToAction: string;
  imageColor: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaStoragePath?: string;
  location: string;
  ageRange: string;
  gender: string;
  category: string;
  reach: number;
  campaignType: AccountType;
}
