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
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
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
  const myReferralCode = makeReferralCode(name);

  let referrerId: string | null = null;

  if (referralCode?.trim()) {
    const normalizedReferralCode = referralCode.trim().toUpperCase();
    // Looks up referralCodes/{code} (a get, doc id == the code) — NOT
    // `users` filtered by a `referralCode` field. A collection query like
    // `where('referralCode', '==', code)` against `users` can never be
    // authorized by rules scoped to `request.auth.uid == uid` (the
    // resource path): Firestore rejects it with permission-denied since it
    // can't prove every possible match satisfies an identity rule tied to
    // the document's own id. referralCodes exists specifically so this
    // lookup is a plain, rule-friendly get().
    const referralCodeSnap = await getDoc(doc(db, 'referralCodes', normalizedReferralCode));
    if (!referralCodeSnap.exists()) {
      throw new Error('Referral code not found.');
    }
    referrerId = referralCodeSnap.data().uid ?? null;
    if (referrerId === cred.user.uid) {
      referrerId = null; // can't refer yourself
    }
  }

  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email: email.trim(),
    phone,
    location: 'Ibadan',
    state: null,
    ageRange: null,
    gender: null,
    businessCategory: null,
    profileCompleted: false,
    businessName: '',
    accountType,
    role,
    receivesAds: wantsToReceiveAds,
    isPremium: false,
    emailVerified: false,
    phoneVerified: false,
    avatarInitials: initials(name),
    referralCode: myReferralCode,
    referrerId: referrerId || null,
    walletBalance: 0,
    adCredits: 0,
    earningsBalance: 0,
    adsViewedToday: 0,
    totalAdsViewed: 0,
    lastAdsResetDate: new Date().toISOString().slice(0, 10),
    notificationPrefs: { push: true, email: true, marketing: false },
    createdAt: serverTimestamp(),
  });

  // Mirror our own code into the public, get()-friendly lookup table so a
  // future signup entering this code can resolve it back to our uid.
  await setDoc(doc(db, 'referralCodes', myReferralCode), { uid: cred.user.uid });

  // Record the pending referral so the createCampaign Cloud Function
  // (activateReferralForCampaign) has something to find and activate once
  // this new user funds their first paid campaign.
  if (referrerId) {
    await addDoc(collection(db, 'referrals'), {
      referrerId,
      referredId: cred.user.uid,
      referredName: name,
      status: 'pending',
      reward: 0,
      createdAt: serverTimestamp(),
    });
  }

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

const deleteOwnAccountCallable = httpsCallable<{}, { success: boolean }>(functions, 'deleteOwnAccount');

/** Permanently deletes the signed-in user's account (Firestore doc + Auth record). */
export async function deleteOwnAccount() {
  await deleteOwnAccountCallable({});
}
