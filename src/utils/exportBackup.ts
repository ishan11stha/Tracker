import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VaultBackupPayload } from '../db/database';
import { adToBs, formatBSDateEnglish, formatBSDateNepali } from './nepaliDate';

function escapeCSV(val: unknown): string {
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

export async function exportVaultDataToCSV(payload: VaultBackupPayload): Promise<string> {
  const lines: string[] = [];

  lines.push('=== VAULT PERSONAL FINANCE & LIFE TRACKER — DATA EXPORT ===');
  lines.push(`Exported At,${escapeCSV(payload.exportedAt)}`);
  lines.push(`Currency,${escapeCSV(payload.settings.currency)}`);
  lines.push('');

  // 1. Transactions
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

  // 2. Items
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

  // 3. Activities
  lines.push('--- DAILY ACTIVITIES ---');
  lines.push(
    'ID,Title,Category,Status,Value,Unit,Date (AD),Date (BS),Time (NPT),Description'
  );
  for (const a of payload.activities) {
    const bs = adToBs(a.dateISO);
    lines.push(
      [
        escapeCSV(a.id),
        escapeCSV(a.title),
        escapeCSV(a.category),
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

  // 4. Reminders
  lines.push('--- REMINDERS ---');
  lines.push(
    'ID,Title,Category,Priority,Recurrence,Completed,Date (AD),Date (BS),Time (NPT),Description'
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
        escapeCSV(r.isCompleted ? 'Yes' : 'No'),
        escapeCSV(r.dateISO),
        escapeCSV(formatBSDateEnglish(bs, false)),
        escapeCSV(r.timeString),
        escapeCSV(r.description),
      ].join(',')
    );
  }

  const csvContent = '\uFEFF' + lines.join('\n');
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const fileName = `VAULT_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  const fileUri = `${dir}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export VAULT Records (CSV)',
    });
  }

  return fileUri;
}

export async function exportVaultBackupJSON(payload: VaultBackupPayload): Promise<string> {
  const jsonContent = JSON.stringify(payload, null, 2);
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const fileName = `VAULT_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = `${dir}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save VAULT Backup File (JSON)',
    });
  }

  return fileUri;
}
