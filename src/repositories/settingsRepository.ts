import { requireRestorableSize, type LocalDatabase } from '../storage/localDatabase.ts';
import type { Settings } from '../types/models.ts';
import type { SettingsRepository } from './contracts.ts';

export class LocalSettingsRepository implements SettingsRepository {
  private db: LocalDatabase;
  constructor(db: LocalDatabase) { this.db = db; }
  async get() { return (await this.db.snapshot()).settings; }
  update(patch: Partial<Settings>) {
    return this.db.mutate(data => {
      const addingPhoto = Boolean(patch.profilePhoto) && patch.profilePhoto !== data.settings.profilePhoto;
      data.settings = { ...data.settings, ...patch };
      if (addingPhoto) requireRestorableSize(data);
      return data.settings;
    });
  }
}
