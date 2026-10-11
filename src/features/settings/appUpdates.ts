import type { UpdateCheckResult, UpdateFetchResult } from 'expo-updates';

export function updateCheckMessage(result: Pick<UpdateCheckResult, 'isAvailable' | 'isRollBackToEmbedded' | 'reason'>) {
  if (result.isRollBackToEmbedded) return 'A recovery update is available. It restores the version bundled with this installation.';
  if (result.isAvailable) return 'An update is available. Download it when you are ready.';
  if (result.reason === 'updatePreviouslyFailed') return 'An update was found, but it previously failed on this device. Your current version is still in use.';
  if (result.reason === 'noUpdateAvailableOnServer') return 'No compatible update is available for this installation.';
  return 'No installable update was selected. You can keep using this version. A newer app installation may be needed.';
}

export function updateDownloadMessage(result: Pick<UpdateFetchResult, 'isNew' | 'isRollBackToEmbedded'>) {
  if (result.isRollBackToEmbedded) return 'The recovery update is ready. Restart to apply it.';
  return result.isNew ? 'Update downloaded. Restart when you are ready.' : 'No new update was downloaded. Check again for the latest available update.';
}

export async function restartAppUpdate({ enabled, pending, isSaving, activeWorkout, reload }: {
  enabled: boolean; pending: boolean; isSaving: () => boolean;
  activeWorkout: () => Promise<unknown>; reload: () => Promise<void>;
}) {
  if (!enabled) throw new Error('Updates require an installed preview or release build.');
  if (!pending) throw new Error('Download an update before restarting.');
  if (isSaving()) throw new Error('Wait for your records to finish saving, then restart.');
  if (await activeWorkout()) throw new Error('Finish and save your active workout before restarting.');
  if (isSaving()) throw new Error('Wait for your records to finish saving, then restart.');
  return reload();
}
