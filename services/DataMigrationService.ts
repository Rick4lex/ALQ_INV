import { LOCAL_STORAGE_KEYS } from '../constants';

export class DataMigrationService {
  /**
   * Checks if there is legacy data in localStorage that needs migration.
   */
  static hasLegacyData(): boolean {
    // A simple check: if the old products key exists, we assume legacy data is present.
    return localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS) !== null;
  }

  /**
   * Creates an emergency backup of legacy localStorage data.
   * This is a safeguard before attempting migration or deletion.
   */
  static createEmergencyBackup(): void {
    if (!this.hasLegacyData()) return;

    const backupData: Record<string, any> = {};
    for (const key in LOCAL_STORAGE_KEYS) {
      const storageKey = LOCAL_STORAGE_KEYS[key as keyof typeof LOCAL_STORAGE_KEYS];
      const data = localStorage.getItem(storageKey);
      if (data) {
        try {
          backupData[storageKey] = JSON.parse(data);
        } catch (e) {
          backupData[storageKey] = data; // store as raw string if not json
        }
      }
    }
    
    localStorage.setItem('alkima-mizu-emergency-backup', JSON.stringify(backupData));
    console.log("Emergency backup of legacy data created.");
  }
  
  /**
   * Clears all legacy data keys from localStorage.
   * Should be called after successful migration.
   */
  static clearLegacyData(): void {
    console.log("Clearing legacy localStorage data...");
    for (const key in LOCAL_STORAGE_KEYS) {
        const storageKey = LOCAL_STORAGE_KEYS[key as keyof typeof LOCAL_STORAGE_KEYS];
        localStorage.removeItem(storageKey);
    }
  }
}
