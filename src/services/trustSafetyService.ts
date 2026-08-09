import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { AbuseReport, Campaign, MediaModerationRecord, ReportType } from '../types';

interface ReportAbusePayload {
  reportedCampaignId?: string;
  reportedUserId?: string;
  type: ReportType;
  details: string;
}

interface ReportAbuseResult {
  success: boolean;
  reportId: string;
}

interface ResolveAbuseReportPayload {
  reportId: string;
  resolution: 'reviewed' | 'dismissed' | 'actioned';
  note?: string;
}

const reportAbuseCallable = httpsCallable<ReportAbusePayload, ReportAbuseResult>(functions, 'reportAbuse');
const resolveAbuseReportCallable = httpsCallable<ResolveAbuseReportPayload, { success: boolean }>(functions, 'resolveAbuseReport');
const approveMediaCallable = httpsCallable<{ mediaId: string }, { success: boolean }>(functions, 'approveMedia');
const rejectMediaCallable = httpsCallable<{ mediaId: string; reason: string }, { success: boolean }>(functions, 'rejectMedia');
const approveCampaignCallable = httpsCallable<{ campaignId: string }, { success: boolean }>(functions, 'approveCampaign');
const rejectCampaignCallable = httpsCallable<{ campaignId: string; reason: string }, { success: boolean }>(functions, 'rejectCampaign');

export async function reportAbuse(payload: ReportAbusePayload) {
  const response = await reportAbuseCallable(payload);
  return response.data;
}

export async function resolveAbuseReport(payload: ResolveAbuseReportPayload) {
  const response = await resolveAbuseReportCallable(payload);
  return response.data;
}

export async function approveMedia(mediaId: string) {
  const response = await approveMediaCallable({ mediaId });
  return response.data;
}

export async function rejectMedia(mediaId: string, reason: string) {
  const response = await rejectMediaCallable({ mediaId, reason });
  return response.data;
}

export async function approveCampaign(campaignId: string) {
  const response = await approveCampaignCallable({ campaignId });
  return response.data;
}

export async function rejectCampaign(campaignId: string, reason: string) {
  const response = await rejectCampaignCallable({ campaignId, reason });
  return response.data;
}

export function listenPendingCampaignApprovals(cb: (campaigns: Campaign[]) => void) {
  const campaignQuery = query(
    collection(db, 'campaigns'),
    where('status', '==', 'pending_approval'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(campaignQuery, (snap) => {
    cb(
      snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
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
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
          imageColor: data.imageColor,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
        } as Campaign;
      })
    );
  });
}

export function listenPendingMediaModeration(cb: (records: MediaModerationRecord[]) => void) {
  const moderationQuery = query(
    collection(db, 'mediaModeration'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(moderationQuery, (snap) => {
    cb(
      snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          storagePath: data.storagePath,
          contentType: data.contentType,
          sizeBytes: data.sizeBytes,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
          reviewedAt: data.reviewedAt?.toDate?.()?.toISOString(),
          reviewedBy: data.reviewedBy,
          rejectionReason: data.rejectionReason,
        } as MediaModerationRecord;
      })
    );
  });
}

export function listenPendingAbuseReports(cb: (reports: AbuseReport[]) => void) {
  const reportsQuery = query(
    collection(db, 'abuseReports'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(reportsQuery, (snap) => {
    cb(
      snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          reporterId: data.reporterId,
          reportedCampaignId: data.reportedCampaignId,
          reportedUserId: data.reportedUserId,
          type: data.type,
          details: data.details,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
          resolvedAt: data.resolvedAt?.toDate?.()?.toISOString(),
          resolvedBy: data.resolvedBy,
          resolutionNote: data.resolutionNote,
        } as AbuseReport;
      })
    );
  });
}
