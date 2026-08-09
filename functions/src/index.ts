import { initializeApp } from 'firebase-admin/app';
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

async function sendPushNotificationToUser(userId: string, message: PushMessage) {
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) return;

  const userData = userSnap.data() || {};
  const tokens = Array.isArray(userData.pushTokens) ? userData.pushTokens : [];
  await sendExpoPushNotifications(tokens, message);
}

const REFERRAL_REWARD_NAIRA = 500;
// Number of ad views by the referred user required to activate the referral reward.
const REFERRAL_TRIGGER_VIEWS = 4;

interface CampaignPayload {
  advertiserId: string;
  title: string;
  description: string;
  category?: string;
  location?: string;
  ageRange?: string;
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

  await db.collection('campaigns').doc(campaignId).update({
    status: 'pending_approval',
  });

  return { success: true, campaignId, status: 'pending_approval' };
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
  if (campaign.advertiserId !== uid && !isAdmin) {
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
    withdrawalsSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.status === 'success' && typeof data.amount === 'number') totalPayouts += data.amount;
    });

    const recentErrors = errorsSnap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

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

  await campaignRef.update({
    status: 'rejected',
    rejectedBy: uid,
    rejectionReason: data.reason,
  });

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

export const topUpWallet = functions.https.onCall(async (request: functions.https.CallableRequest<{ amount: number }>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }

  const amount = Number(request.data.amount || 0);
  if (amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Amount must be greater than zero.');
  }

  const userRef = db.collection('users').doc(uid);
  const batch = db.batch();
  batch.update(userRef, { walletBalance: FieldValue.increment(amount) });
  batch.set(db.collection('transactions').doc(), {
    userId: uid,
    type: 'topup',
    title: 'Wallet top up',
    amount,
    status: 'success',
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

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const earningsBalance = Number(userData.earningsBalance || 0);

  if (amount > earningsBalance) {
    throw new functions.https.HttpsError('failed-precondition', 'Insufficient earnings balance.');
  }

  const batch = db.batch();
  batch.update(userRef, { earningsBalance: FieldValue.increment(-amount) });
  batch.set(db.collection('withdrawals').doc(), {
    userId: uid,
    amount,
    method: request.data.method || 'bank',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection('transactions').doc(), {
    userId: uid,
    type: 'withdraw',
    title: `Withdrawal to ${request.data.method || 'bank'}`,
    amount: -amount,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
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

async function distributeCampaignToUsers(campaignId: string, campaign: CampaignPayload) {
  const usersSnap = await db.collection('users').where('receivesAds', '==', true).get();
  const batch = db.batch();
  let count = 0;

  for (const userDoc of usersSnap.docs) {
    if (count >= Math.max(1, campaign.targetReach)) break;
    const userData = userDoc.data() || {};
    if (userDoc.id === campaign.advertiserId) continue;
    if (campaign.location && campaign.location !== 'All Nigeria' && userData.location !== campaign.location) continue;

    const existing = await db.collection('adDeliveries')
      .where('campaignId', '==', campaignId)
      .where('userId', '==', userDoc.id)
      .get();
    if (!existing.empty) continue;

    const deliveryRef = db.collection('adDeliveries').doc();
    batch.set(deliveryRef, {
      campaignId,
      userId: userDoc.id,
      status: 'delivered',
      reward: 100,
      deliveredAt: FieldValue.serverTimestamp(),
      openedAt: null,
      clickedAt: null,
    });
    count += 1;
  }

  if (count > 0) {
    await batch.commit();
  }

  await db.collection('campaigns').doc(campaignId).update({ delivered: count });
}

export const cleanupExpiredDeliveries = functions.scheduler.onSchedule({
  schedule: 'every 24 hours',
}, async (_event) => {
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
