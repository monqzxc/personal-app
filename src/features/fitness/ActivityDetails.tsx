import { router } from 'expo-router';
import { Button, Card, Label } from '../../components/common/ui';
import type { FitnessActivity } from '../../types/life';
import { durationText, paceText } from './tracking';
import RouteMap from './RouteMap';

export function ActivityDetails({ activity }: { activity: FitnessActivity }) {
  return <Card><Label bold>{activity.kind} · {activity.source === 'gps' ? 'GPS recorded' : 'Manually logged'} · {activity.status}</Label>
    <Label>{durationText(activity.durationMinutes)} · {activity.distanceKm.toFixed(2)} km · {paceText(activity.durationMinutes, activity.distanceKm)} average pace</Label>
    {activity.source === 'gps' && <RouteMap route={activity.route} />}
    {activity.trackingError ? <Label muted>{activity.trackingError}</Label> : null}
    {activity.taskId && <Button title="Open linked task" variant="secondary" onPress={() => router.push({ pathname: '/task', params: { id: activity.taskId } })} />}
    {activity.status !== 'completed' && <Button title="Open active workout" onPress={() => router.push({ pathname: '/module', params: { module: 'activities' } })} />}
  </Card>;
}
