import { Capacitor } from '@capacitor/core';
import { User } from '../types';
import { syncUser } from './firebaseService';

export interface HealthSyncStatus {
  connectedSource: 'apple_health' | 'google_fit' | 'manual' | null;
  lastSyncTimestamp: string | null;
  sleepHours: number;
  exerciseMinutes: number;
  isSyncing: boolean;
}

/**
 * Service for Apple HealthKit / Google Health Connect readiness and honest manual wellness tracking.
 * Never returns fabricated sensor readings or simulated device approvals.
 */
export const HealthService = {
  /**
   * Returns true only when running inside a native iOS/Android shell with a live Health bridge registered.
   */
  async checkPermission(source: 'apple_health' | 'google_fit'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    const platform = Capacitor.getPlatform();
    if (source === 'apple_health' && platform !== 'ios') return false;
    if (source === 'google_fit' && platform !== 'android') return false;
    return false;
  },

  /**
   * Checks native health bridge availability without simulating OAuth or HealthKit authorization.
   */
  async requestConnection(source: 'apple_health' | 'google_fit'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    return this.checkPermission(source);
  },

  /**
   * Rejects simulated metric imports when no native HealthKit/Health Connect plugin is active.
   */
  async importHealthMetrics(source: 'apple_health' | 'google_fit'): Promise<{ sleepHours: number; exerciseMinutes: number }> {
    const granted = await this.checkPermission(source);
    if (!granted) {
      throw new Error(
        source === 'apple_health'
          ? 'Apple HealthKit requires a native iOS build with HealthKit permission enabled. Please log sleep and activity manually.'
          : 'Health Connect requires a native Android build with Health Connect permissions enabled. Please log sleep and activity manually.'
      );
    }
    throw new Error('No native health connector plugin is configured in this build.');
  },

  /**
   * Saves user-entered sleep and exercise metrics directly to the user profile without fabricated values.
   */
  async saveManualHealthMetrics(
    user: User,
    metrics: { sleepHours: number; exerciseMinutes: number },
    setUser: (u: User) => void
  ): Promise<{ sleepHours: number; exerciseMinutes: number }> {
    const cleanSleep = Math.max(0, Math.min(24, Number(metrics.sleepHours) || 0));
    const cleanExercise = Math.max(0, Math.min(600, Math.round(Number(metrics.exerciseMinutes) || 0)));

    const filteredPrefs = (user.wellnessPreferences || []).filter(
      (p) => !p.startsWith('health_source:') && !p.startsWith('last_sync:') && !p.startsWith('synced_sleep:') && !p.startsWith('synced_exercise:')
    );

    const updatedUser: User = {
      ...user,
      wellnessPreferences: [
        ...filteredPrefs,
        'health_source:manual',
        `last_sync:${new Date().toISOString()}`,
        `synced_sleep:${cleanSleep}`,
        `synced_exercise:${cleanExercise}`,
      ],
    };

    setUser(updatedUser);
    await syncUser(updatedUser);
    return { sleepHours: cleanSleep, exerciseMinutes: cleanExercise };
  },
};
