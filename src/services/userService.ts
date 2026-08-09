import { doc, DocumentData, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export interface UserDocState {
  profile: User;
  walletBalance: number;
  earningsBalance: number;
  adsViewedToday: number;
  totalAdsViewed: number;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function mapUserDoc(uid: string, data: DocumentData): UserDocState {
  return {
    profile: {
      id: uid,
      name: data.name ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      location: data.location ?? '',
      businessName: data.businessName ?? '',
      accountType: data.accountType ?? 'exchange',
      role: data.role ?? 'user',
      receivesAds: data.receivesAds ?? true,
      isPremium: data.isPremium ?? false,
      emailVerified: false,
      phoneVerified: false,
      avatarInitials: data.avatarInitials ?? 'U',
      referralCode: data.referralCode ?? '',
      adCredits: data.adCredits ?? 0,
      referrerId: data.referrerId ?? null,
    },
    walletBalance: data.walletBalance ?? 0,
    earningsBalance: data.earningsBalance ?? 0,
    adsViewedToday: data.lastAdsResetDate === todayStr() ? data.adsViewedToday ?? 0 : 0,
    totalAdsViewed: data.totalAdsViewed ?? 0,
  };
}

export function listenUser(uid: string, cb: (state: UserDocState) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) return;
    cb(mapUserDoc(uid, snap.data()));
  });
}

/** Rolls adsViewedToday back to 0 in Firestore once a new day starts. */
export async function ensureDailyReset(uid: string) {
  const today = todayStr();
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'users', uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.lastAdsResetDate !== today) {
      tx.update(ref, { adsViewedToday: 0, lastAdsResetDate: today });
    }
  });
}

export async function setReceivesAds(uid: string, value: boolean) {
  await updateDoc(doc(db, 'users', uid), {
    receivesAds: value,
    accountType: value ? 'exchange' : 'paid',
  });
}

export async function updateProfileFields(uid: string, patch: Partial<Pick<User, 'name' | 'phone' | 'location' | 'businessName'>>) {
  await updateDoc(doc(db, 'users', uid), patch);
}
