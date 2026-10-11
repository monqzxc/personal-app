import { DATABASE_KEY, type KeyValueStorage } from '../../storage/localDatabase.ts';

export const ONBOARDING_KEY = 'monapp.onboarding';

export class OnboardingService {
  private storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) { this.storage = storage; }

  async required(): Promise<boolean> {
    const marker = await this.storage.getItem(ONBOARDING_KEY);
    if (marker === 'pending') return true;
    if (marker === 'complete') return false;
    if (marker !== null) throw new Error('The intro preference could not be read. Your saved data has been preserved.');

    const existingDatabase = await this.storage.getItem(DATABASE_KEY);
    const required = existingDatabase === null;
    // Persist pending before startup can create a database, so an interrupted intro reopens.
    await this.storage.setItem(ONBOARDING_KEY, required ? 'pending' : 'complete');
    return required;
  }

  async complete(): Promise<void> {
    await this.storage.setItem(ONBOARDING_KEY, 'complete');
  }
}
