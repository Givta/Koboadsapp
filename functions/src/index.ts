import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  getFirestore,
  FieldValue,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v2';

initializeApp();

const db = getFirestore();
/**
 * Simple error logging helper: writes to `errorLogs` collection for ops/monitoring.
 */
async function logError(err: any, context: any = null) {
  try {
    await db.collection('errorLogs').doc().set({
      error: typeof err === 'string' ? err : err?.message ?? String(err),
      stack: err?.stack ?? null,
      context: context,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    // best-effort
    console.error('Failed to write error log', e);
  }
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function sendExpoPushNotifications(tokens: string[], message: PushMessage) {
  if (!tokens.length) return;

  const validTokens = tokens.filter((token) => typeof token === 'string' && token.startsWith('ExponentPushToken'));
  if (!validTokens.length) return;

  const body = validTokens.map((token) => ({
    to: token,
    title: message.title,
    body: message.body,
    data: message.data || {},
  }));

  const chunks: Array<typeof body> = [];
  for (let i = 0; i < body.length; i += 100) {
    chunks.push(body.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logError(new Error(`Expo push failed: ${response.status} ${response.statusText}`), {
          expoResponse: errorText,
          tokens: validTokens,
        });
        continue;
      }

      const json = await response.json();
      if (json.data?.some((item: any) => item.status !== 'ok')) {
        await logError(new Error('Expo push returned one or more failures'), {
          expoResult: json,
          tokens: validTokens,
        });
      }
    } catch (err) {
      await logError(err, { fn: 'sendExpoPushNotifications', tokenCount: validTokens.length });
    }
  }
}

/**
 * Persists a copy of every push notification into `notifications/{uid}` so
 * the in-app notification center (the bell icon on Home) has something to
 * show — Expo push delivery is fire-and-forget and gives the app nothing to
 * display once the OS notification banner disappears.
 */
async function persistNotification(userId: string, message: PushMessage) {
  try {
    await db.collection('notifications').add({
      userId,
      type: message.data?.type ?? 'general',
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    await logError(err, { fn: 'persistNotification', userId });
  }
}

async function sendPushNotificationToUser(userId: string, message: PushMessage) {
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) return;

  const userData = userSnap.data() || {};
  const tokens = Array.isArray(userData.pushTokens) ? userData.pushTokens : [];
  await sendExpoPushNotifications(tokens, message);
  await persistNotification(userId, message);
}

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_REDIRECT_URL = process.env.FLUTTERWAVE_REDIRECT_URL || 'https://koboads.com/payment-complete';

async function initializeFlutterwavePayment(amount: number, email: string, name: string, reference: string) {
  if (!FLUTTERWAVE_SECRET_KEY) {
    throw new Error('Flutterwave secret key is not configured.');
  }

  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount: amount.toFixed(2),
      currency: 'NGN',
      redirect_url: FLUTTERWAVE_REDIRECT_URL,
      customer: {
        email,
        phonenumber: '',
        name,
      },
      customizations: {
        title: 'KoboAds Wallet Top Up',
        description: 'Add money to your KoboAds wallet',
      },
      meta: {
        payment_type: 'wallet_topup',
      },
    }),
  });

  const json = await response.json();
  if (!response.ok || !json?.status || !json?.data?.link) {
    throw new Error(json?.message || 'Could not initialize payment.');
  }

  return { authorizationUrl: json.data.link, reference };
}

export const initializeTopUpPayment = functions.https.onCall(async (request: functions.https.CallableRequest<{ amount: number }>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const amount = Number(request.data.amount || 0);
  if (amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than zero.');
  }

  if (!FLUTTERWAVE_SECRET_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'Payment gateway is not configured.');
  }

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found.');
  }

  const userData = userSnap.data() || {};
  const email = String(userData.email || '');
  const name = String(userData.name || 'KoboAds User');
  if (!email) {
    throw new functions.https.HttpsError('failed-precondition', 'User email is required to initialize payment.');
  }

  const reference = `topup_${uid}_${Date.now()}`;
  try {
    const result = await initializeFlutterwavePayment(amount, email, name, reference);
    await db.collection('paymentRecords').doc(reference).set({
      userId: uid,
      amount,
      status: 'initialized',
      gateway: 'flutterwave',
      reference,
      redirectUrl: FLUTTERWAVE_REDIRECT_URL,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { authorizationUrl: result.authorizationUrl, reference: result.reference };
  } catch (error) {
    await logError(error, { fn: 'initializeTopUpPayment', uid, amount });
    throw new functions.https.HttpsError('internal', 'Could not initialize top up payment.');
  }
});

