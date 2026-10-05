import { Platform } from 'react-native';
import type { CalendarEvent, EventInput } from '../types/models';
import { addDays, dateOnly } from '../utils/dates';
import { emptyEvent } from './calendarService';

export interface DeviceCalendar { id: string; title: string; source: string }
export interface CalendarProvider {
  getCalendars(): Promise<DeviceCalendar[]>;
  getEvents(calendarId: string): Promise<EventInput[]>;
  exportEvent(event: CalendarEvent): Promise<string>;
}
async function nativeCalendar() {
  if (Platform.OS === 'web') throw new Error('Device calendar access is available in the Android/iOS app.');
  // SDK 57's legacy API also works in Expo Go; isolated here for provider replacement.
  return import('expo-calendar/legacy');
}
export class DeviceCalendarProvider implements CalendarProvider {
  async getCalendars(): Promise<DeviceCalendar[]> {
    const Calendar = await nativeCalendar();
    if (!(await Calendar.requestCalendarPermissionsAsync()).granted) throw new Error('Calendar access was not granted.');
    return (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).map(item => ({ id: item.id, title: item.title, source: item.source?.name ?? '' }));
  }
  async getEvents(calendarId: string): Promise<EventInput[]> {
    const Calendar = await nativeCalendar();
    if (!(await Calendar.getCalendarPermissionsAsync()).granted) throw new Error('Calendar permission is disabled.');
    const start = new Date(`${dateOnly()}T00:00:00`);
    const end = new Date(`${addDays(dateOnly(), 90)}T00:00:00`);
    const events = await Calendar.getEventsAsync([calendarId], start, end);
    return events.map(item => {
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      const time = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      const endDay = item.allDay ? addDays(dateOnly(endDate), -1) : dateOnly(endDate);
      return { ...emptyEvent(dateOnly(startDate)), title: item.title || 'Untitled event',
        description: item.notes ?? '', location: item.location ?? '', category: 'Imported',
        endDate: endDay < dateOnly(startDate) ? dateOnly(startDate) : endDay, allDay: item.allDay,
        startTime: item.allDay ? null : time(startDate), endTime: item.allDay ? null : time(endDate),
        providerEventId: `${calendarId}:${item.id}:${startDate.toISOString()}` };
    });
  }
  async exportEvent(event: CalendarEvent): Promise<string> {
    const Calendar = await nativeCalendar();
    const result = await Calendar.createEventInCalendarAsync({ title: event.title, notes: event.description, location: event.location,
      allDay: event.allDay, startDate: new Date(`${event.startDate}T${event.allDay ? '00:00' : event.startTime}:00`),
      endDate: new Date(`${event.allDay ? addDays(event.endDate, 1) : event.endDate}T${event.allDay ? '00:00' : event.endTime}:00`) });
    return result.action === 'saved' ? 'A copy was saved in your device calendar.' : 'Calendar dialog closed. No local event was changed.';
  }
}
export const deviceCalendarService: CalendarProvider = new DeviceCalendarProvider();
