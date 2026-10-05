import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Chips, EmptyState, Field, Label, Screen } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { isModuleKey, modules, recordTitle } from './catalog';
import type { ModuleKey } from '../../types/life';
import { RecordCard } from './RecordCard';
import { monthlySubscription, money } from '../finance/selectors';

export function ModuleList({ module, parentId, parentType }: { module: ModuleKey; parentId?: string; parentType?: string }) {
  const data = useAppStore(state => state.data);
  const currency = useAppStore(state => state.settings.currency);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const records = data[module];
  const hasFavorites = ['notes', 'bookmarks'].includes(module);
  const statuses = [...new Set(records.flatMap(record => 'status' in record ? [record.status] : []))];
  const filters = module === 'inbox' ? ['All', 'Unprocessed', 'Processed'] : module === 'tripItems' ? ['All', 'flight', 'hotel', 'place', 'itinerary', 'booking', 'packing', 'note', 'document'] : hasFavorites ? ['All', 'Favorites'] : ['All', ...statuses];
  const visible = records.filter(record => {
    const values = record as unknown as Record<string, unknown>;
    if (parentId && values[parentType === 'project' ? 'projectId' : 'tripId'] !== parentId) return false;
    if (filter === 'Favorites' && !values.favorite) return false;
    if (filter === 'Unprocessed' && values.processed) return false;
    if (filter === 'Processed' && !values.processed) return false;
    if (!['All', 'Favorites', 'Unprocessed', 'Processed'].includes(filter) && values[module === 'tripItems' ? 'kind' : 'status'] !== filter) return false;
    return `${recordTitle(module, record)} ${Object.values(values).filter(value => typeof value === 'string').join(' ')}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => module === 'tripItems' && 'date' in a && 'date' in b ? String(a.date ?? '9999').localeCompare(String(b.date ?? '9999')) : module === 'subscriptions' && 'nextBillingDate' in a && 'nextBillingDate' in b ? a.nextBillingDate.localeCompare(b.nextBillingDate) : b.updatedAt.localeCompare(a.updatedAt));
  const monthly = data.subscriptions.filter(item => item.status === 'active' && item.currency === currency).reduce((total, item) => total + monthlySubscription(item), 0);
  return <Screen><AppHeader title={modules[module].title} eyebrow="Your personal space" />
    {module === 'subscriptions' && <Label>{money(monthly, currency)} / month · {money(monthly * 12, currency)} / year estimated ({currency} only)</Label>}
    {module === 'accounts' && <Label muted>Account details only. Never enter passwords, secret keys, or recovery codes, including in notes.</Label>}
    <Button title={`Add ${modules[module].singular.toLowerCase()}`} icon="add" onPress={() => router.push({ pathname: '/record', params: { module, ...(parentId ? { parentId, parentType } : {}) } })} />
    <Field label={`Search ${modules[module].title.toLowerCase()}`} value={search} onChangeText={setSearch} placeholder="Find something…" />
    {filters.length > 1 && <Chips items={filters} value={filter} onChange={setFilter} />}
    <Label muted size={12}>{visible.length} {visible.length === 1 ? 'RECORD' : 'RECORDS'}</Label>
    {visible.map(record => <RecordCard key={record.id} module={module} record={record} />)}
    {!visible.length && <EmptyState title={search ? 'Nothing matched' : 'Start with one'} description={search ? 'Try another search or filter.' : `Your ${modules[module].title.toLowerCase()} will live here.`} />}
  </Screen>;
}
export default function ModuleScreen() {
  const { module, parentId, parentType } = useLocalSearchParams<{ module: string; parentId?: string; parentType?: string }>();
  return isModuleKey(module) ? <ModuleList key={`${module}:${parentId ?? ''}`} module={module} parentId={parentId} parentType={parentType} /> : <Screen><EmptyState title="Module not found" description="Choose a module from More." /></Screen>;
}
