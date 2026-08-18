import { collection, doc, onSnapshot, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification } from '../types';

function formatDate(ts?: Timestamp) {
  if (!ts) return '';
  return ts.toDate().toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function listenNotifications(uid: string, cb: (items: AppNotification[]) => void) {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type ?? 'general',
          title: data.title ?? '',
          body: data.body ?? '',
          data: data.data ?? {},
          read: data.read ?? false,
          createdAt: formatDate(data.createdAt),
        } as AppNotification;
      })
    );
  });
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}
