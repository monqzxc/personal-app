import type { CalendarEvent, Task } from '../types/models.ts';
import type { LifeCollections, ModuleKey } from '../types/life.ts';
import { moduleKeys, modules, recordTitle } from '../features/library/catalog.ts';

export interface SearchDocument { id: string; title: string; text: string; kind: string; sourceId: string; module?: ModuleKey }
export interface SearchSource { tasks: Task[]; events: CalendarEvent[]; data: LifeCollections }
export class SearchService {
  private providers = new Map<string, (source: SearchSource) => SearchDocument[]>();
  register(name: string, provider: (source: SearchSource) => SearchDocument[]) { this.providers.set(name, provider); }
  search(query: string, source: SearchSource): SearchDocument[] {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return [...this.providers.values()].flatMap(provider => provider(source)).filter(item => terms.every(term => `${item.title} ${item.text}`.toLowerCase().includes(term))).slice(0, 100);
  }
}
export const searchService = new SearchService();
searchService.register('tasks', source => source.tasks.filter(item => !item.deletedAt).map(item => ({ id: `tasks:${item.id}`, sourceId: item.id, title: item.title, text: `${item.description} ${item.notes} ${item.category} ${item.tags.join(' ')}`, kind: 'Task' })));
searchService.register('events', source => source.events.filter(item => !item.deletedAt).map(item => ({ id: `events:${item.id}`, sourceId: item.id, title: item.title, text: `${item.description} ${item.location}`, kind: 'Event' })));
for (const key of moduleKeys) searchService.register(key, source => source.data[key].filter(item => !item.deletedAt).map(item => ({ id: `${key}:${item.id}`, sourceId: item.id, module: key, title: recordTitle(key, item), text: Object.entries(item).filter(([field]) => !['id', 'createdAt', 'updatedAt'].includes(field)).map(([, value]) => typeof value === 'string' || Array.isArray(value) ? String(value) : '').join(' '), kind: modules[key].singular })));
