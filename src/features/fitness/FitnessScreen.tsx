import { useCallback, useEffect, useState } from 'react';
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
  const today = useToday();
  const active = activities.find(item => item.status !== 'completed');
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
  async function run(operation: () => Promise<unknown>, successMessage: string) {
    if (busy) return;
    setBusy(true); setError('');
    try { await operation(); useToastStore.getState().showToast(successMessage); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { try { await refresh(); } catch (reason) { setError(String(reason)); } setBusy(false); }
  }
  const minutes = active ? elapsedMilliseconds(active, now) / 60000 : 0;
  return <Screen><AppHeader title="Make time to move." eyebrow="Fitness" />
    <Card><Label bold>This week · from {week.start}</Label><Label>{week.count} activities · {week.distanceKm.toFixed(2)} km · {week.minutes.toFixed(0)} active minutes</Label></Card>
    <Button title="Log an activity manually" variant="secondary" onPress={() => router.push({ pathname: '/record', params: { module: 'activities', ...(tripId ? { parentId: tripId } : {}) } })} />
    {(error || fitnessTracking.error) && <Card><Label color="#B42318">{error || fitnessTracking.error}</Label>{Platform.OS !== 'web' && <Button title="Open phone settings" variant="ghost" onPress={() => { void Linking.openSettings().catch(reason => setError(String(reason))); }} />}</Card>}
    {active ? <Card><Label bold>{active.name} · {active.status}</Label><Label size={32} bold>{durationText(minutes)}</Label><Label>{active.distanceKm.toFixed(2)} km · {paceText(minutes, active.distanceKm)} average pace</Label>
      {active.trackingError ? <Label>{active.trackingError}</Label> : null}
      {active.status === 'recording' && <Label muted>{!active.route.length ? 'Waiting for an accurate GPS fix. Step outside for a clearer signal.' : now - active.route.at(-1)!.timestamp > 30000 ? 'No recent route point. You may be stationary or the GPS signal may be weak.' : 'Recording your route. Distance is a GPS estimate.'}</Label>}
      <RouteMap route={active.route} />
      <View style={layout.wrap}><Button title={active.status === 'recording' ? 'Pause' : 'Resume'} busy={busy} onPress={() => { void run(() => active.status === 'recording' ? fitnessTracking.pause(active.id) : fitnessTracking.resume(active.id), active.status === 'recording' ? 'Activity paused.' : 'Activity resumed.'); }} /><Button title="Finish & save" variant="secondary" busy={busy} onPress={() => { void run(() => fitnessTracking.finish(active.id), 'Activity saved.'); }} /></View>
      <Label muted size={12}>GPS progress is saved locally. Finish before editing the activity or linking it to a trip/task. Avoid force-closing the app.</Label>
    </Card> : <Card><Label bold>Track a new walk or run</Label><Chips items={['walk', 'run'] as const} value={kind} onChange={setKind} />
      <View style={layout.row}><View style={{ flex: 1 }}><Label>Keep tracking with the screen locked</Label></View><Switch trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} accessibilityLabel="Track with screen locked" value={background} onValueChange={setBackground} /></View>
      <Label muted size={12}>{background ? 'Requires an installed build and Always / Allow all the time location permission. Your phone may open settings to grant access. Tracking runs only until you pause or finish.' : 'Screen-only mode pauses when the app goes into the background, including screen lock.'} Routes stay on this device. Street-map providers receive requests for the area you view.</Label>
      <Button title={`Start ${kind}`} busy={busy} disabled={Platform.OS === 'web'} onPress={() => { void run(() => fitnessTracking.start(kind, background, tripId), 'Activity started.'); }} />
      {Platform.OS === 'web' && <Label muted>Live GPS requires the Android or iPhone app. Manual logging and saved route outlines work here.</Label>}
    </Card>}
    <SectionHeader title="Activity history" /><Field label="Search activities" value={search} onChangeText={setSearch} placeholder="Name, notes, or date" /><Chips items={['All', 'walk', 'run']} value={filter} onChange={setFilter} />
    {visible.map(activity => <RecordCard key={activity.id} module="activities" record={activity} />)}
    {!visible.length && <EmptyState title="Your next step starts here" description="Save a walk or run to build your activity history." icon="walk-outline" />}
  </Screen>;
}
