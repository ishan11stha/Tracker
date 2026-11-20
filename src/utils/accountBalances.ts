import type { Account, AccountScope, Transaction } from '../types';

export interface AccountWithBalance extends Account {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  movementCount: number;
}

export interface AccountSummaryGrouping {
  personalAccounts: AccountWithBalance[];
  familyAccounts: AccountWithBalance[];
  personalTotal: number;
  familyTotal: number;
  grandTotal: number;
}

/**
 * Calculates live balances for all accounts:
 * Current Balance = initialBalance + totalIncome - totalExpense
 * Also groups accounts into Personal vs Family segments.
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountSummaryGrouping {
  const statsMap = new Map<
    string,
    { income: number; expense: number; count: number }
  >();

  for (const acc of accounts) {
    statsMap.set(acc.id, { income: 0, expense: 0, count: 0 });
  }

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    // Match either explicitly by accountId or fallback to paymentMethod + accountScope
    let targetAccId = t.accountId;
    if (!targetAccId) {
      const scope: AccountScope = t.accountScope || 'Personal';
      const fallbackAcc = accounts.find(
        (a) => a.scope === scope && a.paymentMethod === t.paymentMethod
      );
      if (fallbackAcc) {
        targetAccId = fallbackAcc.id;
      }
    }

    if (targetAccId && statsMap.has(targetAccId)) {
      const stats = statsMap.get(targetAccId)!;
      stats.count += 1;
      if (t.type === 'income') {
        stats.income += amt;
      } else {
        stats.expense += amt;
      }
    }
  }

  const enriched: AccountWithBalance[] = accounts.map((acc) => {
    const stats = statsMap.get(acc.id) || { income: 0, expense: 0, count: 0 };
    const currentBalance = acc.initialBalance + stats.income - stats.expense;
    return {
      ...acc,
      currentBalance,
      totalIncome: stats.income,
      totalExpense: stats.expense,
      movementCount: stats.count,
    };
  });

  const personalAccounts = enriched.filter((a) => a.scope === 'Personal');
  const familyAccounts = enriched.filter((a) => a.scope === 'Family');

  const personalTotal = personalAccounts.reduce(
    (sum, a) => sum + a.currentBalance,
    0
  );
  const familyTotal = familyAccounts.reduce(
    (sum, a) => sum + a.currentBalance,
    0
  );

  return {
    personalAccounts,
    familyAccounts,
    personalTotal,
    familyTotal,
    grandTotal: personalTotal + familyTotal,
  };
}
