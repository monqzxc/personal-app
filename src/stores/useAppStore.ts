import { create } from 'zustand';
import type { CalendarEvent, EventInput, Settings, Task, TaskInput } from '../types/models';
import { calendarService, settingsRepository, taskService, lifeService, financeRepository, createId } from '../services/container';
import type { LifeCollections, ModuleKey } from '../types/life';
import { emptyLifeCollections } from '../features/library/catalog';
import { dateOnly } from '../utils/dates';
import { notificationService } from '../services/notificationService';
import { collectReminders } from '../services/reminderSelectors';

interface AppState {
  tasks: Task[];
  events: CalendarEvent[];
  settings: Settings;
  data: LifeCollections;
  notificationStatus: string;
  loaded: boolean;
  loading: boolean;
  saving: boolean;
  loadError: string | null;
  actionError: string | null;
  initialize(): Promise<void>;
  saveTask(input: TaskInput, id?: string, inboxId?: string): Promise<boolean>;
  toggleTask(id: string): Promise<boolean>;
  deleteTask(id: string): Promise<boolean>;
  saveEvent(input: EventInput, id?: string, inboxId?: string): Promise<boolean>;
  deleteEvent(id: string): Promise<boolean>;
  updateSettings(patch: Partial<Settings>): Promise<boolean>;
  clearError(): void;
  saveRecord(key: ModuleKey, input: Record<string, unknown>, id?: string, inboxId?: string): Promise<boolean>;
  deleteRecord(key: ModuleKey, id: string): Promise<boolean>;
  payBill(id: string): Promise<boolean>;
  renewSubscription(id: string): Promise<boolean>;
  importEvents(events: EventInput[]): Promise<boolean>;
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const upsert = <T extends { id: string }>(items: T[], item: T) => [...items.filter(old => old.id !== item.id), item];

export const useAppStore = create<AppState>((set, get) => {
  async function refresh() {
    const [tasks, events, settings, data] = await Promise.all([taskService.getAll(), calendarService.getAll(), settingsRepository.get(), lifeService.getAll()]);
    set({ tasks, events, settings, data });
    try { set({ notificationStatus: await notificationService.reconcile(collectReminders(tasks, events, data), settings.notificationsEnabled) }); }
    catch (error) { set({ notificationStatus: `Records saved; reminder scheduling failed: ${message(error)}` }); }
  }
  async function mutate(operation: () => Promise<void>): Promise<boolean> {
    if (get().saving) return false;
    set({ saving: true, actionError: null });
    try { await operation(); await refresh(); return true; }
    catch (error) { set({ actionError: message(error) }); return false; }
    finally { set({ saving: false }); }
  }
  return {
    tasks: [], events: [], data: emptyLifeCollections(), settings: { theme: 'system', currency: 'PHP', name: '', notificationsEnabled: false }, notificationStatus: '',
    loaded: false, loading: false, saving: false, loadError: null, actionError: null,
    async initialize() {
      if (get().loading || get().saving) return;
      set({ loading: true, loadError: null });
      try {
        await refresh();
        set({ loaded: true });
      } catch (error) { set({ loadError: message(error) }); }
      finally { set({ loading: false }); }
    },
    saveTask: (input, id, inboxId) => mutate(async () => {
      const task = await taskService.save(input, id, inboxId);
      set(state => ({ tasks: upsert(state.tasks, task) }));
    }),
    toggleTask: id => mutate(async () => {
      const task = await taskService.toggle(id);
      set(state => ({ tasks: upsert(state.tasks, task) }));
    }),
    deleteTask: id => mutate(async () => {
      await taskService.delete(id);
      set(state => ({ tasks: state.tasks.filter(task => task.id !== id) }));
    }),
    saveEvent: (input, id, inboxId) => mutate(async () => {
      const event = await calendarService.save(input, id, inboxId);
      set(state => ({ events: upsert(state.events, event) }));
    }),
    deleteEvent: id => mutate(async () => {
      await calendarService.delete(id);
      set(state => ({ events: state.events.filter(event => event.id !== id) }));
    }),
    updateSettings: patch => mutate(async () => {
      if (patch.notificationsEnabled && !get().settings.notificationsEnabled) await notificationService.enable();
      const settings = await settingsRepository.update(patch);
      set({ settings });
    }),
    clearError: () => set({ actionError: null }),
    saveRecord: (key, input, id, inboxId) => mutate(async () => { await lifeService.save(key, input, id, inboxId); }),
    deleteRecord: (key, id) => mutate(() => lifeService.delete(key, id)),
    payBill: id => mutate(() => financeRepository.payBill(id, createId(), createId(), dateOnly())),
    renewSubscription: id => mutate(() => financeRepository.renewSubscription(id, createId(), dateOnly())),
    importEvents: events => mutate(() => calendarService.importEvents(events)),
  };
});
