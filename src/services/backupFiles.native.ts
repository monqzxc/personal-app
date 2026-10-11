import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { checkBackupSize } from './backupService';

export async function pickBackupFile(): Promise<{ name: string; json: string } | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', 'application/octet-stream'] });
  if (picked.canceled) return null;
  checkBackupSize(picked.result.size);
  return { name: picked.result.name, json: await picked.result.text() };
}

export async function saveBackupFile(json: string): Promise<string> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  // One reusable cache file keeps exports from accumulating inside the app.
  const file = new File(Paths.cache, 'MONAPp-backup.json');
  file.create({ overwrite: true });
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your MONAPp backup' });
  return 'Choose a destination in the share sheet and finish saving there. If you canceled it, export again. Keep the saved file outside MONAPp.';
}
