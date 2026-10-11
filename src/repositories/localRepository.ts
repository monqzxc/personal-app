import type { Database, EntityPatch } from '../types/models.ts';
import type { Repository } from './contracts.ts';
import type { LocalDatabase } from '../storage/localDatabase.ts';
import { ensure } from '../services/validation.ts';

export type CollectionKey = Exclude<keyof Database, 'schemaVersion' | 'settings'>;
export type Collections = { [K in CollectionKey]: Database[K][number] };

export class LocalRepository<K extends keyof Collections> implements Repository<Collections[K]> {
  protected db: LocalDatabase;
  private collection: K;
  constructor(db: LocalDatabase, collection: K) { this.db = db; this.collection = collection; }

  async getAll(): Promise<Collections[K][]> {
    const data = await this.db.snapshot();
    return (data[this.collection] as Collections[K][]).filter(record => !record.deletedAt);
  }
  async getById(id: string): Promise<Collections[K] | null> {
    return (await this.getAll()).find(record => record.id === id) ?? null;
  }
  create(entity: Collections[K], inboxId?: string): Promise<Collections[K]> {
    return this.db.mutate(data => {
      const records = data[this.collection] as Collections[K][];
      ensure(!records.some(record => record.id === entity.id), 'A record with this ID already exists.');
      records.push(entity);
      if (inboxId) {
        const inbox = data.inbox.find(item => item.id === inboxId && !item.deletedAt);
        ensure(inbox && !inbox.processed, 'This capture has already been processed or deleted.');
        Object.assign(inbox, { processed: true, convertedType: this.collection, convertedEntityId: entity.id, updatedAt: new Date().toISOString(), version: inbox.version + 1 });
      }
      return entity;
    });
  }
  update(id: string, patch: EntityPatch<Collections[K]>): Promise<Collections[K]> {
    return this.db.mutate(data => {
      const records = data[this.collection] as Collections[K][];
      const index = records.findIndex(record => record.id === id && !record.deletedAt);
      const previous = records[index];
      ensure(previous, 'This record no longer exists.');
      const next = { ...previous, ...patch, id: previous.id, createdAt: previous.createdAt,
        deletedAt: previous.deletedAt, updatedAt: new Date().toISOString(),
        version: previous.version + 1, syncStatus: 'local' as const };
      if (this.collection === 'debts' && 'direction' in previous && 'direction' in next && previous.direction !== next.direction) {
        ensure(!data.repayments.some(item => !item.deletedAt && item.debtId === id), 'Remove or reassign repayments before changing who owes this debt.');
      }
      if ((this.collection === 'bills' || this.collection === 'expectedIncome') && 'status' in previous && 'status' in next) {
        ensure(!['paid', 'received'].includes(previous.status) || next.status === previous.status, 'A settled plan cannot be reopened. Correct its transaction instead.');
      }
      records[index] = next;
      return next;
    });
  }
  delete(id: string): Promise<void> {
    return this.db.mutate(data => {
      const record = (data[this.collection] as Collections[K][]).find(item => item.id === id && !item.deletedAt);
      ensure(record, 'This record no longer exists.');
      if (this.collection === 'activities' && 'route' in record && 'status' in record) {
        ensure(record.status === 'completed', 'Finish the active workout before deleting it.');
        record.route = [];
      }
      record.deletedAt = record.updatedAt = new Date().toISOString();
      record.version += 1;
      record.syncStatus = 'local';
    });
  }
}
