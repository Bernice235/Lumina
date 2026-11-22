import {
  User,
  Symptom,
  DiaryEntry,
  BirthControlLog,
  TemperatureLog,
  Reminder,
} from '../types';
import {
  sha256Hex,
  secureStorage,
  encryptWithPassphrase,
  decryptWithPassphrase,
} from './secureStorage';

export interface LuminaBackupData {
  exportedAt: string;
  version: '2.0';
  appName: 'Lumina: Bloom & Balance';
  profile: {
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    theme: User['theme'];
    tempUnit: 'C' | 'F';
    isPregnancyMode: boolean;
    isPostpartumMode?: boolean;
    onboardingCompleted?: boolean;
    waterGoal: number;
  };
  cyclePredictions: {
    cycleLength: number;
    periodLength: number;
    automaticCyclePrediction?: boolean;
    manualCycleLength?: number;
    manualPeriodLength?: number;
    lastPeriodStart: string;
    periodDates: string[];
  };
  periods: User['periods'];
  periodLogs: User['periodLogs'];
  moodLogs: User['moodLogs'];
  sexualActivityLogs: User['sexualActivityLogs'];
  sharingSettings: User['sharingSettings'];
  birthControlConfig: User['birthControlConfig'];
  notificationSettings: User['notificationSettings'];
  privacyPreferences?: User['privacyPreferences'];
  symptoms: Symptom[];
  diaryEntries: DiaryEntry[];
  bcLogs: BirthControlLog[];
  tempLogs: TemperatureLog[];
  reminders?: Reminder[];
}

export interface AutoBackupSnapshot {
  id: string;
  createdAt: string;
  checksum: string;
  recordCount: number;
  sizeBytes: number;
  payload: LuminaBackupData;
}

const AUTO_BACKUP_STORAGE_KEY = (userId: string) => `auto_backups_v2_${userId}`;

export function buildBackupDataPayload(
  user: User,
  extras?: {
    symptoms?: Symptom[];
    diaryEntries?: DiaryEntry[];
    bcLogs?: BirthControlLog[];
    tempLogs?: TemperatureLog[];
    reminders?: Reminder[];
  }
): LuminaBackupData {
  return {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    appName: 'Lumina: Bloom & Balance',
    profile: {
      name: user.name,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      theme: user.theme,
      tempUnit: user.tempUnit || 'C',
      isPregnancyMode: user.isPregnancyMode,
      isPostpartumMode: user.isPostpartumMode,
      onboardingCompleted: user.onboardingCompleted,
      waterGoal: user.waterGoal || 8,
    },
    cyclePredictions: {
      cycleLength: user.cycleLength ?? 28,
      periodLength: user.periodLength ?? 5,
      automaticCyclePrediction: user.automaticCyclePrediction,
      manualCycleLength: user.manualCycleLength,
      manualPeriodLength: user.manualPeriodLength,
      lastPeriodStart: user.lastPeriodStart,
      periodDates: user.periodDates || [],
    },
    periods: user.periods || [],
    periodLogs: user.periodLogs || [],
    moodLogs: user.moodLogs || [],
    sexualActivityLogs: user.sexualActivityLogs || [],
    sharingSettings: user.sharingSettings,
    birthControlConfig: user.birthControlConfig,
    notificationSettings: user.notificationSettings,
    privacyPreferences: user.privacyPreferences,
    symptoms: extras?.symptoms ?? user.symptoms ?? [],
    diaryEntries: extras?.diaryEntries ?? user.diaryEntries ?? [],
    bcLogs: extras?.bcLogs ?? user.bcLogs ?? [],
    tempLogs: extras?.tempLogs ?? user.tempLogs ?? [],
    reminders: extras?.reminders ?? [],
  };
}

function countRecords(data: LuminaBackupData): number {
  return (
    (data.periods?.length || 0) +
    (data.periodLogs?.length || 0) +
    (data.moodLogs?.length || 0) +
    (data.symptoms?.length || 0) +
    (data.diaryEntries?.length || 0) +
    (data.bcLogs?.length || 0) +
    (data.tempLogs?.length || 0) +
    (data.sexualActivityLogs?.length || 0)
  );
}

/**
 * Creates a verified encrypted automatic snapshot stored locally via AES-GCM 256-bit encryption.
 */
