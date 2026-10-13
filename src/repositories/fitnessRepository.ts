import type { LocalDatabase } from '../storage/localDatabase.ts';
import type { FitnessActivity } from '../types/life.ts';
import { newEntity } from '../services/entity.ts';
import { ensure } from '../services/validation.ts';
import { moduleDefaults } from '../features/library/catalog.ts';
import { appendPosition, pauseActivity, type Position } from '../features/fitness/tracking.ts';
import { dateOnly } from '../utils/dates.ts';

export class LocalFitnessRepository {
  private db: LocalDatabase;
  constructor(db: LocalDatabase) { this.db = db; }
  async list() { return (await this.db.snapshot()).activities.filter(item => !item.deletedAt); }
  async active() { return (await this.list()).find(item => item.status !== 'completed'); }
  create(id: string, kind: 'walk' | 'run', backgroundEnabled = false, now = Date.now(), tripId = '', pokemonId?: number) {
    return this.db.mutate(data => {
      ensure(!data.activities.some(item => !item.deletedAt && item.status !== 'completed'), 'Finish the active workout first.');
      ensure(!tripId || data.trips.some(item => item.id === tripId && !item.deletedAt), 'Choose an existing trip.');
      const activity = { ...moduleDefaults('activities'), ...newEntity(id), name: kind === 'walk' ? 'Walk' : 'Run', kind, date: dateOnly(new Date(now)), source: 'gps', status: 'paused', backgroundEnabled, tripId, ...(pokemonId === undefined ? {} : { pokemonId }) } as FitnessActivity;
      data.activities.push(activity);
      return activity;
    });
  }
  transition(id: string, action: 'resume' | 'pause' | 'finish' | 'recover', now = Date.now(), error = '') {
    return this.db.mutate(data => {
      const activity = data.activities.find(item => item.id === id && !item.deletedAt);
      ensure(activity && activity.source === 'gps' && activity.status !== 'completed', 'This workout is no longer active.');
      if (action === 'resume') {
        ensure(activity.status === 'paused', 'The workout is already recording.');
        activity.status = 'recording'; activity.resumedAt = now; activity.segment += 1; activity.trackingError = '';
      } else {
        const end = action === 'recover' && activity.status === 'recording' ? Math.max(activity.resumedAt, activity.route.at(-1)?.timestamp ?? 0) : now;
        pauseActivity(activity, end, error);
        if (action === 'finish') activity.status = 'completed';
      }
      activity.updatedAt = new Date(now).toISOString(); activity.version += 1; activity.syncStatus = 'local';
      return activity;
    });
  }
  append(positions: Position[], now = Date.now()) {
    return this.db.mutate(data => {
      const activity = data.activities.find(item => !item.deletedAt && item.status === 'recording');
      if (!activity) return null;
      const previousStatus = activity.status;
      let changed = false;
      for (const position of [...positions].sort((a, b) => a.timestamp - b.timestamp)) changed = appendPosition(activity, position, now) || changed;
      if (changed || activity.status !== previousStatus) { activity.updatedAt = new Date(now).toISOString(); activity.version += 1; activity.syncStatus = 'local'; }
      return activity;
    });
  }
}
