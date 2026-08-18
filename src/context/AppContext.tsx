import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { User as FirebaseUser, getIdTokenResult } from 'firebase/auth';
import * as authService from '../services/authService';
import {
  listenUser,
  ensureDailyReset,
  setReceivesAds,
  updateProfileFields,
  updateNotificationPrefs as updateNotificationPrefsSvc,
  completeProfile as completeProfileSvc,
} from '../services/userService';
import { listenTransactions, listenWithdrawals, topUpWallet as topUpWalletSvc, initializeTopUpPayment as initializeTopUpPaymentSvc, verifyTopUpPayment as verifyTopUpPaymentSvc, withdrawFunds as withdrawFundsSvc } from '../services/walletService';
import { listenCampaigns, createCampaign as createCampaignSvc, setCampaignStatus, boostCampaign as boostCampaignSvc } from '../services/campaignService';
import { listenAvailableAds, listenReceivedAdsHistory, watchAd as watchAdSvc } from '../services/deliveryService';
import { listenReferrals } from '../services/referralService';
import { listenNotifications, markNotificationRead as markNotificationReadSvc } from '../services/notificationsFeedService';
import { listenAppConfig, AppConfigState } from '../services/configService';
import * as notificationService from '../services/notificationService';
import { DAILY_EARN_LIMIT } from '../data/constants';
import { isFirebaseConfigured } from '../services/firebase';
import {
  AvailableAd,
  AppNotification,
  Campaign,
  NewAdDraft,
  ReferralEntry,
  Transaction,
  User,
  WithdrawalRequest,
} from '../types';

interface AppContextValue {
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  restoredFromCache: boolean;
  user: User;
  walletBalance: number;
  earningsBalance: number;
  adCredits: number;
  campaigns: Campaign[];
  availableAds: AvailableAd[];
  receivedAds: AvailableAd[];
  notifications: AppNotification[];
  markNotificationRead: (id: string) => Promise<void>;
  transactions: Transaction[];
  withdrawals: WithdrawalRequest[];
  referrals: ReferralEntry[];
  appConfig: AppConfigState;
  adsViewedToday: number;
  adsViewLimit: number;
  totalAdsViewed: number;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  register: (input: { name: string; email: string; phone: string; password: string; wantsToReceiveAds: boolean; referralCode?: string }) => Promise<void>;
  createCampaign: (draft: NewAdDraft) => Promise<Campaign | undefined>;
  boostCampaign: (campaignId: string, additionalReach: number) => Promise<void>;
  topUpWallet: (amount: number) => Promise<void>;
  initializeTopUpPayment: (amount: number) => Promise<{ authorizationUrl: string; reference: string }>;
  verifyTopUpPayment: (reference: string) => Promise<void>;
  withdrawFunds: (amount: number, method: string) => Promise<void>;
  watchAd: (deliveryId: string) => Promise<void>;
  toggleReceiveAds: (value: boolean) => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'phone' | 'location' | 'businessName'>>) => Promise<void>;
  updateNotificationPrefs: (patch: Partial<User['notificationPrefs']>) => Promise<void>;
  completeProfile: (data: { ageRange: string; gender: string; state: string; location: string; businessCategory: string }) => Promise<void>;
  pauseCampaign: (id: string) => Promise<void>;
  resumeCampaign: (id: string) => Promise<void>;
}

const CACHE_PREFIX = 'koboads:cache';
const CACHE_KEYS = {
  user: 'user',
  walletBalance: 'walletBalance',
  earningsBalance: 'earningsBalance',
  adsViewedToday: 'adsViewedToday',
  totalAdsViewed: 'totalAdsViewed',
  adCredits: 'adCredits',
  campaigns: 'campaigns',
  availableAds: 'availableAds',
  transactions: 'transactions',
  withdrawals: 'withdrawals',
  referrals: 'referrals',
  appConfig: 'appConfig',
} as const;

