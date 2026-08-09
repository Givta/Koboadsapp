import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { WEB_HOST } from '../data/constants';

function makeWaitlistReferralCode(name: string) {
  const base = name.trim().split(' ')[0]?.toUpperCase().replace(/[^A-Z]/g, '') || 'WAIT';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base.slice(0, 6)}${suffix}`;
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
  const normalizedWhatsappNumber = whatsappNumber.trim().replace(/\s+/g, '');

  const generatedReferralCode = makeWaitlistReferralCode(name);
  const entryRef = doc(collection(db, 'waitlist'));

  await setDoc(entryRef, {
    name,
    email: email.trim(),
    whatsappNumber: normalizedWhatsappNumber,
    referralCode: generatedReferralCode,
    referredByCode: normalizedReferralCode || null,
    referredById: null,
    referredByType: null,
    referredByName: null,
    status: 'joined',
    createdAt: serverTimestamp(),
  });

  return {
    referralCode: generatedReferralCode,
    joinLink: `${process.env.EXPO_PUBLIC_APP_HOST || WEB_HOST}/waitlist?ref=${generatedReferralCode}`,
  };
}
