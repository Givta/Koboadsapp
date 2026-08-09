import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  increment,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { DAILY_AD_LIMIT, REWARD_PER_AD_NAIRA } from '../data/constants';

const MAX_CANDIDATES_SCANNED = 300;
const BATCH_LIMIT = 450; // stay under Firestore's 500-write batch cap

function startOfTodayTimestamp() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

/**
 * Distributes a freshly created campaign to eligible, opted-in users:
 * - must have receivesAds === true
 * - must be in the campaign's target location (or campaign targets "All Nigeria")
 * - must not already have a delivery for this campaign
 * - must have received fewer than DAILY_AD_LIMIT ads today
 *
 * Runs on the client right after a campaign is created. For production scale this
 * logic belongs in a Cloud Function triggered on campaign creation so it can run with
 * elevated privileges and isn't limited by client-side read/write quotas.
 */
export async function distributeCampaign(campaignId: string, opts: {
  advertiserId: string;
  location: string;
  targetReach: number;
  rewardPerAdNaira?: number;
}) {
  const usersRef = collection(db, 'users');
  const candidatesQuery =
    opts.location && opts.location !== 'All Nigeria'
      ? query(usersRef, where('receivesAds', '==', true), where('location', '==', opts.location))
      : query(usersRef, where('receivesAds', '==', true));

  const candidatesSnap = await getDocs(candidatesQuery);
  const todayStart = startOfTodayTimestamp();
  const deliveriesRef = collection(db, 'adDeliveries');

  let delivered = 0;
  const batch = writeBatch(db);
  let batchOps = 0;

  for (const candidate of candidatesSnap.docs) {
    if (delivered >= opts.targetReach || delivered >= MAX_CANDIDATES_SCANNED) break;
    const uid = candidate.id;
    if (uid === opts.advertiserId) continue;

    // Skip if this user already received this exact campaign.
    const alreadySeenSnap = await getCountFromServer(
      query(deliveriesRef, where('campaignId', '==', campaignId), where('userId', '==', uid))
    );
    if (alreadySeenSnap.data().count > 0) continue;

    // Enforce the daily received-ads cap.
    const todaySnap = await getCountFromServer(
      query(deliveriesRef, where('userId', '==', uid), where('deliveredAt', '>=', todayStart))
    );
    if (todaySnap.data().count >= DAILY_AD_LIMIT) continue;

    const deliveryRef = doc(deliveriesRef);
    batch.set(deliveryRef, {
      campaignId,
      userId: uid,
      status: 'delivered',
      reward: opts.rewardPerAdNaira ?? REWARD_PER_AD_NAIRA,
      deliveredAt: serverTimestamp(),
      openedAt: null,
      clickedAt: null,
    });
    delivered += 1;
    batchOps += 1;

    if (batchOps >= BATCH_LIMIT) break;
  }

  if (delivered > 0) {
    await batch.commit();
    await updateDoc(doc(db, 'campaigns', campaignId), { delivered: increment(delivered) });
  }

  return delivered;
}
