import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { Campaign, NewAdDraft } from '../types';
import { COST_PER_REACH_NAIRA } from '../data/constants';

interface CreateCampaignResponse {
  success: boolean;
  campaignId: string;
  status: string;
}

interface CreateCampaignPayload {
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
}

const createCampaignCallable = httpsCallable<CreateCampaignPayload, CreateCampaignResponse>(functions, 'createCampaign');

function formatDate(ts?: Timestamp) {
  if (!ts) return new Date().toISOString().slice(0, 10);
  return ts.toDate().toISOString().slice(0, 10);
}

export function listenCampaigns(uid: string, cb: (campaigns: Campaign[]) => void) {
  const q = query(collection(db, 'campaigns'), where('advertiserId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          advertiserId: data.advertiserId,
          title: data.title,
          description: data.description,
          category: data.category,
          location: data.location,
          ageRange: data.ageRange,
          businessName: data.businessName,
          websiteLink: data.websiteLink,
          contact: data.contact,
          callToAction: data.callToAction,
          targetReach: data.targetReach,
          delivered: data.delivered ?? 0,
          opened: data.opened ?? 0,
          clicked: data.clicked ?? 0,
          spent: data.spent ?? 0,
          status: data.status,
          campaignType: data.campaignType,
          createdAt: formatDate(data.createdAt),
          imageColor: data.imageColor,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
        } as Campaign;
      })
    );
  });
}

export async function createCampaign(
  uid: string,
  draft: NewAdDraft,
  walletBalance: number,
  costPerReachNaira: number = COST_PER_REACH_NAIRA,
  rewardPerAdNaira?: number
): Promise<string> {
  const estimatedCost = draft.campaignType === 'paid' ? Math.round(draft.reach * costPerReachNaira) : 0;

  if (draft.campaignType === 'paid' && estimatedCost > walletBalance) {
    throw new Error('Insufficient wallet balance for this campaign. Please top up first.');
  }

  const response = await createCampaignCallable({
    advertiserId: uid,
    title: draft.title || 'Untitled campaign',
    description: draft.description,
    category: draft.category,
    location: draft.location || 'All Nigeria',
    ageRange: draft.ageRange,
    businessName: draft.businessName,
    websiteLink: draft.websiteLink,
    contact: draft.contact,
    callToAction: draft.callToAction,
    targetReach: draft.reach,
    spent: estimatedCost,
    campaignType: draft.campaignType,
    imageColor: draft.imageColor,
    mediaUrl: draft.mediaUrl ?? undefined,
    mediaType: draft.mediaType ?? undefined,
    mediaStoragePath: draft.mediaStoragePath ?? undefined,
  });

  return response.data.campaignId;
}

export async function setCampaignStatus(id: string, status: Campaign['status']) {
  await updateDoc(doc(db, 'campaigns', id), { status });
}
