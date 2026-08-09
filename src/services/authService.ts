import {
  ApplicationVerifier,
  ConfirmationResult,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  linkWithCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AccountType, UserRole } from '../types';

function makeReferralCode(name: string) {
  const base = name.trim().split(' ')[0]?.toUpperCase().replace(/[^A-Z]/g, '') || 'KOBO';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base.slice(0, 6)}${suffix}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  wantsToReceiveAds: boolean;
  referralCode?: string;
}

export async function registerUser({ name, email, phone, password, wantsToReceiveAds, referralCode }: RegisterInput) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name });

  const accountType: AccountType = wantsToReceiveAds ? 'exchange' : 'paid';
  const role: UserRole = wantsToReceiveAds ? 'user' : 'advertiser';

  let referrerId: string | null = null;
  let normalizedReferralCode: string | null = null;

  if (referralCode?.trim()) {
    normalizedReferralCode = referralCode.trim().toUpperCase();
    const referralQuery = query(collection(db, 'users'), where('referralCode', '==', normalizedReferralCode));
    const referralSnap = await getDocs(referralQuery);
    if (referralSnap.empty) {
      throw new Error('Referral code not found.');
    }
    referrerId = referralSnap.docs[0].id;
  }

  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email: email.trim(),
    phone,
    location: 'Ibadan',
    businessName: '',
    accountType,
    role,
    receivesAds: wantsToReceiveAds,
    isPremium: false,
    avatarInitials: initials(name),
    referralCode: makeReferralCode(name),
    referrerId: referrerId || null,
    walletBalance: 0,
    adCredits: 0,
    earningsBalance: 0,
    adsViewedToday: 0,
    lastAdsResetDate: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
  });

  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function sendVerificationEmail() {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Not signed in.');
  }
  await sendEmailVerification(current);
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function requestPhoneVerification(phone: string, verifier: ApplicationVerifier) {
  const confirmation: ConfirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
  return confirmation.verificationId;
}

export async function linkPhoneVerification(verificationId: string, code: string) {
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Not signed in.');
  }
  const credential = PhoneAuthProvider.credential(verificationId, code);
  await linkWithCredential(current, credential);
  return current;
}

export async function loginUser(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export function subscribeAuth(cb: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb);
}
