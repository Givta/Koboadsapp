import {
  collection,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { AvailableAd } from '../types';

const CAMPAIGN_COLORS = ['#2563EB', '#EC4899', '#0F172A', '#F59E0B', '#1FAE5C', '#7C3AED'];
const watchAdCallable = httpsCallable<{ deliveryId: string }, { success: boolean }>(functions, 'watchAd');

interface DeliveryDoc {
  id: string;
  campaignId: string;
  reward?: number;
  status?: 'delivered' | 'opened' | 'clicked';
  deliveredAt?: Timestamp;
}

function formatDate(ts?: Timestamp) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Firestore 'in' queries cap at 10 values — chunk campaign lookups accordingly. */
async function hydrateWithCampaigns(deliveries: DeliveryDoc[]): Promise<AvailableAd[]> {
  const campaignIds = Array.from(new Set(deliveries.map((d) => d.campaignId)));
  const campaignsById = new Map<string, any>();

  for (let i = 0; i < campaignIds.length; i += 10) {
    const chunk = campaignIds.slice(i, i + 10);
    if (!chunk.length) continue;
    const campaignQuery = query(collection(db, 'campaigns'), where(documentId(), 'in', chunk));
    const campaignSnap = await getDocs(campaignQuery);
    campaignSnap.docs.forEach((d) => campaignsById.set(d.id, d.data()));
  }

  return deliveries.map((delivery, index) => {
    const campaign = campaignsById.get(delivery.campaignId);
    return {
      id: delivery.id,
      deliveryId: delivery.id,
      campaignId: delivery.campaignId,
      title: campaign?.title ?? 'Sponsored message',
      subtitle: campaign?.description ?? '',
      reward: delivery.reward ?? 0,
      duration: 30,
      imageColor: campaign?.imageColor ?? CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length],
      advertiser: campaign?.businessName || campaign?.category || 'Advertiser',
      mediaUrl: campaign?.mediaUrl ?? undefined,
      mediaType: campaign?.mediaType ?? undefined,
      websiteLink: campaign?.websiteLink ?? undefined,
      contact: campaign?.contact ?? undefined,
      callToAction: campaign?.callToAction ?? undefined,
      status: delivery.status ?? 'delivered',
      deliveredAt: formatDate(delivery.deliveredAt),
    } as AvailableAd;
  });
}

/** Live feed of ads a user has received but not yet watched — used by the Earn tab. */
export function listenAvailableAds(uid: string, cb: (ads: AvailableAd[]) => void) {
  const q = query(collection(db, 'adDeliveries'), where('userId', '==', uid), where('status', '==', 'delivered'), orderBy('deliveredAt', 'desc'));
  return onSnapshot(q, async (snap) => {
    const deliveries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryDoc));
    cb(await hydrateWithCampaigns(deliveries));
  });
}

/**
 * Full history of every ad ever pushed to this user, regardless of whether
 * they've watched it yet — this is the "Received" view inside the Ads tab,
 * distinct from Earn (which only shows the actionable, not-yet-claimed
 * queue). Same underlying adDeliveries data, different lens.
 */
export function listenReceivedAdsHistory(uid: string, cb: (ads: AvailableAd[]) => void) {
  const q = query(collection(db, 'adDeliveries'), where('userId', '==', uid), orderBy('deliveredAt', 'desc'));
  return onSnapshot(q, async (snap) => {
    const deliveries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryDoc));
    cb(await hydrateWithCampaigns(deliveries));
  });
}

/** Marks a delivery as watched, credits the reward, and enforces the daily earn cap server-side. */
export async function watchAd(_uid: string, deliveryId: string) {
  await watchAdCallable({ deliveryId });
}
