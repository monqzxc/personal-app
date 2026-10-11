import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { AppHeader, Button, Card, Label, Screen } from '../../components/common/ui';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { useAppStore } from '../../stores/useAppStore';
import { fitnessRepository } from '../../services/container';
import { useTheme } from '../../theme/useTheme';
import { restartAppUpdate, updateCheckMessage, updateDownloadMessage } from './appUpdates';

export default function AppUpdatesScreen() {
  const { colors, radius } = useTheme();
  const updates = Updates.useUpdates();
  const saving = useAppStore(state => state.saving);
  const hasWorkout = useAppStore(state => state.data.activities.some(item => !item.deletedAt && item.status !== 'completed'));
  const [working, setWorking] = useState<'check' | 'download' | 'restart' | null>(null);
  const [notice, setNotice] = useState('Check for improvements when you are ready.');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const inFlight = useRef(false);
  const enabled = Platform.OS !== 'web' && !__DEV__ && Updates.isEnabled;
  const busy = Boolean(working || updates.isChecking || updates.isDownloading || updates.isRestarting || updates.isStartupProcedureRunning);
  const available = updates.isUpdateAvailable || updates.availableUpdate?.type === 'rollback';
  const pending = updates.isUpdatePending;
  const errorText = error || updates.downloadError?.message || updates.checkError?.message;
  const progress = updates.downloadProgress;
  const percent = typeof progress === 'number' && Number.isFinite(progress) ? Math.round(Math.max(0, Math.min(1, progress)) * 100) : null;

  async function run(action: 'check' | 'download') {
    if (!enabled || busy || inFlight.current) return;
    inFlight.current = true; setWorking(action); setError('');
    try {
      setNotice(action === 'check' ? updateCheckMessage(await Updates.checkForUpdateAsync()) : updateDownloadMessage(await Updates.fetchUpdateAsync()));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The update could not be completed. Try again.'); }
    finally { inFlight.current = false; setWorking(null); }
  }

  function restart() {
    if (busy || inFlight.current) return;
    inFlight.current = true; setWorking('restart'); setError(''); setConfirm(false);
    void restartAppUpdate({ enabled, pending,
      isSaving: () => useAppStore.getState().saving || useAppStore.getState().loading,
      activeWorkout: () => fitnessRepository.active(),
      reload: () => Updates.reloadAsync(),
    }).catch(reason => {
      setError(reason instanceof Error ? reason.message : 'Could not restart. Try again.');
      inFlight.current = false; setWorking(null);
    });
  }

  return <Screen><AppHeader title="A little better, each update." eyebrow="App updates" />
    <Card><Label bold>MONAPp {Constants.expoConfig?.version ?? ''}</Label><Label muted>Keep your core features available offline. Compatible improvements can download without replacing the whole app.</Label>
      {updates.currentlyRunning.createdAt && <Label muted size={12}>Current release: {updates.currentlyRunning.createdAt.toLocaleString()}</Label>}
      {updates.currentlyRunning.isEmergencyLaunch && <Label color={colors.warning}>The app opened its bundled recovery version after an update problem. Your saved records have not been reset.</Label>}
    </Card>
    {!enabled ? <Card><Label bold>Use an installed build</Label><Label muted>{Platform.OS === 'web' ? 'The browser preview does not install mobile updates. Refresh the page for web changes.' : 'Update downloads work in a preview or release installation, not Expo Go or a development session. Install the latest MONAPp build to use these controls.'}</Label></Card> :
      <Card><View accessibilityLiveRegion="polite"><Label bold>{updates.isRestarting || working === 'restart' ? 'Restarting…' : updates.isDownloading || working === 'download' ? 'Downloading update…' : updates.isChecking || working === 'check' ? 'Checking for updates…' : pending ? 'Ready to restart' : available ? 'Update available' : 'App updates'}</Label></View>
        <Label>{pending ? 'The downloaded update will apply on restart or the next full app launch. Save your work before restarting.' : notice}</Label>
        {updates.lastCheckForUpdateTimeSinceRestart && <Label muted size={12}>Last checked: {updates.lastCheckForUpdateTimeSinceRestart.toLocaleString()}</Label>}
        {(updates.isDownloading || working === 'download') && <><Label muted>{percent === null ? 'Downloading…' : `${percent}% downloaded`}</Label>{percent !== null && <View accessibilityRole="progressbar" accessibilityLabel="Update download" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}><View style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.primary }} /></View>}</>}
        <Button title="Check for updates" variant="secondary" busy={working === 'check'} disabled={busy || pending} onPress={() => { void run('check'); }} />
        {available && !pending && <Button title={updates.availableUpdate?.type === 'rollback' ? 'Prepare recovery update' : 'Download update'} busy={working === 'download'} disabled={busy} onPress={() => { void run('download'); }} />}
        {pending && <Button title="Restart to apply" busy={working === 'restart'} disabled={busy || saving || hasWorkout} onPress={() => setConfirm(true)} />}
        {pending && hasWorkout && <Label muted>Finish and save your active workout before restarting.</Label>}
        {pending && saving && <Label muted>Wait for your records to finish saving.</Label>}
        <Label muted size={12}>{Updates.checkAutomatically === Updates.UpdatesCheckAutomaticallyValue.NEVER ? 'Downloads start only when you choose Download. You can keep using the current version while offline.' : 'This installation also checks for updates automatically at launch. Install the latest APK for manual-only downloads.'}</Label>
      </Card>}
    {errorText && <Card><View accessibilityRole="alert"><Label bold color={colors.danger}>Update not completed</Label><Label>{errorText}</Label></View><Label muted>Check your connection and available phone storage, then retry. Your current app remains available; no records are deleted by this screen.</Label></Card>}
    <Card><Label bold>When a new installation is needed</Label><Label muted>Changes to the app icon, system permissions, or native device features need a new APK or iPhone build. This screen checks compatible updates only; it cannot tell you whether a newer installer exists.</Label><Label muted size={12}>Existing assets are reused where possible. Download size varies; an update may include a full code bundle. The core features stay installed together.</Label></Card>
    <ConfirmationModal visible={confirm} title="Restart MONAPp?" message="Save any unfinished work first. Saved records stay on this device. The app will close and reopen with the downloaded update." busy={busy} confirmTitle="Restart now" cancelTitle="Later" confirmVariant="primary" onCancel={() => setConfirm(false)} onConfirm={restart} />
  </Screen>;
}
