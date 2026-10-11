import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Card, Label, Screen, layout } from '../../components/common/ui';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { backupService } from '../../services/container';
import { backupCounts, type BackupPreview } from '../../services/backupService';
import { pickBackupFile, saveBackupFile } from '../../services/backupFiles';
import { useAppStore } from '../../stores/useAppStore';
import { useTheme } from '../../theme/useTheme';

export default function DataBackupScreen() {
  const { colors } = useTheme();
  const { restored } = useLocalSearchParams<{ restored?: string }>();
  const saving = useAppStore(state => state.saving);
  const loading = useAppStore(state => state.loading);
  const hasWorkout = useAppStore(state => state.data.activities.some(item => !item.deletedAt && item.status !== 'completed'));
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [source, setSource] = useState('');
  const [notice, setNotice] = useState(restored === '1' ? 'Backup restored. Your previous data is available below. Device reminders are off; enable them in Settings when ready.' : '');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const inFlight = useRef(false);
  const busy = working || saving || loading;
  const counts = preview ? backupCounts(preview.backup.data) : [];
  const currentCounts = preview ? backupCounts(preview.current) : [];
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const currentTotal = currentCounts.reduce((sum, item) => sum + item.count, 0);

  async function run(action: 'export' | 'import' | 'previous' | 'restore') {
    if (inFlight.current || useAppStore.getState().saving || useAppStore.getState().loading) return;
    inFlight.current = true; setWorking(true); setError(''); setNotice('');
    try {
      if (action === 'export') setNotice(await saveBackupFile(await backupService.exportJson()));
      else if (action === 'import') {
        setPreview(null);
        const file = await pickBackupFile();
        if (file) { setSource(file.name); setPreview(await backupService.preview(file.json)); }
      } else if (action === 'previous') {
        setPreview(null); setSource('Data from before the last import');
        setPreview(await backupService.previous());
      } else if (preview) {
        setConfirm(false);
        if (await useAppStore.getState().restoreBackup(preview)) {
          // Discard screens holding drafts from the replaced database.
          router.dismissAll();
          router.replace({ pathname: '/data-backup', params: { restored: '1' } });
          setPreview(null);
          setNotice('Backup restored. Your previous data is available below. Device reminders are off; enable them in Settings when ready.');
        }
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The backup could not be completed. Try again.'); }
    finally { inFlight.current = false; setWorking(false); }
  }

  return <Screen><AppHeader title="Your data, to keep." eyebrow="Data backup" />
    <Card><Label bold>Export JSON</Label><Label muted>Save all your records and preferences in one readable file: tasks, money, people, travel, notes, and completed fitness routes.</Label>
      <Label muted size={12}>The file is not encrypted and can include financial details, notes, and GPS locations. Share it only with a destination you trust.</Label>
      <Button title="Export JSON" icon="download-outline" disabled={busy || hasWorkout} onPress={() => { void run('export'); }} />
    </Card>
    <Card><Label bold>Import JSON</Label><Label muted>Choose a MONAPp backup from your files, then review it before restoring. Import replaces all records and preferences on this device. It does not combine two backups.</Label>
      <Label muted size={12}>JSON files up to 10 MB, with up to 1.5 MB of saved records for restore. Nothing is sent to a MONAPp server.</Label>
      <Button title="Choose JSON file" variant="secondary" icon="document-attach-outline" disabled={busy || hasWorkout} onPress={() => { void run('import'); }} />
    </Card>
    {hasWorkout && <Label color={colors.warning}>Finish and save your active workout before exporting or importing.</Label>}
    {working && <Label muted>Working with your backup…</Label>}
    {notice && <View accessibilityLiveRegion="polite"><Card><Label>{notice}</Label></Card></View>}
    {error && <View accessibilityRole="alert"><Card><Label color={colors.danger}>{error}</Label></Card></View>}
    {preview && <Card><Label bold>Review before replacing</Label><Label>{source}</Label><Label muted size={12}>Export prepared: {new Date(preview.backup.exportedAt).toLocaleString()}</Label>
      <Label bold>{currentTotal} current records → {total} backup records</Label>
      {counts.filter(item => item.count || currentCounts.find(current => current.key === item.key)?.count).map(item => <View key={item.key} style={[layout.row, { justifyContent: 'space-between' }]}><Label>{item.title}</Label><Label>{currentCounts.find(current => current.key === item.key)?.count ?? 0} → {item.count}</Label></View>)}
      {!total && <Label color={colors.warning}>This backup is empty. Restoring it will clear your current records.</Label>}
      <Label muted>Preferences are included. Deleted records remain deleted. Device reminders will be turned off until you enable them in Settings.</Label>
      <Button title="Restore this backup" variant="danger" disabled={busy || hasWorkout} onPress={() => setConfirm(true)} />
      <Button title="Cancel preview" variant="ghost" disabled={busy} onPress={() => setPreview(null)} />
    </Card>}
    <Card><Label bold>Need to undo an import?</Label><Label muted>Before each import, MONAPp keeps one copy of the current data on this device. Preview that copy here to restore it. A later import replaces this recovery copy; uninstalling or clearing app data removes it.</Label>
      <Button title="Preview previous data" variant="secondary" disabled={busy || hasWorkout} onPress={() => { void run('previous'); }} />
    </Card>
    <Button title="Back to dashboard" variant="ghost" disabled={busy} onPress={() => { router.dismissAll(); router.replace('/'); }} />
    <ConfirmationModal visible={confirm} title="Replace all local data?" message={`Restore ${total} records from this backup and replace ${currentTotal} current records and your preferences? A copy of your current data will be kept on this device. Reminders will be turned off.`} busy={busy} confirmTitle="Replace and restore" cancelTitle="Keep current data" onCancel={() => setConfirm(false)} onConfirm={() => { void run('restore'); }} />
  </Screen>;
}
