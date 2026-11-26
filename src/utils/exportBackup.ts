import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VaultBackupPayload } from '../db/database';
import { vaultBackupSchema } from '../types';
import { adToBs, formatBSDateEnglish, formatBSDateNepali } from './nepaliDate';
import { escapeCSV } from './csv';

export async function exportVaultDataToCSV(
  payload: VaultBackupPayload
): Promise<string> {
  const lines: string[] = [];

  lines.push('=== VAULT PERSONAL FINANCE & LIFE TRACKER — DATA EXPORT ===');
  lines.push(`Exported At,${escapeCSV(payload.exportedAt)}`);
  lines.push(`Currency,${escapeCSV(payload.settings.currency)}`);
  lines.push('');

  // 1. Accounts & Wallets
  lines.push('--- ACCOUNTS & WALLETS ---');
  lines.push(
    'ID,Name,Scope,Initial Balance,Payment Method,Created At,Updated At'
  );
  for (const account of payload.accounts || []) {
    lines.push(
      [
        escapeCSV(account.id),
        escapeCSV(account.name),
        escapeCSV(account.scope),
        account.initialBalance,
        escapeCSV(account.paymentMethod),
        escapeCSV(account.createdAt),
        escapeCSV(account.updatedAt),
      ].join(',')
    );
  }
  lines.push('');

  // 2. Transactions
  lines.push('--- TRANSACTIONS ---');
  lines.push(
    'ID,Type,Title,Amount,Category,Gregorian Date (AD),Nepali Date (BS),Nepali Script,Payment Method,Description'
  );
  for (const t of payload.transactions) {
    const bs = adToBs(t.dateISO);
    lines.push(
      [
        escapeCSV(t.id),
        escapeCSV(t.type.toUpperCase()),
        escapeCSV(t.title),
        t.amount,
        escapeCSV(t.category),
        escapeCSV(t.dateISO),
        escapeCSV(formatBSDateEnglish(bs, false)),
        escapeCSV(formatBSDateNepali(bs, false)),
        escapeCSV(t.paymentMethod),
        escapeCSV(t.description),
      ].join(',')
    );
  }
  lines.push('');

  // 3. Items
  lines.push('--- PERSONAL ITEMS ---');
  lines.push(
    'ID,Name,Category,Status,Purchase Price,Quantity,Location,Purchase Date (AD),Purchase Date (BS),Description'
  );
  for (const i of payload.items) {
    const bs = adToBs(i.purchaseDateISO);
    lines.push(
      [
        escapeCSV(i.id),
        escapeCSV(i.name),
        escapeCSV(i.category),
        escapeCSV(i.status),
        i.purchasePrice,
        i.quantity,
        escapeCSV(i.location),
        escapeCSV(i.purchaseDateISO),
        escapeCSV(formatBSDateEnglish(bs, false)),
        escapeCSV(i.description),
      ].join(',')
    );
  }
  lines.push('');

  // 4. Activities
  lines.push('--- DAILY ACTIVITIES ---');
  lines.push(
    'ID,Title,Category,Schedule,Status,Value,Unit,Date (AD),Date (BS),Time (NPT),Description'
  );
  for (const a of payload.activities) {
    const bs = adToBs(a.dateISO);
    lines.push(
      [
        escapeCSV(a.id),
        escapeCSV(a.title),
        escapeCSV(a.category),
        escapeCSV(a.repeat || 'once'),
        escapeCSV(a.status),
        a.numericValue,
        escapeCSV(a.unit),
        escapeCSV(a.dateISO),
        escapeCSV(formatBSDateEnglish(bs, false)),
        escapeCSV(a.timeString),
        escapeCSV(a.description),
      ].join(',')
    );
  }
  lines.push('');

  // 5. Reminders
  lines.push('--- REMINDERS ---');
  lines.push(
    'ID,Title,Category,Priority,Recurrence,Alert Mode,Completed,Date (AD),Date (BS),Time (NPT),Description'
  );
  for (const r of payload.reminders) {
    const bs = adToBs(r.dateISO);
    lines.push(
      [
        escapeCSV(r.id),
        escapeCSV(r.title),
        escapeCSV(r.category),
        escapeCSV(r.priority),
        escapeCSV(r.recurrence),
        escapeCSV(r.alertMode || 'both'),
        escapeCSV(r.isCompleted ? 'Yes' : 'No'),
        escapeCSV(r.dateISO),
        escapeCSV(formatBSDateEnglish(bs, false)),
        escapeCSV(r.timeString),
        escapeCSV(r.description),
      ].join(',')
    );
  }
  lines.push('');

  // 6. Savings Goals
  lines.push('--- SAVINGS GOALS ---');
  lines.push('ID,Title,Saved Amount,Target Amount,Target Date (AD),Icon');
  for (const g of payload.savingsGoals || []) {
    lines.push(
      [
        escapeCSV(g.id),
        escapeCSV(g.title),
        g.savedAmount,
        g.targetAmount,
        escapeCSV(g.targetDateISO || ''),
        escapeCSV(g.icon),
      ].join(',')
    );
  }

  const csvContent = '\uFEFF' + lines.join('\n');
  const fileName = `VAULT_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  const csvFile = new File(Paths.document, fileName);

  await csvFile.write(csvContent);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(csvFile.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export VAULT Records (CSV)',
    });
  }

  return csvFile.uri;
}

export async function exportVaultBackupJSON(
  payload: VaultBackupPayload
): Promise<string> {
  const jsonContent = JSON.stringify(payload, null, 2);
  const fileName = `VAULT_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  const jsonFile = new File(Paths.document, fileName);

  await jsonFile.write(jsonContent);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(jsonFile.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save VAULT Backup File (JSON)',
    });
  }

  return jsonFile.uri;
}

/**
 * Strictly validates and sanitizes a JSON backup string before SQLite restoration.
 */
export function parseAndValidateBackupJSON(rawText: string): VaultBackupPayload {
  let rawObj: unknown;
  try {
    rawObj = JSON.parse(rawText);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const result = vaultBackupSchema.safeParse(rawObj);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join('.') || 'payload';
    throw new Error(
      `Invalid VAULT backup format at "${path}": ${
        firstIssue?.message || 'Schema mismatch'
      }`
    );
  }

  return result.data;
}
