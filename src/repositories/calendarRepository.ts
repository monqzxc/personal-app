import { LocalRepository } from './localRepository.ts';
import type { LocalDatabase } from '../storage/localDatabase.ts';
import type { CalendarRepository } from './contracts.ts';

export class LocalCalendarRepository extends LocalRepository<'events'> implements CalendarRepository {
  constructor(db: LocalDatabase) { super(db, 'events'); }
}