export async function saveAutomaticEncryptedSnapshot(
  user: User,
  extras?: {
    symptoms?: Symptom[];
    diaryEntries?: DiaryEntry[];
    bcLogs?: BirthControlLog[];
    tempLogs?: TemperatureLog[];
    reminders?: Reminder[];
  }
): Promise<AutoBackupSnapshot | null> {
  if (!user?.id) return null;
  if (user.backupMetadata?.autoBackupEnabled === false) return null;

  try {
    const payload = buildBackupDataPayload(user, extras);
    const canonical = JSON.stringify(payload);
    const checksum = await sha256Hex(canonical);
    const existing = await listAutomaticSnapshots(user.id);

    // Avoid storing duplicate identical consecutive snapshots
    if (existing.length > 0 && existing[0].checksum === checksum) {
      return existing[0];
    }

    const snapshot: AutoBackupSnapshot = {
      id: `snap_${Date.now()}`,
      createdAt: payload.exportedAt,
      checksum,
      recordCount: countRecords(payload),
      sizeBytes: new Blob([canonical]).size,
      payload,
    };

    const nextSnapshots = [snapshot, ...existing].slice(0, 5);
    await secureStorage.setItem(AUTO_BACKUP_STORAGE_KEY(user.id), JSON.stringify(nextSnapshots));
    return snapshot;
  } catch (err) {
    console.warn('[Backup] Failed to save automatic encrypted snapshot:', err);
    return null;
  }
}

