import { useRef, useState } from 'react';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { AppHeader, Button, Card, Chips, Field, Label, Screen } from '../../components/common/ui';
import { useAppStore } from '../../stores/useAppStore';
import type { Settings } from '../../types/models';
import { Switch, View } from 'react-native';
import { layout } from '../../components/common/ui';
import { useTheme } from '../../theme/useTheme';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { pickProfilePhoto } from '../../services/profilePhoto';
import { SCHEMA_VERSION } from '../../storage/migrations';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const settings = useAppStore(state => state.settings);
  const update = useAppStore(state => state.updateSettings);
  const saving = useAppStore(state => state.saving);
  const notificationStatus = useAppStore(state => state.notificationStatus);
  const [draft, setDraft] = useState<Settings>(settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const picking = useRef(false);
  async function choosePhoto() {
    if (picking.current || saving) return;
    picking.current = true;
    setPickingPhoto(true); setPhotoError('');
    try {
      const profilePhoto = await pickProfilePhoto();
      if (profilePhoto) setDraft(previous => ({ ...previous, profilePhoto }));
    } catch { setPhotoError('Could not open or read that photo. Check photo access in your device settings, then try another image.'); }
    finally { picking.current = false; setPickingPhoto(false); }
  }
  return <Screen><AppHeader title="Make yourself at home." eyebrow="Settings" />
    <Card><Label bold>Profile photo</Label>
      <View style={{ alignItems: 'center' }}><ProfileAvatar name={draft.name} photo={draft.profilePhoto} size={88} /></View>
      <Button title={draft.profilePhoto ? 'Change photo' : 'Choose photo'} icon="image-outline" variant="secondary" busy={pickingPhoto} disabled={saving} onPress={() => { void choosePhoto(); }} />
      {draft.profilePhoto ? <Button title="Remove photo" variant="ghost" disabled={saving || pickingPhoto} onPress={() => { setDraft(previous => ({ ...previous, profilePhoto: '' })); setPhotoError(''); }} /> : null}
      {photoError ? <View accessibilityRole="alert"><Label color={colors.danger}>{photoError}</Label></View> : null}
      <Label muted size={12}>Your photo stays on this device and is included in your JSON backups. Tap Save preferences to keep your changes.</Label>
    </Card>
    <Field label="Your first name" placeholder="What should we call you?" maxLength={80} value={draft.name} onChangeText={name => setDraft(previous => ({ ...previous, name }))} />
    <Card><Label bold>Appearance</Label><Chips items={['system', 'light', 'dark'] as const} value={draft.theme} onChange={theme => setDraft(previous => ({ ...previous, theme }))} /><Label muted size={12}>System follows your device’s appearance.</Label></Card>
    <Card><Label bold>Default currency</Label><Chips items={['PHP', 'USD', 'EUR', 'JPY', 'GBP']} value={draft.currency} onChange={currency => setDraft(previous => ({ ...previous, currency }))} /><Label muted size={12}>Used for new financial records and summaries. This does not convert amounts.</Label></Card>
    <Card><View style={[layout.row, { justifyContent: 'space-between' }]}><Label bold>Device reminders</Label><Switch trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} accessibilityLabel="Enable device reminders" value={draft.notificationsEnabled} onValueChange={notificationsEnabled => setDraft(previous => ({ ...previous, notificationsEnabled }))} /></View><Label muted>{notificationStatus || 'Save to request notification permission on your phone.'}</Label><Label muted size={12}>The next 60 future reminders are scheduled. Open the app to replenish them. Recurrence and yearly dates do not automatically repeat notifications.</Label></Card>
    <Button title="Connect device calendars" variant="secondary" disabled={saving || pickingPhoto} onPress={() => router.push('/calendar-integration')} />
    <Button title="Welcome tour" variant="secondary" icon="sparkles-outline" disabled={saving || pickingPhoto} onPress={() => router.push('/welcome')} />
    <Button title="App updates" variant="secondary" icon="cloud-download-outline" disabled={saving || dirty || pickingPhoto} onPress={() => router.push('/app-updates')} />
    <Button title="Data backup" variant="secondary" icon="save-outline" disabled={saving || dirty || pickingPhoto} onPress={() => router.push('/data-backup')} />
    {dirty && <Label muted size={12}>Save your preferences before opening App updates or Data backup.</Label>}
    <Card><Label bold>Local by design</Label><Label muted>Your records stay on this device. Device-calendar export copies an event to a calendar you choose. There is no MONAPp cloud backup or sync. Uninstalling the app or clearing browser storage can remove local data.</Label><Label muted size={12}>Schema version {SCHEMA_VERSION} · MONAPp {Constants.expoConfig?.version ?? ''}</Label></Card>
    <Button title="Save preferences" busy={saving} disabled={pickingPhoto} onPress={() => { void update({ ...draft, name: draft.name.trim() }).then(ok => { if (ok) router.back(); }); }} />
    <Button title="Cancel" variant="ghost" disabled={saving || pickingPhoto} onPress={() => router.back()} />
  </Screen>;
}