export const verifyTopUpPayment = functions.https.onCall(async (request: functions.https.CallableRequest<{ reference: string }>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const reference = String(request.data.reference || '').trim();
  if (!reference) {
    throw new functions.https.HttpsError('invalid-argument', 'Payment reference is required.');
  }

  if (!FLUTTERWAVE_SECRET_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'Payment gateway is not configured.');
  }

  const paymentRef = db.collection('paymentRecords').doc(reference);
  const paymentSnap = await paymentRef.get();
  const paymentData = paymentSnap.data() || {};

  if (!paymentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Payment record not found.');
  }

  // Critical: without this check, anyone who learns another user's payment
  // reference (redirect URL, logs, etc.) could call verifyTopUpPayment with
  // it and have that completed payment credited to THEIR OWN wallet instead
  // — the reference alone isn't proof of ownership, only Firestore's record
  // of who actually initialized it is.
  if (paymentData.userId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'This payment does not belong to your account.');
  }

  if (paymentData.status === 'success') {
    return { success: true };
  }

  const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_txref?tx_ref=${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      Accept: 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok || !json?.status) {
    await paymentRef.set({ status: 'failed', verifiedAt: FieldValue.serverTimestamp(), response: json }, { merge: true });
    throw new functions.https.HttpsError('failed-precondition', json?.message || 'Payment verification failed.');
  }

  const data = json.data;
  if (data.status !== 'successful') {
    await paymentRef.set({ status: data.status, verifiedAt: FieldValue.serverTimestamp(), response: data }, { merge: true });
    throw new functions.https.HttpsError('failed-precondition', 'Payment is not complete.');
  }

  const amountNaira = Number(data.amount);
  const expectedAmount = Number(paymentData.amount || 0);
  if (data.currency !== 'NGN' || !Number.isFinite(amountNaira) || Math.abs(amountNaira - expectedAmount) > 1) {
    await paymentRef.set(
      { status: 'mismatch', verifiedAt: FieldValue.serverTimestamp(), response: data },
      { merge: true }
    );
    await logError('Payment amount/currency mismatch', { reference, expectedAmount, gatewayAmount: amountNaira, currency: data.currency });
    throw new functions.https.HttpsError('failed-precondition', 'Payment details do not match — contact support.');
  }

  const userRef = db.collection('users').doc(uid);
  const txRef = db.collection('transactions').doc();
  const batch = db.batch();

  batch.set(paymentRef, {
    userId: uid,
    amount: amountNaira,
    status: 'success',
    gateway: 'flutterwave',
    reference,
    verifiedAt: FieldValue.serverTimestamp(),
    flutterwaveResponse: data,
  }, { merge: true });

  batch.update(userRef, { walletBalance: FieldValue.increment(amountNaira) });
  batch.set(txRef, {
    userId: uid,
    type: 'topup',
    title: 'Wallet top up',
    amount: amountNaira,
    status: 'success',
    paymentReference: reference,
    gateway: 'flutterwave',
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { success: true };
});

const REFERRAL_REWARD_NAIRA = 500;
// Number of ad views by the referred user required to activate the referral reward.
const REFERRAL_TRIGGER_VIEWS = 4;

// --- KoboAds agreement constants (mirrors src/data/constants.ts) ---------
// "Each participating user can send up to 2 advertisements per day" — this
// caps free/exchange campaign CREATION per advertiser per day. Paid
// campaigns are uncapped (that's the whole point of paying).
const DAILY_FREE_CAMPAIGN_LIMIT = 2;
// "Each advertisement can target/distribute to up to 1,000 different
// eligible users" for the free/exchange tier specifically.
const FREE_CAMPAIGN_MAX_REACH = 1000;
// "A participating user can receive a maximum of 2 advertisements per day"
// — this caps how many ads a RECIPIENT gets across all campaigns, enforced
// in distributeCampaignToUsers below.
const DAILY_RECEIVE_LIMIT = 2;
const DEFAULT_COST_PER_REACH_NAIRA = 0.8;
const DEFAULT_REWARD_PER_AD_NAIRA = 40;

interface AppConfigSettings {
  costPerReachNaira: number;
  rewardPerAdNaira: number;
}

/**
 * Reads appConfig/settings (populated by scripts/seedFirestore.js or the
 * admin dashboard) so pricing can be tuned without redeploying functions.
 * Falls back to the defaults above if it was never seeded.
 */
async function getAppConfig(): Promise<AppConfigSettings> {
  try {
    const snap = await db.collection('appConfig').doc('settings').get();
    const data = snap.exists ? snap.data() || {} : {};
    return {
      costPerReachNaira: typeof data.costPerReachNaira === 'number' ? data.costPerReachNaira : DEFAULT_COST_PER_REACH_NAIRA,
      rewardPerAdNaira: typeof data.rewardPerAdNaira === 'number' ? data.rewardPerAdNaira : DEFAULT_REWARD_PER_AD_NAIRA,
    };
  } catch {
    return { costPerReachNaira: DEFAULT_COST_PER_REACH_NAIRA, rewardPerAdNaira: DEFAULT_REWARD_PER_AD_NAIRA };
  }
}

