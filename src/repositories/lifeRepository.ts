import type { LifeCollections, ModuleKey, ModuleRecord } from '../types/life.ts';
import type { LocalDatabase } from '../storage/localDatabase.ts';
import type { Repository } from './contracts.ts';
import { LocalRepository } from './localRepository.ts';
import { emptyLifeCollections, moduleKeys } from '../features/library/catalog.ts';

export interface LifeRepository {
  collection<K extends ModuleKey>(key: K): Repository<ModuleRecord<K>>;
  getAll(): Promise<LifeCollections>;
}
export class LocalLifeRepository implements LifeRepository {
  private db: LocalDatabase;
  constructor(db: LocalDatabase) { this.db = db; }
  collection<K extends ModuleKey>(key: K): Repository<ModuleRecord<K>> { return new LocalRepository(this.db, key); }
  async getAll(): Promise<LifeCollections> {
    const data = await this.db.snapshot();
    const result = emptyLifeCollections();
    for (const key of moduleKeys) Object.assign(result, { [key]: data[key].filter(record => !record.deletedAt) });
    return result;
  }
}