type CacheKey = keyof typeof CACHE_KEYS;

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  phone: '',
  location: '',
  profileCompleted: false,
  businessName: '',
  accountType: 'exchange',
  role: 'user',
  receivesAds: true,
  isPremium: false,
  emailVerified: false,
  phoneVerified: false,
  avatarInitials: 'U',
  referralCode: '',
  notificationPrefs: { push: true, email: true, marketing: false },
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function mergeVerificationFlags(profile: User, firebaseUser: FirebaseUser | null): User {
  return {
    ...profile,
    emailVerified: firebaseUser?.emailVerified ?? profile.emailVerified ?? false,
    phoneVerified: Boolean(firebaseUser?.phoneNumber ?? profile.phoneVerified),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);

  const [user, setUser] = useState<User>(EMPTY_USER);
  const [walletBalance, setWalletBalance] = useState(0);
  const [adCredits, setAdCredits] = useState(0);
  const [earningsBalance, setEarningsBalance] = useState(0);
  const [adsViewedToday, setAdsViewedToday] = useState(0);
  const [totalAdsViewed, setTotalAdsViewed] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [availableAds, setAvailableAds] = useState<AvailableAd[]>([]);
  const [receivedAds, setReceivedAds] = useState<AvailableAd[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfigState>({
    categories: [],
    locations: [],
    ageRanges: [],
    reachLevels: [],
    exchangeReachLevels: [],
    boostReachSteps: [],
    freeCampaignMaxReach: 1000,
    dailyFreeCampaignLimit: 2,
    costPerReachNaira: 0,
    rewardPerAdNaira: 0,
  });

  const cacheKey = (uid: string, key: CacheKey) => `${CACHE_PREFIX}:${uid}:${key}`;
  const appConfigKey = `${CACHE_PREFIX}:${CACHE_KEYS.appConfig}`;

  const writeCache = async <T,>(key: string, value: T) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures; app should continue using live data when possible.
    }
  };

  const readCache = async <T,>(key: string): Promise<T | undefined> => {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : undefined;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    const restoreAppConfig = async () => {
      const stored = await readCache<AppConfigState>(appConfigKey);
      if (stored) {
        setAppConfig(stored);
      }
    };
    restoreAppConfig();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      setRestoredFromCache(true);
      return;
    }

    const unsub = authService.subscribeAuth((u) => {
      setFirebaseUser(u);
      setAuthLoading(false);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setUser(EMPTY_USER);
      setWalletBalance(0);
      setAdCredits(0);
      setEarningsBalance(0);
      setAdsViewedToday(0);
      setTotalAdsViewed(0);
      setCampaigns([]);
      setAvailableAds([]);
      setReceivedAds([]);
      setNotifications([]);
      setTransactions([]);
      setWithdrawals([]);
      setReferrals([]);
      setRestoredFromCache(true);
      return;
    }

    let active = true;
    setRestoredFromCache(false);
    setIsSyncing(true);

    const restoreUserCache = async () => {
      const userKey = cacheKey(firebaseUser.uid, 'user');
      const walletKey = cacheKey(firebaseUser.uid, 'walletBalance');
      const earningsKey = cacheKey(firebaseUser.uid, 'earningsBalance');
      const adsTodayKey = cacheKey(firebaseUser.uid, 'adsViewedToday');
      const totalAdsKey = cacheKey(firebaseUser.uid, 'totalAdsViewed');
      const campaignsKey = cacheKey(firebaseUser.uid, 'campaigns');
      const availableAdsKey = cacheKey(firebaseUser.uid, 'availableAds');
      const transactionsKey = cacheKey(firebaseUser.uid, 'transactions');
      const withdrawalsKey = cacheKey(firebaseUser.uid, 'withdrawals');
      const referralsKey = cacheKey(firebaseUser.uid, 'referrals');

      const [cachedUser, cachedWallet, cachedEarnings, cachedAdCredits, cachedAdsToday, cachedTotalAds, cachedCampaigns, cachedAvailableAds, cachedTransactions, cachedWithdrawals, cachedReferrals] = await Promise.all([
        readCache<User>(userKey),
        readCache<number>(walletKey),
        readCache<number>(earningsKey),
        readCache<number>(cacheKey(firebaseUser.uid, 'adCredits')),
        readCache<number>(adsTodayKey),
        readCache<number>(totalAdsKey),
        readCache<Campaign[]>(campaignsKey),
        readCache<AvailableAd[]>(availableAdsKey),
        readCache<Transaction[]>(transactionsKey),
        readCache<WithdrawalRequest[]>(withdrawalsKey),
        readCache<ReferralEntry[]>(referralsKey),
      ]);

      if (!active) return;
      if (cachedUser) setUser(mergeVerificationFlags(cachedUser, firebaseUser));
      if (cachedWallet !== undefined) setWalletBalance(cachedWallet);
      if (cachedAdCredits !== undefined) setAdCredits(cachedAdCredits);
      if (cachedEarnings !== undefined) setEarningsBalance(cachedEarnings);
      if (cachedAdsToday !== undefined) setAdsViewedToday(cachedAdsToday);
      if (cachedTotalAds !== undefined) setTotalAdsViewed(cachedTotalAds);
      if (cachedCampaigns) setCampaigns(cachedCampaigns);
      if (cachedAvailableAds) setAvailableAds(cachedAvailableAds);
      if (cachedTransactions) setTransactions(cachedTransactions);
      if (cachedWithdrawals) setWithdrawals(cachedWithdrawals);
      if (cachedReferrals) setReferrals(cachedReferrals);
      setRestoredFromCache(true);
    };

    restoreUserCache();

    const unsubAppConfig = listenAppConfig((config) => {
      setAppConfig(config);
      writeCache(appConfigKey, config);
      setIsSyncing(false);
      setSyncError(null);
    });

    const unsubs = [
      listenUser(firebaseUser.uid, (state) => {
        setUser(mergeVerificationFlags(state.profile, firebaseUser));
        setWalletBalance(state.walletBalance);
        setAdCredits(state.profile.adCredits ?? 0);
        setEarningsBalance(state.earningsBalance);
        setAdsViewedToday(state.adsViewedToday);
        setTotalAdsViewed(state.totalAdsViewed);
        writeCache(cacheKey(firebaseUser.uid, 'user'), state.profile);
        writeCache(cacheKey(firebaseUser.uid, 'walletBalance'), state.walletBalance);
        writeCache(cacheKey(firebaseUser.uid, 'adCredits'), state.profile.adCredits ?? 0);
        writeCache(cacheKey(firebaseUser.uid, 'earningsBalance'), state.earningsBalance);
        writeCache(cacheKey(firebaseUser.uid, 'adsViewedToday'), state.adsViewedToday);
        writeCache(cacheKey(firebaseUser.uid, 'totalAdsViewed'), state.totalAdsViewed);
        setIsSyncing(false);
        setSyncError(null);
      }),
      listenCampaigns(firebaseUser.uid, (items) => {
        setCampaigns(items);
        writeCache(cacheKey(firebaseUser.uid, 'campaigns'), items);
        setIsSyncing(false);
        setSyncError(null);
      }),
      listenAvailableAds(firebaseUser.uid, (items) => {
        setAvailableAds(items);
        writeCache(cacheKey(firebaseUser.uid, 'availableAds'), items);
        setIsSyncing(false);
        setSyncError(null);
      }),
      listenReceivedAdsHistory(firebaseUser.uid, setReceivedAds),
      listenNotifications(firebaseUser.uid, setNotifications),
      listenTransactions(firebaseUser.uid, (items) => {
        setTransactions(items);
        writeCache(cacheKey(firebaseUser.uid, 'transactions'), items);
        setIsSyncing(false);
        setSyncError(null);
      }),
      listenWithdrawals(firebaseUser.uid, (items) => {
        setWithdrawals(items);
        writeCache(cacheKey(firebaseUser.uid, 'withdrawals'), items);
        setIsSyncing(false);
        setSyncError(null);
      }),
      listenReferrals(firebaseUser.uid, (items) => {
        setReferrals(items);
        writeCache(cacheKey(firebaseUser.uid, 'referrals'), items);
        setIsSyncing(false);
        setSyncError(null);
      }),
    ];

    ensureDailyReset(firebaseUser.uid).catch(() => {
      // Daily reset is best-effort; live snapshots will continue to provide current state.
    });

    return () => {
      active = false;
      unsubs.forEach((unsub) => unsub());
      unsubAppConfig();
    };
  }, [firebaseUser]);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const checkNetwork = async () => {
      if (!active) return;
      if (Platform.OS === 'web') {
        setIsOnline(navigator.onLine ?? true);
        return;
      }

      try {
        const response = await fetch('https://clients3.google.com/generate_204', {
          method: 'GET',
          cache: 'no-store',
        });
        if (!active) return;
        setIsOnline(response.ok);
        if (response.ok) {
          setSyncError(null);
        }
      } catch (error) {
        if (!active) return;
        setIsOnline(false);
        setSyncError('No internet connection');
      }
    };

    checkNetwork();
    interval = setInterval(checkNetwork, 15000);

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkNetwork();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      active = false;
      if (interval) clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!firebaseUser) {
      setIsAdmin(false);
      return;
    }

    getIdTokenResult(firebaseUser)
      .then((result) => {
        if (!mounted) return;
        setIsAdmin(Boolean(result.claims?.admin));
      })
      .catch(() => {
        if (!mounted) return;
        setIsAdmin(false);
      });

    return () => {
      mounted = false;
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;

    notificationService.registerForPushNotificationsAsync(firebaseUser.uid).catch(() => {});
  }, [firebaseUser]);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await authService.loginUser(email, password);
    } catch (e: any) {
      setAuthError(e?.message ?? 'Could not log in. Check your details and try again.');
      throw e;
    }
  };

  const logout = async () => {
    const uid = firebaseUser?.uid;
    try {
      if (uid) {
        await notificationService.unregisterForPushNotificationsAsync(uid).catch(() => {});
      }
      // clear caches
      await Promise.all([
        writeCache(cacheKey(uid || 'anon', 'user'), {}),
        writeCache(cacheKey(uid || 'anon', 'walletBalance'), 0),
        writeCache(cacheKey(uid || 'anon', 'earningsBalance'), 0),
        writeCache(cacheKey(uid || 'anon', 'adCredits'), 0),
      ]).catch(() => {});
    } finally {
      await authService.logoutUser();
    }
  };

  const deleteAccount = async () => {
    await authService.deleteOwnAccount();
    // The Cloud Function deletes the Auth user server-side; signOut locally
    // clears the client's now-stale session so RootNavigator falls back to
    // Onboarding instead of trying to keep using a deleted account.
    await authService.logoutUser().catch(() => {});
  };

  const register: AppContextValue['register'] = async (input) => {
    setAuthError(null);
    try {
      await authService.registerUser(input);
    } catch (e: any) {
      setAuthError(e?.message ?? 'Could not create your account. Please try again.');
      throw e;
    }
  };

  const createCampaign = async (draft: NewAdDraft) => {
    if (!firebaseUser) return undefined;
    if (!isOnline) {
      throw new Error('You are offline. Connect to the internet to create a campaign.');
    }
    if (draft.campaignType === 'exchange' && !user.receivesAds) {
      throw new Error('Exchange campaigns require receiving ads from others. Switch to paid advertising or enable exchange ads in Settings.');
    }

    const tempId = `pending-${Date.now()}`;
    const optimisticCampaign: Campaign = {
      id: tempId,
      advertiserId: firebaseUser.uid,
      title: draft.title || 'Untitled campaign',
      description: draft.description,
      category: draft.category || 'General',
      location: draft.location || 'All Nigeria',
      ageRange: draft.ageRange || '18+',
      businessName: draft.businessName || '',
      websiteLink: draft.websiteLink || '',
      contact: draft.contact || '',
      callToAction: draft.callToAction || 'Learn More',
      targetReach: draft.reach,
      delivered: 0,
      opened: 0,
      clicked: 0,
      spent: draft.campaignType === 'paid' ? Math.round(draft.reach * (appConfig.costPerReachNaira || 0)) : 0,
      status: 'active',
      campaignType: draft.campaignType,
      createdAt: new Date().toISOString().slice(0, 10),
      imageColor: draft.imageColor || '#2563EB',
      mediaUrl: draft.mediaUrl,
      mediaType: draft.mediaType,
    };

    setCampaigns((prev) => [optimisticCampaign, ...prev]);
    try {
      await createCampaignSvc(firebaseUser.uid, draft, walletBalance, appConfig.costPerReachNaira || undefined);
      return undefined;
    } catch (error) {
      setCampaigns((prev) => prev.filter((item) => item.id !== tempId));
      throw error;
    }
  };

  const topUpWallet = async (amount: number) => {
    if (!firebaseUser) return;
    await topUpWalletSvc(firebaseUser.uid, amount);
  };

  const initializeTopUpPayment = async (amount: number) => {
    if (!firebaseUser) throw new Error('Not signed in.');
    return initializeTopUpPaymentSvc(firebaseUser.uid, amount);
  };

  const verifyTopUpPayment = async (reference: string) => {
    if (!firebaseUser) throw new Error('Not signed in.');
    return verifyTopUpPaymentSvc(firebaseUser.uid, reference);
  };

  const withdrawFunds = async (amount: number, method: string) => {
    if (!firebaseUser) return;
    await withdrawFundsSvc(firebaseUser.uid, amount, method);
  };

  const watchAd = async (deliveryId: string) => {
    if (!firebaseUser) return;
    await watchAdSvc(firebaseUser.uid, deliveryId);
  };

  const toggleReceiveAds = async (value: boolean) => {
    if (!firebaseUser) return;
    await setReceivesAds(firebaseUser.uid, value);
  };

  const updateProfile: AppContextValue['updateProfile'] = async (patch) => {
    if (!firebaseUser) return;
    await updateProfileFields(firebaseUser.uid, patch);
  };

  const updateNotificationPrefsAction: AppContextValue['updateNotificationPrefs'] = async (patch) => {
    if (!firebaseUser) return;
    await updateNotificationPrefsSvc(firebaseUser.uid, patch);
  };

  const completeProfileAction: AppContextValue['completeProfile'] = async (data) => {
    if (!firebaseUser) return;
    await completeProfileSvc(firebaseUser.uid, data);
  };

  const pauseCampaign = async (id: string) => setCampaignStatus(id, 'paused');
  const resumeCampaign = async (id: string) => setCampaignStatus(id, 'active');
  const boostCampaign = async (campaignId: string, additionalReach: number) => {
    await boostCampaignSvc(campaignId, additionalReach);
  };

  const markNotificationRead = async (id: string) => {
    await markNotificationReadSvc(id);
  };

  const value = useMemo<AppContextValue>(
    () => ({
      isAuthenticated: Boolean(firebaseUser),
      authLoading,
      authError,
      isOnline,
      isSyncing,
      syncError,
      restoredFromCache,
      user,
      walletBalance,
      adCredits,
      earningsBalance,
      campaigns,
      availableAds,
      receivedAds,
      notifications,
      markNotificationRead,
      transactions,
      withdrawals,
      referrals,
      appConfig,
      adsViewedToday,
      adsViewLimit: DAILY_EARN_LIMIT,
      totalAdsViewed,
      login,
      logout,
      deleteAccount,
      register,
      createCampaign,
      boostCampaign,
      topUpWallet,
      initializeTopUpPayment,
      verifyTopUpPayment,
      withdrawFunds,
      watchAd,
      toggleReceiveAds,
      updateProfile,
      updateNotificationPrefs: updateNotificationPrefsAction,
      completeProfile: completeProfileAction,
      pauseCampaign,
      resumeCampaign,
      isAdmin,
    }),
    [
      firebaseUser,
      authLoading,
      authError,
      isOnline,
      isSyncing,
      syncError,
      restoredFromCache,
      user,
      walletBalance,
      earningsBalance,
      campaigns,
      availableAds,
      receivedAds,
      notifications,
      markNotificationRead,
      transactions,
      withdrawals,
      referrals,
      appConfig,
      adsViewedToday,
      totalAdsViewed,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