export async function listAutomaticSnapshots(userId: string): Promise<AutoBackupSnapshot[]> {
  if (!userId) return [];
  try {
    const raw = await secureStorage.getItem(AUTO_BACKUP_STORAGE_KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Exports a checksum-verified portable backup (or AES-GCM encrypted bundle if passphrase is provided).
 */
export async function buildPortableBackupExport(
  user: User,
  extras?: {
    symptoms?: Symptom[];
    diaryEntries?: DiaryEntry[];
    bcLogs?: BirthControlLog[];
    tempLogs?: TemperatureLog[];
    reminders?: Reminder[];
  },
  passphrase?: string
): Promise<{ filename: string; content: string; checksum: string; encrypted: boolean }> {
  const payload = buildBackupDataPayload(user, extras);
  const canonical = JSON.stringify(payload);
  const checksum = await sha256Hex(canonical);
  const datePart = new Date().toISOString().split('T')[0];

  if (passphrase && passphrase.trim().length > 0) {
    const enc = await encryptWithPassphrase(canonical, passphrase.trim());
    const bundle = {
      format: 'lumina-encrypted-v2',
      exportedAt: payload.exportedAt,
      checksum,
      encryption: {
        cipher: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: 120000,
      },
      ...enc,
    };
    return {
      filename: `lumina_encrypted_backup_${datePart}.json`,
      content: JSON.stringify(bundle, null, 2),
      checksum,
      encrypted: true,
    };
  }

  const verifiedBundle = {
    format: 'lumina-portable-v2',
    integrityChecksum: checksum,
    ...payload,
  };
  return {
    filename: `lumina_wellness_backup_${datePart}.json`,
    content: JSON.stringify(verifiedBundle, null, 2),
    checksum,
    encrypted: false,
  };
}

export async function verifyAndParseBackupFile(
  rawText: string,
  passphrase?: string
): Promise<{
  data: any;
  isEncrypted: boolean;
  checksumVerified: boolean;
  recordCount: number;
  exportedAt?: string;
}> {
  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file structure.');
  }

  // Encrypted v2 format
  if (parsed.format === 'lumina-encrypted-v2') {
    if (!passphrase || !passphrase.trim()) {
      throw new Error('PASSPHRASE_REQUIRED');
    }
    let decryptedJson: string;
    try {
      decryptedJson = await decryptWithPassphrase(
        { salt: parsed.salt, iv: parsed.iv, ciphertext: parsed.ciphertext },
        passphrase.trim()
      );
    } catch {
      throw new Error('Incorrect backup passphrase or corrupted encrypted file.');
    }
    const recomputed = await sha256Hex(decryptedJson);
    if (parsed.checksum && recomputed !== parsed.checksum) {
      throw new Error('Backup integrity check failed: file contents appear corrupted or modified.');
    }
    const inner = JSON.parse(decryptedJson) as LuminaBackupData;
    return {
      data: inner,
      isEncrypted: true,
      checksumVerified: true,
      recordCount: countRecords(inner),
      exportedAt: inner.exportedAt,
    };
  }

  // Signed portable v2 format
  if (parsed.format === 'lumina-portable-v2' && parsed.integrityChecksum) {
    const { format: _f, integrityChecksum, ...rest } = parsed;
    const recomputed = await sha256Hex(JSON.stringify(rest));
    if (recomputed !== integrityChecksum) {
      throw new Error('Backup checksum mismatch: file may be incomplete or altered.');
    }
    return {
      data: rest,
      isEncrypted: false,
      checksumVerified: true,
      recordCount: countRecords(rest as LuminaBackupData),
      exportedAt: rest.exportedAt,
    };
  }

  // Legacy v1 Lumina backup format compatibility
  if (!parsed.profile && !parsed.id) {
    throw new Error('Unrecognized file format. Please choose a valid Lumina backup JSON.');
  }
  const count =
    (parsed.periods?.length || 0) +
    (parsed.periodLogs?.length || 0) +
    (parsed.moodLogs?.length || 0) +
    (parsed.symptoms?.length || 0) +
    (parsed.diaryEntries?.length || 0);

  return {
    data: parsed,
    isEncrypted: false,
    checksumVerified: false,
    recordCount: count,
    exportedAt: parsed.exportedAt,
  };
}

export function applyBackupToUser(currentUser: User, parsed: any): User {
  return {
    ...currentUser,
    name: parsed.profile?.name ?? parsed.name ?? currentUser.name,
    email: parsed.profile?.email ?? parsed.email ?? currentUser.email,
    firstName: parsed.profile?.firstName ?? currentUser.firstName,
    lastName: parsed.profile?.lastName ?? currentUser.lastName,
    displayName: parsed.profile?.displayName ?? currentUser.displayName,
    theme: parsed.profile?.theme ?? parsed.theme ?? currentUser.theme,
    tempUnit: parsed.profile?.tempUnit ?? parsed.tempUnit ?? currentUser.tempUnit ?? 'C',
    isPregnancyMode: parsed.profile?.isPregnancyMode ?? parsed.isPregnancyMode ?? currentUser.isPregnancyMode ?? false,
    isPostpartumMode: parsed.profile?.isPostpartumMode ?? currentUser.isPostpartumMode,
    onboardingCompleted: parsed.profile?.onboardingCompleted ?? parsed.onboardingCompleted ?? currentUser.onboardingCompleted ?? true,
    waterGoal: parsed.profile?.waterGoal ?? parsed.waterGoal ?? currentUser.waterGoal ?? 8,
    cycleLength: parsed.cyclePredictions?.cycleLength ?? parsed.cycleLength ?? currentUser.cycleLength ?? 28,
    periodLength: parsed.cyclePredictions?.periodLength ?? parsed.periodLength ?? currentUser.periodLength ?? 5,
    automaticCyclePrediction: parsed.cyclePredictions?.automaticCyclePrediction ?? currentUser.automaticCyclePrediction,
    manualCycleLength: parsed.cyclePredictions?.manualCycleLength ?? currentUser.manualCycleLength,
    manualPeriodLength: parsed.cyclePredictions?.manualPeriodLength ?? currentUser.manualPeriodLength,
    lastPeriodStart: parsed.cyclePredictions?.lastPeriodStart ?? parsed.lastPeriodStart ?? currentUser.lastPeriodStart,
    periods: parsed.periods ?? currentUser.periods ?? [],
    periodDates: parsed.cyclePredictions?.periodDates ?? parsed.periodDates ?? currentUser.periodDates ?? [],
    periodLogs: parsed.periodLogs ?? currentUser.periodLogs ?? [],
    moodLogs: parsed.moodLogs ?? currentUser.moodLogs ?? [],
    sexualActivityLogs: parsed.sexualActivityLogs ?? currentUser.sexualActivityLogs ?? [],
    sharingSettings: parsed.sharingSettings ?? currentUser.sharingSettings,
    birthControlConfig: parsed.birthControlConfig ?? currentUser.birthControlConfig,
    notificationSettings: parsed.notificationSettings ?? currentUser.notificationSettings,
    privacyPreferences: parsed.privacyPreferences ?? currentUser.privacyPreferences,
    symptoms: parsed.symptoms ?? currentUser.symptoms ?? [],
    diaryEntries: parsed.diaryEntries ?? currentUser.diaryEntries ?? [],
    bcLogs: parsed.bcLogs ?? currentUser.bcLogs ?? [],
    tempLogs: parsed.tempLogs ?? currentUser.tempLogs ?? [],
  };
}
