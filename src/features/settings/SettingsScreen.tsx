import { useState } from 'react';
import { router } from 'expo-router';
import { AppHeader, Button, Card, Chips, Field, Label, Screen } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import type { Settings } from '../../types/models';
import { Switch, View } from 'react-native';
import { layout } from '../../components/common/ui';

export default function SettingsScreen() {
  const settings = useAppStore(state => state.settings);
  const update = useAppStore(state => state.updateSettings);
  const saving = useAppStore(state => state.saving);
  const notificationStatus = useAppStore(state => state.notificationStatus);
  const [draft, setDraft] = useState<Settings>(settings);
  return <Screen><AppHeader title="Make yourself at home." eyebrow="Settings" />
    <Field label="Your first name" placeholder="What should we call you?" maxLength={80} value={draft.name} onChangeText={name => setDraft(previous => ({ ...previous, name }))} />
    <Card><Label bold>Appearance</Label><Chips items={['system', 'light', 'dark'] as const} value={draft.theme} onChange={theme => setDraft(previous => ({ ...previous, theme }))} /><Label muted size={12}>System follows your device’s appearance.</Label></Card>
    <Card><Label bold>Default currency</Label><Chips items={['PHP', 'USD', 'EUR', 'JPY', 'GBP']} value={draft.currency} onChange={currency => setDraft(previous => ({ ...previous, currency }))} /><Label muted size={12}>Used for new financial records and summaries. This does not convert amounts.</Label></Card>
    <Card><View style={[layout.row, { justifyContent: 'space-between' }]}><Label bold>Device reminders</Label><Switch accessibilityLabel="Enable device reminders" value={draft.notificationsEnabled} onValueChange={notificationsEnabled => setDraft(previous => ({ ...previous, notificationsEnabled }))} /></View><Label muted>{notificationStatus || 'Save to request notification permission on your phone.'}</Label><Label muted size={12}>The next 60 future reminders are scheduled. Open the app to replenish them. Recurrence and yearly dates do not automatically repeat notifications.</Label></Card>
    <Button title="Connect device calendars" variant="secondary" onPress={() => router.push('/calendar-integration')} />
    <Card><Label bold>Local by design</Label><Label muted>Your records stay on this device. Device-calendar export copies an event to a calendar you choose. There is no Daywell cloud backup or sync. Uninstalling the app or clearing browser storage can remove local data.</Label><Label muted size={12}>Schema version 2 · Daywell 0.2.0</Label></Card>
    <Button title="Save preferences" busy={saving} onPress={() => { void update({ ...draft, name: draft.name.trim() }).then(ok => { if (ok) router.back(); }); }} />
    <Button title="Cancel" variant="ghost" disabled={saving} onPress={() => router.back()} />
  </Screen>;
}
