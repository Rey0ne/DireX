/* === Credit Transaction Store — JSON File Based === */
import { v4 as uuid } from 'uuid';
import { readJSON, writeJSON } from './store.js';
import type { CreditTransaction } from '../../../../shared/api-types.js';

const TRANSACTIONS_FILE = 'credit-transactions.json';

function allTx(): CreditTransaction[] {
  const data = readJSON(TRANSACTIONS_FILE);
  return data.transactions || [];
}

function saveTx(txs: CreditTransaction[]): void {
  writeJSON(TRANSACTIONS_FILE, { transactions: txs, updatedAt: new Date().toISOString() });
}

export function addTransaction(
  userId: string,
  amount: number,
  type: CreditTransaction['type'],
  description: string,
  balanceAfter: number,
): CreditTransaction {
  const tx: CreditTransaction = {
    id: uuid(),
    userId,
    amount,
    type,
    description,
    balanceAfter,
    createdAt: new Date().toISOString(),
  };
  const txs = allTx();
  txs.push(tx);
  saveTx(txs);
  return tx;
}

export function getRecentTransactions(userId: string, limit = 20): CreditTransaction[] {
  return allTx()
    .filter(tx => tx.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