interface CampaignPayload {
  advertiserId: string;
  title: string;
  description: string;
  category?: string;
  location?: string;
  ageRange?: string;
  gender?: string;
  businessName?: string;
  websiteLink?: string;
  contact?: string;
  callToAction?: string;
  targetReach: number;
  spent: number;
  campaignType: 'paid' | 'exchange';
  imageColor?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaStoragePath?: string;
  status?: string;
}

async function activateReferralForCampaign(campaignId: string, campaign: CampaignPayload) {
  if (campaign.campaignType !== 'paid') {
    return;
  }

  const referrerQuery = await db.collection('referrals')
    .where('referredId', '==', campaign.advertiserId)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (referrerQuery.empty) {
    return;
  }

  const referralSnap = referrerQuery.docs[0];
  const referralData = referralSnap.data();
  const referrerId = referralData.referrerId;
  if (!referrerId || referrerId === campaign.advertiserId) {
    return;
  }

  const referrerRef = db.collection('users').doc(referrerId);
  const txRef = db.collection('transactions').doc();
  const batch = db.batch();

  batch.update(referralSnap.ref, {
    status: 'active',
    reward: REFERRAL_REWARD_NAIRA,
    activatedAt: FieldValue.serverTimestamp(),
    activatedCampaignId: campaignId,
  });
  batch.update(referrerRef, {
    adCredits: FieldValue.increment(REFERRAL_REWARD_NAIRA),
  });
  batch.set(txRef, {
    userId: referrerId,
    type: 'referral',
    title: 'Referral advertising credit',
    amount: REFERRAL_REWARD_NAIRA,
    status: 'success',
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  await sendPushNotificationToUser(referrerId, {
    title: 'Referral reward activated',
    body: `You earned ${REFERRAL_REWARD_NAIRA} Kobo Credits for a successful referral.`,
    data: { type: 'referral_reward', campaignId },
  });
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export const createCampaign = functions.https.onCall(async (request: functions.https.CallableRequest<CampaignPayload>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to create a campaign.');
  }

  if (uid !== data.advertiserId) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot create a campaign for another user.');
  }

  if (!data.title?.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'A title is required.');
  }

  const estimatedCost = data.campaignType === 'paid' ? Math.max(0, Math.round(data.targetReach * 0.8)) : 0;
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data() || {};
  const walletBalance = Number(userData.walletBalance || 0);
  const receivesAds = Boolean(userData.receivesAds);

  if (data.campaignType === 'exchange' && !receivesAds) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Exchange campaigns require receiving ads from others. Switch to paid advertising or enable exchange ads in your settings.'
    );
  }

  if (data.campaignType === 'exchange') {
    // "Each advertisement can target/distribute to up to 1,000 different
    // eligible users" for the free tier — enforced server-side regardless of
    // what the client sent, since the client is never trusted for limits.
    if (data.targetReach > FREE_CAMPAIGN_MAX_REACH) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Free campaigns can reach up to ${FREE_CAMPAIGN_MAX_REACH.toLocaleString()} people. Choose a smaller audience, or switch to paid advertising for more reach.`
      );
    }

    // "Each participating user can send up to 2 advertisements per day."
    const todaysFreeCampaigns = await db.collection('campaigns')
      .where('advertiserId', '==', uid)
      .where('campaignType', '==', 'exchange')
      .where('createdAt', '>=', Timestamp.fromDate(startOfToday()))
      .get();
    if (todaysFreeCampaigns.size >= DAILY_FREE_CAMPAIGN_LIMIT) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `You've used your ${DAILY_FREE_CAMPAIGN_LIMIT} free campaigns for today. Come back tomorrow, or switch to paid advertising to send more now.`
      );
    }
  }

  if (data.campaignType === 'paid' && estimatedCost > walletBalance) {
    throw new functions.https.HttpsError('failed-precondition', 'Insufficient wallet balance for this campaign.');
  }

  if (data.mediaStoragePath) {
    const moderationSnap = await db.collection('mediaModeration')
      .where('storagePath', '==', data.mediaStoragePath)
      .limit(1)
      .get();

    if (moderationSnap.empty) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Uploaded media must be submitted for moderation before the campaign can be created.'
      );
    }

    const moderationRecord = moderationSnap.docs[0].data();
    if (moderationRecord.status !== 'approved') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Uploaded media is not approved yet. Please wait for moderation before creating the campaign.'
      );
    }
  }

  const campaignRef = db.collection('campaigns').doc();
  const campaignId = campaignRef.id;

  const batch = db.batch();
  batch.set(campaignRef, {
    advertiserId: uid,
    title: data.title,
    description: data.description,
    category: data.category || 'General',
    location: data.location || 'All Nigeria',
    ageRange: data.ageRange || '18+',
    gender: data.gender || 'All',
    businessName: data.businessName || '',
    websiteLink: data.websiteLink || '',
    contact: data.contact || '',
    callToAction: data.callToAction || 'Learn More',
    targetReach: data.targetReach,
    delivered: 0,
    opened: 0,
    clicked: 0,
    spent: estimatedCost,
    status: 'pending_approval',
    campaignType: data.campaignType,
    imageColor: data.imageColor || '#2563EB',
    mediaUrl: data.mediaUrl || null,
    mediaType: data.mediaType || null,
    mediaStoragePath: data.mediaStoragePath || null,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (data.campaignType === 'paid' && estimatedCost > 0) {
    batch.update(db.collection('users').doc(uid), {
      walletBalance: FieldValue.increment(-estimatedCost),
    });
    batch.set(db.collection('transactions').doc(), {
      userId: uid,
      type: 'spend',
      title: `${data.title} campaign`,
      amount: -estimatedCost,
      status: 'success',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  // "All ads with a personal link that leads to any web should wait for
  // admin approval, but any other link can auto-approve." — websiteLink is
  // the one arbitrary, advertiser-controlled URL we send people to; contact
  // info (phone/WhatsApp text) isn't a clickable destination the same way,
  // so it doesn't carry the same review need.
  const requiresApproval = Boolean(data.websiteLink && data.websiteLink.trim());

  if (requiresApproval) {
    await db.collection('campaigns').doc(campaignId).update({ status: 'pending_approval' });
    return { success: true, campaignId, status: 'pending_approval' };
  }

  await db.collection('campaigns').doc(campaignId).update({ status: 'active' });
  const freshSnap = await db.collection('campaigns').doc(campaignId).get();
  const freshCampaign = freshSnap.data() as CampaignPayload;
  await distributeCampaignToUsers(campaignId, freshCampaign);
  await activateReferralForCampaign(campaignId, freshCampaign);

  return { success: true, campaignId, status: 'active' };
});

export const boostCampaign = functions.https.onCall(async (request: functions.https.CallableRequest<{ campaignId: string; additionalReach: number }>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to boost a campaign.');
  }

  const additionalReach = Math.floor(Number(data.additionalReach));
  if (!Number.isFinite(additionalReach) || additionalReach <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Choose how many more people to reach.');
  }

  const campaignRef = db.collection('campaigns').doc(data.campaignId);
  const campaignSnap = await campaignRef.get();
  if (!campaignSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Campaign not found.');
  }

  const campaign = campaignSnap.data() as CampaignPayload & { delivered?: number; status?: string };
  if (campaign.advertiserId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You can only boost your own campaigns.');
  }
  if (campaign.status !== 'active' && campaign.status !== 'paused') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Only active or paused campaigns can be boosted — this one is still pending approval or has ended.'
    );
  }

  const config = await getAppConfig();
  const cost = Math.round(additionalReach * config.costPerReachNaira);

  // Boosting is always a paid action — it's the "pay to go beyond the free
  // limits" half of the agreement, regardless of whether the campaign
  // started as free/exchange or paid.
  await db.runTransaction(async (tx) => {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    const walletBalance = Number(userSnap.data()?.walletBalance || 0);
    if (cost > walletBalance) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient wallet balance to boost this campaign.');
    }

    tx.update(userRef, { walletBalance: FieldValue.increment(-cost) });
    tx.update(campaignRef, {
      targetReach: FieldValue.increment(additionalReach),
      spent: FieldValue.increment(cost),
      boostedReach: FieldValue.increment(additionalReach),
    });
    tx.set(db.collection('transactions').doc(), {
      userId: uid,
      type: 'spend',
      title: `Boost: ${campaign.title || 'campaign'} (+${additionalReach.toLocaleString()} reach)`,
      amount: -cost,
      status: 'success',
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  const alreadyDelivered = Number(campaign.delivered || 0);
  const newTargetReach = campaign.targetReach + additionalReach;
  const delivered = await distributeCampaignToUsers(
    data.campaignId,
    { ...campaign, targetReach: newTargetReach },
    alreadyDelivered
  );

  await sendPushNotificationToUser(uid, {
    title: 'Campaign boosted',
    body: `${campaign.title || 'Your campaign'} is now reaching ${newTargetReach.toLocaleString()} people.`,
    data: { type: 'campaign_boosted', campaignId: data.campaignId },
  });

  return { success: true, campaignId: data.campaignId, newTargetReach, delivered };
});

export const approveCampaign = functions.https.onCall(async (request: functions.https.CallableRequest<{ campaignId: string }>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const campaignSnap = await db.collection('campaigns').doc(data.campaignId).get();
  if (!campaignSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Campaign not found.');
  }

  const campaign = campaignSnap.data() || {};
  const isAdmin = Boolean(request.auth?.token?.admin);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can approve campaigns.');
  }

  await campaignSnap.ref.update({ status: 'active' });
  await distributeCampaignToUsers(campaignSnap.id, campaign as CampaignPayload);
  await activateReferralForCampaign(campaignSnap.id, campaign as CampaignPayload);

  await sendPushNotificationToUser(campaign.advertiserId, {
    title: 'Campaign approved',
    body: `${campaign.title || 'Your campaign'} is now active and ready to deliver ads.`,
    data: { type: 'campaign_approved', campaignId: campaignSnap.id },
  });

  return { success: true };
});

export const approveMedia = functions.https.onCall(async (request: functions.https.CallableRequest<{ mediaId: string }>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const isAdmin = Boolean(request.auth?.token?.admin);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can approve media uploads.');
  }

  const mediaRef = db.collection('mediaModeration').doc(data.mediaId);
  const mediaSnap = await mediaRef.get();
  if (!mediaSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Media moderation record not found.');
  }

  await mediaRef.update({
    status: 'approved',
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: uid,
  });

  return { success: true };
});

/**
 * Admin-only callable returning basic dashboard metrics used by the Admin UI.
 */
export const getDashboardMetrics = functions.https.onCall(async (request: functions.https.CallableRequest<{}>) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  const isAdmin = Boolean(request.auth?.token?.admin);
  if (!isAdmin) throw new functions.https.HttpsError('permission-denied', 'Only admins can access metrics.');

  try {
    const [usersSnap, campaignsSnap, paidCampaignsSnap, adDeliveriesSnap, transactionsSnap, withdrawalsSnap, errorsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('campaigns').get(),
      db.collection('campaigns').where('campaignType', '==', 'paid').get(),
      db.collection('adDeliveries').get(),
      db.collection('transactions').get(),
      db.collection('withdrawals').get(),
      db.collection('errorLogs').orderBy('createdAt', 'desc').limit(50).get(),
    ]);

    // basic aggregates
    const totalUsers = usersSnap.size;
    const totalCampaigns = campaignsSnap.size;
    const totalPaidCampaigns = paidCampaignsSnap.size;
    const totalDeliveries = adDeliveriesSnap.size;
    const transactionsCount = transactionsSnap.size;
    const withdrawalsCount = withdrawalsSnap.size;

    // sum of successful payouts (withdrawals) and recent errors
    let totalPayouts = 0;
    withdrawalsSnap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      const data = d.data();
      if (data.status === 'success' && typeof data.amount === 'number') totalPayouts += data.amount;
    });

    const recentErrors = errorsSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...(d.data() || {}) }));

    return {
      totalUsers,
      totalCampaigns,
      totalPaidCampaigns,
      totalDeliveries,
      transactionsCount,
      withdrawalsCount,
      totalPayouts,
      recentErrors,
    };
  } catch (err) {
    await logError(err, { fn: 'getDashboardMetrics', uid });
    throw new functions.https.HttpsError('internal', 'Failed to compute metrics');
  }
});

