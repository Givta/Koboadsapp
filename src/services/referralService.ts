import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import { ReferralEntry } from '../types';

function formatDate(ts?: Timestamp) {
  if (!ts) return '';
  return ts.toDate().toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function listenReferrals(uid: string, cb: (referrals: ReferralEntry[]) => void) {
  const q = query(collection(db, 'referrals'), where('referrerId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.referredName ?? 'New user',
          joinedDate: formatDate(data.createdAt),
          status: data.status ?? 'pending',
          reward: data.reward ?? 0,
          referredId: data.referredId,
          referrerId: data.referrerId,
          activatedAt: formatDate(data.activatedAt),
        } as ReferralEntry;
      })
    );
  });
}
