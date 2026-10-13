import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Switch, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppHeader, Button, Card, Chips, EmptyState, Field, Label, Screen, SectionHeader, layout } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useToastStore } from '../../stores/useToastStore';
import { fitnessRepository } from '../../services/container';
import { fitnessTracking } from '../../services/fitnessTracking';
import { durationText, elapsedMilliseconds, paceText, weeklyFitness } from './tracking';
import { useToday } from '../../hooks/useToday';
import { RecordCard } from '../library/RecordCard';
import RouteMap from './RouteMap';
import { useTheme } from '../../theme/useTheme';
import { PokemonCompanion, PokemonPicker } from './PokemonCompanion';
import { pokemonProgress } from './pokemon';

export default function FitnessScreen({ tripId, initialKind = 'walk' }: { tripId?: string; initialKind?: 'walk' | 'run' }) {
  const { colors } = useTheme();
  const activities = useAppStore(state => state.data.activities);
  const [kind, setKind] = useState<'walk' | 'run'>(initialKind);
  const [background, setBackground] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [now, setNow] = useState(Date.now());
  const [pokemonId, setPokemonId] = useState<number | undefined>(() => [...activities].filter(item => item.pokemonId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.pokemonId ?? 4);
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = useToday();
  const active = activities.find(item => item.status !== 'completed');
  const companion = active?.pokemonId ? pokemonProgress(active.pokemonId, active.distanceKm) : undefined;
  const selectedCompanion = pokemonId ? pokemonProgress(pokemonId, 0) : undefined;
  const lastForm = useRef({ activityId: '', milestoneKm: 0 });
  useEffect(() => {
    const milestoneKm = companion?.current.distanceKm ?? 0;
    if (active && companion && lastForm.current.activityId === active.id && milestoneKm > lastForm.current.milestoneKm) {
      useToastStore.getState().showToast(`Your partner evolved into ${companion.current.name}!`);
    }
    lastForm.current = { activityId: active?.id ?? '', milestoneKm };
  }, [active?.id, companion?.current.slug]);
  const scoped = activities.filter(item => !tripId || item.tripId === tripId);
  const week = weeklyFitness(scoped, today);
  const visible = scoped.filter(item => item.status === 'completed' && (filter === 'All' || item.kind === filter) && `${item.name} ${item.notes} ${item.date}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const refresh = useCallback(async () => {
    const activities = await fitnessRepository.list();
    useAppStore.setState(state => ({ data: { ...state.data, activities } }));
    setNow(Date.now());
  }, []);
  useFocusEffect(useCallback(() => {
    const update = () => { if (AppState.currentState === 'active' || Platform.OS === 'web') void refresh().catch(reason => setError(String(reason))); };
    update();
    const timer = setInterval(update, 3000);
    return () => clearInterval(timer);
  }, [refresh]));
  useEffect(() => {
    if (active?.status !== 'recording') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active?.status]);
  async function run<T>(operation: () => Promise<T>, successMessage: string | ((result: T) => string)) {
    if (busy) return;
    setBusy(true); setError('');
    try { const result = await operation(); useToastStore.getState().showToast(typeof successMessage === 'function' ? successMessage(result) : successMessage); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { try { await refresh(); } catch (reason) { setError(String(reason)); } setBusy(false); }
  }
  const minutes = active ? elapsedMilliseconds(active, now) / 60000 : 0;
  return <Screen><AppHeader title="Make time to move." eyebrow="Fitness" />
    <Card><Label bold>This week · from {week.start}</Label><Label>{week.count} activities · {week.distanceKm.toFixed(2)} km · {week.minutes.toFixed(0)} active minutes</Label></Card>
    <Button title="Log an activity manually" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'activities', ...(tripId ? { parentId: tripId } : {}) } })} />
    {(error || fitnessTracking.error) && <Card><Label color="#B42318">{error || fitnessTracking.error}</Label>{Platform.OS !== 'web' && <Button title="Open phone settings" variant="ghost" onPress={() => { void Linking.openSettings().catch(reason => setError(String(reason))); }} />}</Card>}
    {active ? <Card><Label bold>{active.name} · {active.status}</Label><Label size={32} bold>{durationText(minutes)}</Label><Label>{active.distanceKm.toFixed(2)} km · {paceText(minutes, active.distanceKm)} average pace</Label>
      <View style={layout.wrap}><Button title={active.status === 'recording' ? 'Pause' : 'Resume'} busy={busy} onPress={() => { void run(() => active.status === 'recording' ? fitnessTracking.pause(active.id) : fitnessTracking.resume(active.id), active.status === 'recording' ? 'Activity paused.' : 'Activity resumed.'); }} /><Button title="Finish & save" variant="secondary" busy={busy} onPress={() => {
        void run(async () => {
          const finished = await fitnessTracking.finish(active.id);
          setKind(finished.kind); setPokemonId(finished.pokemonId);
          return finished;
        }, finished => {
          if (!finished.pokemonId) return 'Activity saved.';
          const final = pokemonProgress(finished.pokemonId, finished.distanceKm);
          const evolved = final && final.current.distanceKm > (companion?.current.distanceKm ?? 0);
          return `Run saved! ${Math.floor(finished.distanceKm * 1000).toLocaleString()} XP earned. ${evolved ? `Your partner evolved into ${final.current.name}!` : `Finished with ${final?.current.name ?? 'your partner'}.`}`;
        });
      }} /></View>
      {active.pokemonId && <PokemonCompanion pokemonId={active.pokemonId} distanceKm={active.distanceKm} />}
      {active.trackingError ? <Label>{active.trackingError}</Label> : null}
      {active.status === 'recording' && <Label muted>{!active.route.length ? 'Waiting for an accurate GPS fix. Step outside for a clearer signal.' : now - active.route.at(-1)!.timestamp > 30000 ? 'No recent route point. You may be stationary or the GPS signal may be weak.' : 'Recording your route. Distance is a GPS estimate.'}</Label>}
      <RouteMap route={active.route} />
      <Label muted size={12}>GPS progress is saved locally. Finish before editing the activity or linking it to a trip/task. Avoid force-closing the app.</Label>
    </Card> : <Card><Label bold>Track a new walk or run</Label><Chips items={['walk', 'run'] as const} value={kind} onChange={setKind} />
      {kind === 'run' && <>
        {pokemonId && selectedCompanion ? <PokemonCompanion pokemonId={pokemonId} distanceKm={selectedCompanion.distanceKm} /> : <Label muted>Bring a Pokémon along to earn XP and evolve as you run.</Label>}
        <Button title={pokemonId ? 'Change Pokémon' : 'Choose a Pokémon'} variant="secondary" disabled={busy} onPress={() => setPickerOpen(true)} />
      </>}
      <View style={layout.row}><View style={{ flex: 1 }}><Label>Keep tracking with the screen locked</Label></View><Switch trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} accessibilityLabel="Track with screen locked" value={background} onValueChange={setBackground} /></View>
      <Label muted size={12}>{background ? 'Requires an installed build and Always / Allow all the time location permission. Your phone may open settings to grant access. Tracking runs only until you pause or finish.' : 'Screen-only mode pauses when the app goes into the background, including screen lock.'} Routes stay on this device. Street-map providers receive requests for the area you view.</Label>
      <Button title={`Start ${kind}${kind === 'run' && selectedCompanion ? ` with ${selectedCompanion.current.name}` : ''}`} busy={busy} disabled={Platform.OS === 'web'} onPress={() => { void run(() => fitnessTracking.start(kind, background, tripId, kind === 'run' ? pokemonId : undefined), 'Activity started.'); }} />
      {Platform.OS === 'web' && <Label muted>Live GPS requires the Android or iPhone app. Manual logging and saved route outlines work here.</Label>}
    </Card>}
    <SectionHeader title="Activity history" /><Field label="Search activities" value={search} onChangeText={setSearch} placeholder="Name, notes, or date" /><Chips items={['All', 'walk', 'run']} value={filter} onChange={setFilter} />
    {visible.map(activity => <RecordCard key={activity.id} module="activities" record={activity} />)}
    {!visible.length && <EmptyState title="Your next step starts here" description="Save a walk or run to build your activity history." icon="walk-outline" />}
    <PokemonPicker visible={pickerOpen} selected={pokemonId} onSelect={setPokemonId} onClose={() => setPickerOpen(false)} />
  </Screen>;
}
