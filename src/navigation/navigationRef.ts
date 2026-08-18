import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Single source of truth for "where does this notification lead" — used by
 * both the push-notification tap handler (App.tsx, notification arrives
 * from the OS) and the in-app NotificationsScreen (notification tapped from
 * the bell icon's list). Keeping this in one place means the two entry
 * points can never silently drift apart on where a given type navigates.
 */
export function routeNotificationTap(data: Record<string, any> | undefined | null) {
  if (!data?.type || !navigationRef.isReady()) return;
  const nav = navigationRef as any;

  switch (data.type) {
    case 'ad_delivered':
      // One push notification can go out to many recipients of the same
      // campaign at once, so it can't carry a specific deliveryId per
      // person — send them to the Ads tab's Received view, where their own
      // delivery for this campaign is listed.
      nav.navigate('MainTabs', { screen: 'Ads', params: { initialSection: 'received' } });
      break;
    case 'campaign_approved':
    case 'campaign_rejected':
    case 'campaign_boosted':
      if (data.campaignId) {
        nav.navigate('CampaignDetail', { campaignId: data.campaignId });
      } else {
        nav.navigate('MainTabs', { screen: 'Ads' });
      }
      break;
    case 'referral_reward':
      nav.navigate('Referral');
      break;
    default:
      nav.navigate('MainTabs', { screen: 'Home' });
  }
}
