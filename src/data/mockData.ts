import { AvailableAd, Campaign, ReferralEntry, Transaction, User, WithdrawalRequest } from '../types';

export const mockUser: User = {
  id: 'u1',
  name: 'Daniel O.',
  email: 'daniel@example.com',
  phone: '+234 801 234 5678',
  location: 'Ibadan, Oyo',
  businessName: 'Daniel Ankara Collections',
  accountType: 'exchange',
  role: 'user',
  receivesAds: true,
  isPremium: true,
  emailVerified: true,
  phoneVerified: false,
  avatarInitials: 'DO',
  referralCode: 'REF12345',
};

export const mockCampaigns: Campaign[] = [
  {
    id: 'c1',
    advertiserId: 'u1',
    title: 'Big Sale This Weekend!',
    description: 'Everything in store at 20% off. This weekend only.',
    category: 'Retail',
    location: 'Ibadan',
    targetReach: 5000,
    delivered: 4820,
    opened: 2450,
    clicked: 230,
    spent: 1200,
    status: 'active',
    campaignType: 'exchange',
    createdAt: '2026-08-02',
    imageColor: '#F59E0B',
  },
  {
    id: 'c2',
    advertiserId: 'u1',
    title: 'New Collection Launch',
    description: 'Fresh Ankara styles just landed. Come take a look.',
    category: 'Fashion',
    location: 'Ibadan',
    targetReach: 3000,
    delivered: 1200,
    opened: 540,
    clicked: 61,
    spent: 800,
    status: 'paused',
    campaignType: 'exchange',
    createdAt: '2026-07-28',
    imageColor: '#EC4899',
  },
  {
    id: 'c3',
    advertiserId: 'u1',
    title: 'Get 20% Off All Items',
    description: 'A weeklong storewide discount for loyal customers.',
    category: 'Retail',
    location: 'Ibadan',
    targetReach: 3000,
    delivered: 3000,
    opened: 1740,
    clicked: 298,
    spent: 1500,
    status: 'completed',
    campaignType: 'paid',
    createdAt: '2026-07-10',
    imageColor: '#22C55E',
  },
];

export const mockAvailableAds: AvailableAd[] = [
  { id: 'a1', deliveryId: 'd1', campaignId: 'c1', title: 'Boost Your Business', subtitle: 'Grow faster with us', reward: 40, duration: 30, imageColor: '#2563EB', advertiser: 'GrowthHub' },
  { id: 'a2', deliveryId: 'd2', campaignId: 'c2', title: 'Style That Speaks', subtitle: 'New collection out now', reward: 40, duration: 30, imageColor: '#EC4899', advertiser: 'Ankara House' },
  { id: 'a3', deliveryId: 'd3', campaignId: 'c3', title: 'Fast & Reliable Delivery', subtitle: 'We deliver to you', reward: 40, duration: 30, imageColor: '#0F172A', advertiser: 'SwiftDrop' },
  { id: 'a4', deliveryId: 'd4', campaignId: 'c1', title: 'Invest Smarter', subtitle: 'Grow your money', reward: 40, duration: 30, imageColor: '#F59E0B', advertiser: 'Kobo Invest' },
  { id: 'a5', deliveryId: 'd5', campaignId: 'c2', title: 'Healthy Living', subtitle: 'Your health, our priority', reward: 40, duration: 30, imageColor: '#1FAE5C', advertiser: 'Vitalcare' },
];

export const mockTransactions: Transaction[] = [
  { id: 't1', type: 'earn', title: 'Ad viewing reward', amount: 320, date: 'Today, 9:14 AM', status: 'success' },
  { id: 't2', type: 'spend', title: 'Big Sale This Weekend! campaign', amount: -1200, date: 'Aug 2, 2026', status: 'success' },
  { id: 't3', type: 'topup', title: 'Wallet top up via transfer', amount: 5000, date: 'Aug 1, 2026', status: 'success' },
  { id: 't4', type: 'referral', title: 'Referral bonus — Amaka B.', amount: 500, date: 'Jul 30, 2026', status: 'success' },
  { id: 't5', type: 'withdraw', title: 'Withdrawal to bank account', amount: -2000, date: 'Jul 26, 2026', status: 'pending' },
];

export const mockWithdrawals: WithdrawalRequest[] = [
  { id: 'w1', amount: 2000, method: 'GTBank •••• 4821', date: 'Jul 26, 2026', status: 'pending' },
  { id: 'w2', amount: 5000, method: 'GTBank •••• 4821', date: 'Jul 12, 2026', status: 'success' },
  { id: 'w3', amount: 1500, method: 'Opay •••• 0092', date: 'Jun 30, 2026', status: 'success' },
];

export const mockReferrals: ReferralEntry[] = [
  { id: 'r1', name: 'Amaka B.', joinedDate: 'Jul 30, 2026', status: 'active', reward: 500 },
  { id: 'r2', name: 'Chidi E.', joinedDate: 'Jul 18, 2026', status: 'active', reward: 500 },
  { id: 'r3', name: 'Tunde A.', joinedDate: 'Aug 5, 2026', status: 'pending', reward: 0 },
];

export const CATEGORIES = ['Fashion', 'Food & Restaurant', 'Retail', 'Beauty', 'Electronics', 'Services', 'Real Estate', 'Other'];
export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+', 'All ages'];
export const LOCATIONS = ['Ibadan', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Enugu', 'All Nigeria'];
export const REACH_LEVELS = [500, 1000, 2500, 5000, 10000];