export const rejectMedia = functions.https.onCall(async (request: functions.https.CallableRequest<{ mediaId: string; reason: string }>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const isAdmin = Boolean(request.auth?.token?.admin);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can reject media uploads.');
  }

  if (!data.reason?.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'A rejection reason is required.');
  }

  const mediaRef = db.collection('mediaModeration').doc(data.mediaId);
  const mediaSnap = await mediaRef.get();
  if (!mediaSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Media moderation record not found.');
  }

  await mediaRef.update({
    status: 'rejected',
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: uid,
    rejectionReason: data.reason,
  });

  return { success: true };
});

export const rejectCampaign = functions.https.onCall(async (request: functions.https.CallableRequest<{ campaignId: string; reason: string }>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const isAdmin = Boolean(request.auth?.token?.admin);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can reject campaigns.');
  }

  if (!data.reason?.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'A rejection reason is required.');
  }

  const campaignRef = db.collection('campaigns').doc(data.campaignId);
  const campaignSnap = await campaignRef.get();
  if (!campaignSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Campaign not found.');
  }
  const campaignData = campaignSnap.data() || {};

  await campaignRef.update({
    status: 'rejected',
    rejectedBy: uid,
    rejectionReason: data.reason,
  });

  if (campaignData.advertiserId) {
    await sendPushNotificationToUser(campaignData.advertiserId, {
      title: 'Campaign rejected',
      body: `${campaignData.title || 'Your campaign'} wasn't approved: ${data.reason}`,
      data: { type: 'campaign_rejected', campaignId: data.campaignId },
    });
  }

  return { success: true };
});

