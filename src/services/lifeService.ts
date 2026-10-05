import type { ModuleKey, ModuleRecord } from '../types/life.ts';
import type { EntityPatch } from '../types/models.ts';
import type { LifeRepository } from '../repositories/lifeRepository.ts';
import { ensure, validateModule } from './validation.ts';
import { newEntity } from './entity.ts';
import { modules } from '../features/library/catalog.ts';

export class LifeService {
  private repository: LifeRepository;
  private uuid: () => string;
  constructor(repository: LifeRepository, uuid: () => string) { this.repository = repository; this.uuid = uuid; }
  getAll() { return this.repository.getAll(); }
  async save<K extends ModuleKey>(key: K, input: Record<string, unknown>, id?: string, inboxId?: string): Promise<ModuleRecord<K>> {
    const repository = this.repository.collection(key);
    const existing = id ? await repository.getById(id) : null;
    if (id) ensure(existing, 'This record no longer exists.');
    if (key === 'accounts') ensure(!Object.keys(input).some(name => /password|secret|token|recoveryCode/i.test(name)), 'Do not store credentials in the account directory.');
    const values: Record<string, unknown> = {};
    for (const field of modules[key].fields) {
      const value = input[field.key];
      values[field.key] = typeof value === 'string' ? value.trim() : value;
      if (field.type === 'tags' && Array.isArray(value)) values[field.key] = [...new Set(value.map(tag => String(tag).trim()).filter(Boolean))];
      if (field.type === 'relation' && value) {
        const related = await this.repository.collection(field.collection!).getById(String(value));
        ensure(related, `Choose an existing ${field.label.toLowerCase()}.`);
      }
    }
    if (key === 'goals') values.progress = Math.min(100, Math.max(0, Number(values.currentValue) / Number(values.targetValue) * 100));
    const record = { ...(existing ?? newEntity(this.uuid())), ...values };
    validateModule(key, record);
    if (!id) return repository.create(record, inboxId);
    return repository.update(id, values as EntityPatch<ModuleRecord<K>>);
  }
  delete(key: ModuleKey, id: string) { return this.repository.collection(key).delete(id); }
}
