import type { Database } from '../types/models.ts';
import { LocalDatabase, requireFinishedWorkouts, requireRestorableSize } from '../storage/localDatabase.ts';
import { migrateDatabase } from '../storage/migrations.ts';
import { ensure } from './validation.ts';
import { moduleKeys, modules } from '../features/library/catalog.ts';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export interface Backup {
  format: 'monapp-backup';
  formatVersion: 1;
  exportedAt: string;
  data: Database;
}
export interface BackupPreview {
  backup: Backup;
  current: Database;
  expected: string;
}

export function checkBackupSize(bytes: number): void {
  ensure(Number.isFinite(bytes) && bytes > 0 && bytes <= MAX_BACKUP_BYTES, 'Choose a non-empty JSON backup of 10 MB or less.');
}

export function parseBackup(json: string): Backup {
  checkBackupSize(json.length);
  checkBackupSize(new TextEncoder().encode(json).byteLength);
  let value: unknown;
  try {
    value = JSON.parse(json.replace(/^\uFEFF/, ''), (key, item: unknown) => {
      ensure(!['__proto__', 'constructor', 'prototype'].includes(key), 'Unsafe JSON key.');
      return item;
    });
  } catch { throw new Error('This file is not valid backup JSON. Select an unmodified MONAPp export.'); }
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'Choose a MONAPp backup file.');
  const envelope = value as Record<string, unknown>;
  ensure(envelope.format === 'monapp-backup', 'Choose a MONAPp backup file, not an arbitrary JSON document.');
  ensure(envelope.formatVersion === 1, 'This backup format is unsupported. Update MONAPp before importing it.');
  ensure(typeof envelope.exportedAt === 'string' && Number.isFinite(Date.parse(envelope.exportedAt)), 'The backup date is invalid.');
  const data = migrateDatabase(envelope.data);
  requireFinishedWorkouts(data);
  return { format: 'monapp-backup', formatVersion: 1, exportedAt: envelope.exportedAt, data };
}

export function backupCounts(data: Database) {
  return (['tasks', 'events', ...moduleKeys] as const).map(key => ({
    key, title: key === 'tasks' ? 'Tasks' : key === 'events' ? 'Calendar events' : modules[key].title,
    count: data[key].filter(item => !item.deletedAt).length,
  }));
}

export function encodeBackup(data: Database): string {
  requireFinishedWorkouts(data);
  const json = JSON.stringify({ format: 'monapp-backup', formatVersion: 1, exportedAt: new Date().toISOString(), data }, null, 2);
  checkBackupSize(new TextEncoder().encode(json).byteLength);
  return json;
}

export class BackupService {
  private database: LocalDatabase;
  constructor(database: LocalDatabase) { this.database = database; }

  async exportJson(): Promise<string> { return encodeBackup(await this.database.snapshot()); }

  async preview(json: string): Promise<BackupPreview> {
    const backup = parseBackup(json);
    requireRestorableSize(backup.data);
    const current = await this.database.snapshot();
    requireFinishedWorkouts(current);
    requireRestorableSize(current);
    return { backup, current, expected: JSON.stringify(current) };
  }

  async previous(): Promise<BackupPreview> {
    const previous = await this.database.previousSnapshot();
    ensure(previous, 'There is no previous import to undo on this device.');
    return this.preview(encodeBackup(previous));
  }

  restore(preview: BackupPreview): Promise<void> {
    const data = preview.backup.data;
    // Notification permissions and schedules belong to the destination device.
    return this.database.replace({ ...data, settings: { ...data.settings, notificationsEnabled: false } }, preview.expected);
  }
}