export const reportAbuse = functions.https.onCall(async (request: functions.https.CallableRequest<{ reportedCampaignId?: string; reportedUserId?: string; type: string; details: string }>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to report abuse.');
  }

  if (!data.type || typeof data.type !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Report type is required.');
  }

  if (!data.details || typeof data.details !== 'string' || !data.details.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Report details are required.');
  }

  if (data.reportedCampaignId && typeof data.reportedCampaignId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid campaign reference.');
  }

  if (data.reportedUserId && typeof data.reportedUserId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid user reference.');
  }

  const reportRef = db.collection('abuseReports').doc();
  await reportRef.set({
    reporterId: uid,
    reportedCampaignId: data.reportedCampaignId || null,
    reportedUserId: data.reportedUserId || null,
    type: data.type,
    details: data.details.trim(),
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });

  if (data.reportedCampaignId && ['spam', 'fraud'].includes(data.type)) {
    const campaignRef = db.collection('campaigns').doc(data.reportedCampaignId);
    const campaignSnap = await campaignRef.get();
    if (campaignSnap.exists) {
      const campaign = campaignSnap.data() || {};
      if (campaign.status === 'active' || campaign.status === 'pending_approval') {
        await campaignRef.update({ status: 'paused', safetyFlag: 'auto_suspicious_report' });
      }
    }
  }

  return { success: true, reportId: reportRef.id };
});

