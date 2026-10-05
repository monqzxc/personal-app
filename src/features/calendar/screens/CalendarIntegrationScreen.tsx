import { useState } from 'react';
import { AppHeader, Button, Card, Label, Screen } from '../../../components/common/ui';
import { deviceCalendarService, type DeviceCalendar } from '../../../services/deviceCalendarService';
import { useAppStore } from '../../../stores/useAppStore';
import type { EventInput } from '../../../types/models';

export default function CalendarIntegrationScreen() {
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const importEvents = useAppStore(state => state.importEvents);
  const saving = useAppStore(state => state.saving);
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Calendar access failed.'); }
    finally { setBusy(false); }
  }
  return <Screen><AppHeader title="Bring your plans together." eyebrow="Device calendars" />
    <Card><Label>Import a snapshot of the next 90 days from a calendar you choose. Calendars from Google, Apple, or other accounts appear if they are configured on your device.</Label><Label muted size={12}>This is a one-way import, not continuous sync. Export individual saved events through their event screen.</Label></Card>
    <Button title="Choose a device calendar" busy={busy} onPress={() => { void run(async () => { const items = await deviceCalendarService.getCalendars(); setCalendars(items); if (!items.length) setMessage('No device calendars were found.'); }); }} />
    {calendars.map(calendar => <Button key={calendar.id} title={`${calendar.title}${calendar.source ? ` · ${calendar.source}` : ''}`} variant={selected === calendar.id ? 'primary' : 'secondary'} disabled={busy} onPress={() => { void run(async () => { setSelected(calendar.id); setEvents(await deviceCalendarService.getEvents(calendar.id)); }); }} />)}
    {selected && <Label>{events.length} events in the next 90 days</Label>}
    {events.slice(0, 20).map((event, index) => <Card key={event.providerEventId ?? index}><Label bold>{event.title}</Label><Label muted>{event.startDate} · {event.allDay ? 'All day' : event.startTime}</Label></Card>)}
    {events.length > 20 && <Label muted>Previewing 20 of {events.length} events.</Label>}
    {!!events.length && <Button title={`Import ${events.length} events`} busy={saving || busy} onPress={() => { void importEvents(events).then(ok => { if (ok) setMessage('Import complete. Already-imported occurrences were skipped.'); }); }} />}
    {message && <Card><Label>{message}</Label></Card>}
  </Screen>;
}
