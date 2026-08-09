import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { Transaction, WithdrawalRequest } from '../types';

function formatDate(ts?: Timestamp) {
  if (!ts) return 'Just now';
  return ts.toDate().toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const topUpWalletCallable = httpsCallable<{ amount: number }, { success: boolean }>(functions, 'topUpWallet');
const withdrawFundsCallable = httpsCallable<{ amount: number; method: string }, { success: boolean }>(functions, 'withdrawFunds');

export function listenTransactions(uid: string, cb: (txns: Transaction[]) => void) {
  const q = query(collection(db, 'transactions'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          title: data.title,
          amount: data.amount,
          date: formatDate(data.createdAt),
          status: data.status,
        } as Transaction;
      })
    );
  });
}

export function listenWithdrawals(uid: string, cb: (items: WithdrawalRequest[]) => void) {
  const q = query(collection(db, 'withdrawals'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          amount: data.amount,
          method: data.method,
          date: formatDate(data.createdAt),
          status: data.status,
        } as WithdrawalRequest;
      })
    );
  });
}

/** Manual wallet top-up. The actual balance update is now enforced server-side. */
export async function topUpWallet(_uid: string, amount: number) {
  await topUpWalletCallable({ amount });
}

/** Debits the wallet to fund a paid campaign. This is now handled by the Cloud Function. */
export async function debitWalletForCampaign(_uid: string, _amount: number, _campaignTitle: string) {
  return undefined;
}

export async function withdrawFunds(_uid: string, amount: number, method: string) {
  await withdrawFundsCallable({ amount, method });
}
