import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { WEB_HOST } from '../data/constants';

function makeWaitlistReferralCode(name: string) {
  const base = name.trim().split(' ')[0]?.toUpperCase().replace(/[^A-Z]/g, '') || 'WAIT';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base.slice(0, 6)}${suffix}`;
}

async function resolveReferrer(referralCode: string) {
  const normalized = referralCode.trim().toUpperCase();
  const userQuery = query(collection(db, 'users'), where('referralCode', '==', normalized));
  const userSnap = await getDocs(userQuery);
  if (!userSnap.empty) {
    const docSnap = userSnap.docs[0];
    return {
      source: 'user' as const,
      id: docSnap.id,
      name: docSnap.data()?.name ?? '',
    };
  }

  const waitlistQuery = query(collection(db, 'waitlist'), where('referralCode', '==', normalized));
  const waitlistSnap = await getDocs(waitlistQuery);
  if (!waitlistSnap.empty) {
    const docSnap = waitlistSnap.docs[0];
    return {
      source: 'waitlist' as const,
      id: docSnap.id,
      name: docSnap.data()?.name ?? '',
    };
  }

  return null;
}

export interface WaitlistEntryInput {
  name: string;
  email: string;
  referralCode?: string;
  whatsappNumber: string;
}

export interface WaitlistEntryResult {
  referralCode: string;
  joinLink: string;
}

export async function createWaitlistEntry({ name, email, referralCode, whatsappNumber }: WaitlistEntryInput): Promise<WaitlistEntryResult> {
  const normalizedReferralCode = referralCode?.trim().toUpperCase();

  let referrerId: string | null = null;
  let referrerType: 'user' | 'waitlist' | null = null;
  let referrerName: string | null = null;

  if (normalizedReferralCode) {
    const referrer = await resolveReferrer(normalizedReferralCode);
    if (!referrer) {
      throw new Error('Referral code not found.');
    }
    referrerId = referrer.id;
    referrerType = referrer.source;
    referrerName = referrer.name;
  }

  const generatedReferralCode = makeWaitlistReferralCode(name);
  const entryRef = doc(collection(db, 'waitlist'));

  await setDoc(entryRef, {
    name,
    email: email.trim(),
    whatsappNumber: whatsappNumber.trim(),
    referralCode: generatedReferralCode,
    referredByCode: normalizedReferralCode || null,
    referredById: referrerId || null,
    referredByType: referrerType || null,
    referredByName: referrerName || null,
    status: 'joined',
    createdAt: serverTimestamp(),
  });

  return {
    referralCode: generatedReferralCode,
    joinLink: `${process.env.EXPO_PUBLIC_APP_HOST || WEB_HOST}/waitlist?ref=${generatedReferralCode}`,
  };
}
