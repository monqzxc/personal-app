import type { FitnessActivity, RoutePoint } from '../../types/life.ts';
import { addDays, dateOnly, localDate } from '../../utils/dates.ts';

export type Position = Omit<RoutePoint, 'segment'>;
export function distanceMeters(a: Pick<Position, 'latitude' | 'longitude'>, b: Pick<Position, 'latitude' | 'longitude'>) {
  const radians = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * radians;
  const lon = (b.longitude - a.longitude) * radians;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function elapsedMilliseconds(activity: FitnessActivity, now = Date.now()) {
  return Math.min(604800000, activity.elapsedMs + (activity.status === 'recording' ? Math.max(0, now - activity.resumedAt) : 0));
}
export function pauseActivity(activity: FitnessActivity, now: number, error = '') {
  activity.elapsedMs = elapsedMilliseconds(activity, now);
  activity.durationMinutes = activity.elapsedMs / 60000;
  activity.resumedAt = 0;
  activity.status = 'paused';
  activity.trackingError = error;
}
export function appendPosition(activity: FitnessActivity, position: Position, now = Date.now()): boolean {
  if (activity.status !== 'recording' || !Object.values(position).every(Number.isFinite)
    || Math.abs(position.latitude) > 90 || Math.abs(position.longitude) > 180 || position.accuracy < 0 || position.accuracy > 35
    || position.timestamp < activity.resumedAt || position.timestamp > now + 10000) return false;
  const last = activity.route.at(-1);
  if (last && position.timestamp <= last.timestamp) return false;
  if (activity.route.length >= 20000) {
    pauseActivity(activity, position.timestamp, 'Route capacity reached. Finish this activity and start another.');
    return false;
  }
  let distance = 0;
  if (last && last.segment === activity.segment) {
    const gap = position.timestamp - last.timestamp;
    if (gap > 60000) activity.segment += 1;
    else {
      distance = distanceMeters(last, position);
      // shortcut: conservative walk/run filtering; calibrate these limits with real-device routes before competitive use.
      if (distance / (gap / 1000) > 12 || distance < Math.max(3, position.accuracy / 3)) return false;
    }
  }
  activity.route.push({ ...position, segment: activity.segment });
  activity.distanceKm += distance / 1000;
  activity.trackingError = '';
  return true;
}
export function routeSegments(route: RoutePoint[]) {
  const segments: RoutePoint[][] = [];
  for (const point of route) {
    if (segments.at(-1)?.at(-1)?.segment !== point.segment) segments.push([]);
    segments.at(-1)!.push(point);
  }
  return segments;
}
export function durationText(minutes: number) {
  const seconds = Math.floor(minutes * 60);
  return `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function paceText(minutes: number, distanceKm: number) {
  if (distanceKm < 0.01 || minutes <= 0) return '—';
  const seconds = Math.round(minutes / distanceKm * 60);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')} /km`;
}
export function weeklyFitness(activities: FitnessActivity[], today = dateOnly()) {
  const weekday = localDate(today).getDay();
  const start = addDays(today, -((weekday + 6) % 7));
  const completed = activities.filter(item => !item.deletedAt && item.status === 'completed' && item.date >= start && item.date <= today);
  return { start, count: completed.length, minutes: completed.reduce((sum, item) => sum + item.durationMinutes, 0), distanceKm: completed.reduce((sum, item) => sum + item.distanceKm, 0) };
}