export const resolveAbuseReport = functions.https.onCall(async (request: functions.https.CallableRequest<{ reportId: string; resolution: 'reviewed' | 'dismissed' | 'actioned'; note?: string }>) => {
  const data = request.data;
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const isAdmin = Boolean(request.auth?.token?.admin);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can resolve abuse reports.');
  }

  if (!data.reportId || typeof data.reportId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'A report ID is required.');
  }

  if (!data.resolution || !['reviewed', 'dismissed', 'actioned'].includes(data.resolution)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid resolution is required.');
  }

  const reportRef = db.collection('abuseReports').doc(data.reportId);
  const reportSnap = await reportRef.get();
  if (!reportSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Abuse report not found.');
  }

  await reportRef.update({
    status: data.resolution,
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy: uid,
    resolutionNote: data.note || null,
  });

  return { success: true };
});

/**
 * Admin-only manual wallet credit (goodwill credits, refund corrections,
 * support-driven adjustments) — NOT a general top-up path. It used to be
 * callable by any signed-in user as a client-side fallback for when
 * Flutterwave wasn't configured, which meant literally free, unverified
 * money for anyone who called it. Now that real payments exist
 * (initializeTopUpPayment / verifyTopUpPayment above), that fallback is a
 * liability rather than a convenience — it stays as an admin tool only.
 */
