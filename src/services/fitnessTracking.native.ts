import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { createId, fitnessRepository } from './container';
import type { FitnessActivity } from '../types/life';

const TASK = 'daywell-fitness-location';
let watcher: Location.LocationSubscription | null = null;
let queue: Promise<unknown> = Promise.resolve();
let lastError = '';
let recovered = false;
const message = (error: unknown) => error instanceof Error ? error.message : 'GPS tracking failed. Your saved route is retained.';
function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation);
  queue = next.catch(() => undefined);
  return next;
}
async function stopLocation() {
  watcher?.remove(); watcher = null;
  if (await TaskManager.isAvailableAsync() && await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
}
async function recordLocations(locations: Location.LocationObject[]) {
  const activity = await fitnessRepository.append(locations.map(item => ({ latitude: item.coords.latitude, longitude: item.coords.longitude, timestamp: item.timestamp, accuracy: item.coords.accuracy ?? Infinity })));
  if (!activity || activity.status !== 'recording') await stopLocation();
}
async function fail(error: unknown) {
  lastError = message(error);
  try { await stopLocation(); } catch { lastError += ' Check location permissions in device settings.'; }
  try {
    const active = await fitnessRepository.active();
    if (active?.status === 'recording') await fitnessRepository.transition(active.id, 'recover', Date.now(), lastError);
  } catch { lastError += ' Storage could not be updated; reopen Fitness before resuming.'; }
}
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, body => exclusive(async () => {
  try {
    if (body.error) throw new Error(body.error.message);
    await recordLocations(body.data.locations);
  } catch (error) { await fail(error); }
}));

async function permissions(background: boolean) {
  if (!await Location.hasServicesEnabledAsync()) throw new Error('Turn on Location Services, then try again.');
  if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error('Location permission was denied. Enable precise location in device settings, or log the activity manually.');
  if (background) {
    if (!await TaskManager.isAvailableAsync()) throw new Error('Screen-lock tracking needs a MONAPp development or installed build. Turn off screen-lock tracking to test in Expo Go.');
    if (!(await Location.requestBackgroundPermissionsAsync()).granted) throw new Error('Allow location all the time / Always in device settings for screen-lock tracking, or turn that option off.');
  }
}
async function begin(activity: FitnessActivity) {
  lastError = '';
  await fitnessRepository.transition(activity.id, 'resume');
  try {
    if (activity.backgroundEnabled) await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000, deferredUpdatesInterval: 5000,
      activityType: Location.ActivityType.Fitness, pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
      foregroundService: { notificationTitle: 'MONAPp is recording your activity', notificationBody: 'Open Fitness to pause or finish.', killServiceOnDestroy: true },
    });
    else watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000 },
      location => { void exclusive(async () => { try { await recordLocations([location]); } catch (error) { await fail(error); } }); },
      reason => { void exclusive(() => fail(new Error(reason))); });
  } catch (error) { await fail(error); throw error; }
}
AppState.addEventListener('change', state => {
  if (state === 'background' && watcher) void exclusive(async () => {
    try {
      await stopLocation();
      const active = await fitnessRepository.active();
      if (active?.status === 'recording') await fitnessRepository.transition(active.id, 'pause', Date.now(), 'Screen-only tracking paused when the app went into the background.');
    } catch (error) { await fail(error); }
  });
});
export const fitnessTracking = {
  start: (kind: 'walk' | 'run', background: boolean, tripId = '', pokemonId?: number) => exclusive(async () => {
    if (await fitnessRepository.active()) throw new Error('Finish your active workout first.');
    await permissions(background);
    const activity = await fitnessRepository.create(createId(), kind, background, Date.now(), tripId, pokemonId);
    await begin(activity);
  }),
  resume: (id: string) => exclusive(async () => {
    const active = await fitnessRepository.active();
    if (!active || active.id !== id || active.status !== 'paused') throw new Error('This workout cannot be resumed.');
    await permissions(active.backgroundEnabled);
    await begin(active);
  }),
  pause: (id: string) => exclusive(async () => {
    const activity = await fitnessRepository.transition(id, 'pause');
    await stopLocation();
    return activity;
  }),
  finish: (id: string) => exclusive(async () => {
    const activity = await fitnessRepository.transition(id, 'finish');
    await stopLocation();
    return activity;
  }),
  recover: () => exclusive(async () => {
    if (recovered) return;
    // A cold launch must not count time after a killed recording as exercise.
    await stopLocation();
    const active = await fitnessRepository.active();
    if (active?.status === 'recording') await fitnessRepository.transition(active.id, 'recover', Date.now(), 'Recording was interrupted. Paused at the last saved GPS point; resume or finish.');
    recovered = true;
  }),
  get error() { return lastError; },
};
