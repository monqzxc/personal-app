import type { ModuleKey, ModuleRecord } from '../types/life.ts';
import type { EntityPatch } from '../types/models.ts';
import type { LifeRepository } from '../repositories/lifeRepository.ts';
import { ensure, validateModule } from './validation.ts';
import { newEntity } from './entity.ts';
import { modules } from '../features/library/catalog.ts';
import { dateOnly } from '../utils/dates.ts';

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
    if (key === 'transactions' && existing) {
      for (const field of ['billId', 'subscriptionId', 'expectedIncomeId'] as const) {
        ensure(values[field] === (existing as unknown as Record<string, unknown>)[field], 'Payment and receipt links cannot be changed.');
      }
    }
    if (key === 'expectedIncome') {
      const received = existing && 'status' in existing && existing.status === 'received';
      ensure(received || values.status !== 'received', 'Use Mark received to create the actual income transaction.');
      ensure(!received || values.status === 'received', 'Received income cannot be reopened. Correct its transaction instead.');
    }
    if (key === 'bills' && existing && 'status' in existing && existing.status === 'paid') ensure(values.status === 'paid', 'A paid bill cannot be reopened. Correct its expense transaction instead.');
    const record = { ...(existing ?? newEntity(this.uuid())), ...values };
    if (key === 'activities') {
      if (existing && 'source' in existing && existing.source === 'gps') {
        ensure(existing.status === 'completed', 'Finish this workout before editing it.');
        for (const field of ['kind', 'pokemonId', 'source', 'status', 'elapsedMs', 'resumedAt', 'segment', 'route', 'durationMinutes', 'distanceKm', 'trackingError', 'backgroundEnabled']) values[field] = (existing as unknown as Record<string, unknown>)[field];
        Object.assign(record, values);
      } else {
        ensure(values.source === 'manual', 'Start GPS activities from Fitness.');
        ensure(input.pokemonId === undefined, 'Choose a Pokémon when starting a GPS run.');
      }
    }
    validateModule(key, record);
    if (key === 'debts' || key === 'repayments') ensure(String(values.date) <= dateOnly(), 'Record lending, borrowing, and repayments only after they happen. Choose today or an earlier date.');
    if (!id) return repository.create(record, inboxId);
    return repository.update(id, values as EntityPatch<ModuleRecord<K>>);
  }
  async delete(key: ModuleKey, id: string) {
    if (key === 'activities') {
      const activity = await this.repository.collection('activities').getById(id);
      ensure(!activity || activity.status === 'completed', 'Finish the active workout before deleting it.');
    }
    return this.repository.collection(key).delete(id);
  }
}
