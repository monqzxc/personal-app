import { checkBackupSize } from './backupService';

// Web uses a real file input so canceling releases the busy state as well.
export function pickBackupFile(): Promise<{ name: string; json: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.style.display = 'none';
    input.addEventListener('cancel', () => { input.remove(); resolve(null); }, { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) { resolve(null); return; }
      try {
        checkBackupSize(file.size);
        void file.text().then(json => resolve({ name: file.name, json }), reject);
      } catch (error) { reject(error); }
    }, { once: true });
    document.body.appendChild(input);
    try { input.click(); } catch (error) { input.remove(); reject(error); }
  });
}

export async function saveBackupFile(json: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `MONAPp-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'Download requested. Check your browser downloads and keep the JSON file somewhere safe.';
}
