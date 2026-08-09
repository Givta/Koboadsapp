import {
  collection,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { AvailableAd } from '../types';
import { DAILY_EARN_LIMIT } from '../data/constants';

const CAMPAIGN_COLORS = ['#2563EB', '#EC4899', '#0F172A', '#F59E0B', '#1FAE5C', '#7C3AED'];
const watchAdCallable = httpsCallable<{ deliveryId: string }, { success: boolean }>(functions, 'watchAd');

/** Live feed of ads a user has received but not yet watched. */
export function listenAvailableAds(uid: string, cb: (ads: AvailableAd[]) => void) {
  const q = query(collection(db, 'adDeliveries'), where('userId', '==', uid), where('status', '==', 'delivered'), orderBy('deliveredAt', 'desc'));
  return onSnapshot(q, async (snap) => {
    const deliveries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; campaignId: string; reward?: number }));
    const campaignIds = Array.from(new Set(deliveries.map((delivery) => delivery.campaignId)));

    const campaignsById = new Map<string, any>();
    if (campaignIds.length) {
      const campaignQuery = query(collection(db, 'campaigns'), where(documentId(), 'in', campaignIds));
      const campaignSnap = await getDocs(campaignQuery);
      campaignSnap.docs.forEach((doc) => {
        campaignsById.set(doc.id, doc.data());
      });
    }

    const ads = deliveries.map((delivery, index) => {
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
      } as AvailableAd;
    });

    cb(ads);
  });
}

/** Marks a delivery as watched, credits the reward, and enforces the daily earn cap server-side. */
export async function watchAd(_uid: string, deliveryId: string) {
  await watchAdCallable({ deliveryId });
}
