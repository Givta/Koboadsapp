import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface DashboardMetrics {
  totalUsers: number;
  totalCampaigns: number;
  totalPaidCampaigns: number;
  totalDeliveries: number;
  transactionsCount: number;
  withdrawalsCount: number;
  totalPayouts: number;
  recentErrors: Array<Record<string, any>>;
}

const callable = httpsCallable(functions, 'getDashboardMetrics');

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await callable({});
  return res.data as DashboardMetrics;
}

export default { getDashboardMetrics };