export const topUpWallet = functions.https.onCall(async (request: functions.https.CallableRequest<{ amount: number; targetUserId?: string; note?: string }>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const isAdmin = Boolean(request.auth?.token?.admin);
  if (!isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Manual wallet credit is an admin-only action. Use the regular top-up flow instead.'
    );
  }

  const amount = Number(request.data.amount || 0);
  if (amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than zero.');
  }

  const targetUserId = request.data.targetUserId || uid;
  const userRef = db.collection('users').doc(targetUserId);
  const batch = db.batch();
  batch.update(userRef, { walletBalance: FieldValue.increment(amount) });
  batch.set(db.collection('transactions').doc(), {
    userId: targetUserId,
    type: 'topup',
    title: request.data.note ? `Manual credit: ${request.data.note}` : 'Manual wallet credit (admin)',
    amount,
    status: 'success',
    creditedBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { success: true };
});

export const withdrawFunds = functions.https.onCall(async (request: functions.https.CallableRequest<{ amount: number; method: string }>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const amount = Number(request.data.amount || 0);
  if (amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than zero.');
  }

  const method = request.data.method || 'bank';
  const userRef = db.collection('users').doc(uid);

  // A plain read-then-batch-write has a race: two withdrawal requests fired
  // close together could both read the same starting balance and both pass
  // the "sufficient funds" check before either write commits, overdrawing
  // the account. runTransaction() makes the read+check+write atomic —
  // Firestore retries the whole thing if the balance changed underneath it.
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const userData = userSnap.data() || {};
    const earningsBalance = Number(userData.earningsBalance || 0);

    if (amount > earningsBalance) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient earnings balance.');
    }

    tx.update(userRef, { earningsBalance: FieldValue.increment(-amount) });
    tx.set(db.collection('withdrawals').doc(), {
      userId: uid,
      amount,
      method,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection('transactions').doc(), {
      userId: uid,
      type: 'withdraw',
      title: `Withdrawal to ${method}`,
      amount: -amount,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

export const watchAd = functions.https.onCall(async (request: functions.https.CallableRequest<{ deliveryId: string }>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const deliveryRef = db.collection('adDeliveries').doc(request.data.deliveryId);
  const deliverySnap = await deliveryRef.get();
  if (!deliverySnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Delivery not found.');
  }

  const delivery = deliverySnap.data() || {};
  if (delivery.userId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You can only watch your own deliveries.');
  }

  if (delivery.status !== 'delivered') {
    throw new functions.https.HttpsError('failed-precondition', 'This ad has already been handled.');
  }

  const todayStart = startOfToday();
  const recentDeliveries = await db.collection('adDeliveries')
    .where('userId', '==', uid)
    .where('deliveredAt', '>=', Timestamp.fromDate(todayStart))
    .where('status', 'in', ['opened', 'delivered'])
    .get();

  const dailyCount = recentDeliveries.size;
  if (dailyCount >= 10) {
    throw new functions.https.HttpsError('resource-exhausted', 'Daily viewing limit reached.');
  }

  const reward = Number(delivery.reward || 0);
  const batch = db.batch();
  const userRef = db.collection('users').doc(uid);
  batch.update(userRef, {
    earningsBalance: FieldValue.increment(reward),
    adsViewedToday: FieldValue.increment(1),
    totalAdsViewed: FieldValue.increment(1),
    lastAdsResetDate: Timestamp.fromDate(new Date()),
  });
  batch.update(deliveryRef, {
    status: 'opened',
    openedAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection('transactions').doc(), {
    userId: uid,
    type: 'earn',
    title: 'Ad viewing reward',
    amount: reward,
    status: 'success',
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  // After committing the ad view, check if this user is a referred user with
  // a pending referral. If they've reached the configured view threshold,
  // activate the referral and credit the referrer with Kobo Credits.
  try {
    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.exists ? (userSnap.data() || {}) : {};
    const totalAdsViewed = Number(userData.totalAdsViewed || 0);

    if (totalAdsViewed >= REFERRAL_TRIGGER_VIEWS) {
      const refQuery = await db.collection('referrals')
        .where('referredId', '==', uid)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (!refQuery.empty) {
        const refSnap = refQuery.docs[0];
        const refData = refSnap.data() || {};
        const referrerId = refData.referrerId;

        if (referrerId && referrerId !== uid) {
          const batch2 = db.batch();
          const referrerRef = db.collection('users').doc(referrerId);
          const txRef = db.collection('transactions').doc();

          batch2.update(refSnap.ref, {
            status: 'active',
            reward: REFERRAL_REWARD_NAIRA,
            activatedAt: FieldValue.serverTimestamp(),
            activatedByViews: totalAdsViewed,
          });

          batch2.update(referrerRef, {
            adCredits: FieldValue.increment(REFERRAL_REWARD_NAIRA),
          });

          batch2.set(txRef, {
            userId: referrerId,
            type: 'referral',
            title: 'Referral advertising credit',
            amount: REFERRAL_REWARD_NAIRA,
            status: 'success',
            createdAt: FieldValue.serverTimestamp(),
          });

          await batch2.commit();

          await sendPushNotificationToUser(referrerId, {
            title: 'Referral reward activated',
            body: `You earned ${REFERRAL_REWARD_NAIRA} Kobo Credits after your friend viewed ${totalAdsViewed} ads.`,
            data: { type: 'referral_reward', referredId: uid },
          });
        }
      }
    }
  } catch (e) {
    // Non-fatal: if referral activation fails, we don't want to roll back the
    // ad reward. Log and continue (admin can review referrals manually).
    console.error('Referral activation error:', e);
  }

  return { success: true };
});

async function distributeCampaignToUsers(campaignId: string, campaign: CampaignPayload, alreadyDelivered = 0) {
  const config = await getAppConfig();
  const remainingTarget = Math.max(0, campaign.targetReach - alreadyDelivered);
  if (remainingTarget <= 0) return 0;

  const usersSnap = await db.collection('users').where('receivesAds', '==', true).get();
  const todayStart = Timestamp.fromDate(startOfToday());
  const batch = db.batch();
  let count = 0;
  const notifiedTokens: string[] = [];
  const deliveredUserIds: string[] = [];

  for (const userDoc of usersSnap.docs) {
    if (count >= remainingTarget) break;
    const userData = userDoc.data() || {};
    if (userDoc.id === campaign.advertiserId) continue;
    if (campaign.location && campaign.location !== 'All Nigeria' && userData.location !== campaign.location) continue;
    if (campaign.gender && campaign.gender !== 'All' && userData.gender !== campaign.gender) continue;

    // Never deliver the same campaign to the same person twice (matters for
    // boosts, which call this again on a campaign that already has deliveries).
    const existing = await db.collection('adDeliveries')
      .where('campaignId', '==', campaignId)
      .where('userId', '==', userDoc.id)
      .get();
    if (!existing.empty) continue;

    // "A participating user can receive a maximum of 2 advertisements per
    // day" — across ALL campaigns, not just this one.
    const todayCount = await db.collection('adDeliveries')
      .where('userId', '==', userDoc.id)
      .where('deliveredAt', '>=', todayStart)
      .get();
    if (todayCount.size >= DAILY_RECEIVE_LIMIT) continue;

    const deliveryRef = db.collection('adDeliveries').doc();
    batch.set(deliveryRef, {
      campaignId,
      userId: userDoc.id,
      status: 'delivered',
      reward: config.rewardPerAdNaira,
      deliveredAt: FieldValue.serverTimestamp(),
      openedAt: null,
      clickedAt: null,
    });
    count += 1;
    deliveredUserIds.push(userDoc.id);

    if (Array.isArray(userData.pushTokens)) {
      notifiedTokens.push(...userData.pushTokens.filter((t: unknown) => typeof t === 'string'));
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  // increment(), not overwrite — this function can run more than once for
  // the same campaign (a boost tops up an already-partially-delivered one).
  await db.collection('campaigns').doc(campaignId).update({ delivered: FieldValue.increment(count) });

  // "The user taps the notification and opens the advertisement inside
  // KoboAds" — this is the actual "push" half of the free/exchange
  // advertising agreement, previously missing entirely: deliveries were
  // created silently with nothing telling the recipient an ad had arrived.
  // One batched call for everyone who just got this campaign (same content
  // for all of them); the client resolves campaignId -> their own delivery
  // via the Earn tab when the notification is tapped.
  if (notifiedTokens.length > 0) {
    await sendExpoPushNotifications(notifiedTokens, {
      title: '🔔 New sponsored message',
      body: campaign.title || 'A new ad is waiting for you in Earn.',
      data: { type: 'ad_delivered', campaignId },
    });
  }

  if (deliveredUserIds.length > 0) {
    const notifyBatch = db.batch();
    deliveredUserIds.forEach((recipientId) => {
      notifyBatch.set(db.collection('notifications').doc(), {
        userId: recipientId,
        type: 'ad_delivered',
        title: '🔔 New sponsored message',
        body: campaign.title || 'A new ad is waiting for you in Earn.',
        data: { type: 'ad_delivered', campaignId },
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await notifyBatch.commit();
  }

  return count;
}

export const cleanupExpiredDeliveries = functions.scheduler.onSchedule({
  schedule: 'every 24 hours',
}, async (_event: any) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1);
  const snap = await db.collection('adDeliveries')
    .where('status', '==', 'delivered')
    .where('deliveredAt', '<=', Timestamp.fromDate(cutoff))
    .get();

  const batch = db.batch();
  snap.docs.forEach((docRef: QueryDocumentSnapshot<DocumentData>) => {
    batch.update(docRef.ref, { status: 'expired' });
  });

  if (!snap.empty) {
    await batch.commit();
  }
});

/**
 * Self-service account deletion — "Delete account" in SettingsScreen.
 * Deletes the caller's own Firebase Auth user and their Firestore user doc.
 * Campaigns/deliveries/transactions the account created are left in place
 * (other users' delivered-ad history and the platform's financial ledger
 * shouldn't disappear retroactively) but are no longer reachable by the
 * deleted account, since sign-in is gone. advertiserId/userId references on
 * those records simply point at a uid that no longer resolves to a user.
 */
export const deleteOwnAccount = functions.https.onCall(async (request: functions.https.CallableRequest<{}>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to delete your account.');
  }

  try {
    await db.collection('users').doc(uid).delete();
  } catch (err) {
    await logError(err, { fn: 'deleteOwnAccount:firestore', uid });
    throw new functions.https.HttpsError('internal', 'Could not delete your account data. Please try again.');
  }

  try {
    await getAuth().deleteUser(uid);
  } catch (err) {
    await logError(err, { fn: 'deleteOwnAccount:auth', uid });
    throw new functions.https.HttpsError('internal', 'Your data was removed but the sign-in record could not be deleted. Contact support.');
  }

  return { success: true };
});
