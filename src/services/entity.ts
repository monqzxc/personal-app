import type { Entity } from '../types/models.ts';

export function newEntity(id: string): Entity {
  const now = new Date().toISOString();
  return { id, createdAt: now, updatedAt: now, deletedAt: null, syncStatus: 'local', version: 1 };
}
