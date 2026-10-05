import { useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Badge, Card, EmptyState, Field, Label, Screen } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { searchService } from '../../services/searchService';

export default function SearchScreen() {
  const tasks = useAppStore(state => state.tasks);
  const events = useAppStore(state => state.events);
  const data = useAppStore(state => state.data);
  const [query, setQuery] = useState('');
  const results = searchService.search(query, { tasks, events, data });
  return <Screen><AppHeader title="Find your thread." eyebrow="Global search" /><Field label="Search everything" placeholder="A task, idea, place, or account…" value={query} onChangeText={setQuery} autoFocus />
    {results.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: item.module ? '/record' : item.kind === 'Task' ? '/task' : '/event', params: { id: item.sourceId, ...(item.module ? { module: item.module } : {}) } })}><Card><Badge title={item.kind} /><Label bold>{item.title}</Label><Label muted size={12}>{item.text.slice(0, 120)}</Label></Card></Pressable>)}
    {!results.length && <EmptyState title={query ? 'No matches yet' : 'Everything, a little closer'} description={query ? 'Try another word or a shorter phrase.' : 'Search across your local records.'} icon="search-outline" />}
    {results.length === 100 && <Label muted>Showing the first 100 matches. Narrow your search to find more.</Label>}
  </Screen>;
}
