import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionFile {
  date: string;
  fileName: string;
}

interface SessionData {
  samples: any[];
  duration: number;
  maxSpeed: number;
  maxGForce: number;
  timestamp: string;
}

// ✅ Helper to sanitize data for JSON
const sanitizeForJSON = (obj: any): any => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      // Replace NaN and Infinity with valid numbers
      if (typeof value === 'number') {
        if (isNaN(value)) return 0;
        if (!isFinite(value)) return 0;
      }
      return value;
    })
  );
};

class LogService {
  private cachedSessions: SessionFile[] | null = null;
  private cachedLatestSession: SessionData | null = null;

  /**
   * Get all sessions from AsyncStorage
   */
  async getSessions(): Promise<SessionFile[]> {
    try {
      if (this.cachedSessions) {
        return this.cachedSessions;
      }

      console.log('[LogService] Getting sessions from AsyncStorage...');
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith('session_'));

      const sessions: SessionFile[] = sessionKeys.map(key => {
        const parts = key.replace('session_', '').split('/');
        return {
          date: parts[0],
          fileName: parts[1],
        };
      });

      // Sort by date descending (newest first)
      sessions.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      this.cachedSessions = sessions;
      console.log('[LogService] Found', sessions.length, 'sessions');

      if (sessions.length === 0) {
        console.log('[LogService] No sessions found');
      }

      return sessions;
    } catch (error) {
      console.error('[LogService] Error getting sessions:', error);
      return [];
    }
  }

  /**
   * Get the latest session data
   */
  async getLatestSession(): Promise<SessionData | null> {
    try {
      if (this.cachedLatestSession) {
        return this.cachedLatestSession;
      }

      const sessions = await this.getSessions();
      if (sessions.length === 0) {
        return null;
      }

      const latestSession = sessions[0];
      const sessionKey = `${latestSession.date}/${latestSession.fileName}`;
      const dataStr = await AsyncStorage.getItem(`session_${sessionKey}`);

      if (!dataStr) {
        return null;
      }

      try {
        const data = JSON.parse(dataStr);
        this.cachedLatestSession = data;
        return data;
      } catch (parseError) {
        console.error('[LogService] Error parsing latest session:', parseError);
        // Delete corrupted data
        await AsyncStorage.removeItem(`session_${sessionKey}`);
        return null;
      }
    } catch (error) {
      console.error('[LogService] Error getting latest session:', error);
      return null;
    }
  }

  /**
   * Save a new session
   */
  async saveSession(
    samples: any[],
    gpsCoordinates: any[],
    duration: number
  ): Promise<string> {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).replace(/\s/g, '');
      
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).replace(/:/g, '.').replace(/\s/g, '');
      
      const fileName = `${timeStr}.csv`;
      const sessionKey = `${dateStr}/${fileName}`;
      
      console.log('[LogService] Saving session:', sessionKey);

      // ✅ Sanitize samples to remove NaN/Infinity
      const cleanSamples = samples.map(s => sanitizeForJSON(s));
      
      // Calculate stats from clean data
      const speeds = cleanSamples.map(s => s.speed || 0).filter(v => isFinite(v));
      const gForces = cleanSamples.map(s => s.g_force || 0).filter(v => isFinite(v));
      
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const maxGForce = gForces.length > 0 ? Math.max(...gForces) : 0;
      
      // ✅ Create clean metadata
      const metadata = sanitizeForJSON({
        samples: cleanSamples,
        duration,
        maxSpeed,
        maxGForce,
        timestamp: now.toISOString(),
      });

      // Save session metadata
      await AsyncStorage.setItem(`session_${sessionKey}`, JSON.stringify(metadata));
      
      // Save GPS coordinates if available
      if (gpsCoordinates && gpsCoordinates.length > 0) {
        const cleanCoordinates = sanitizeForJSON(gpsCoordinates);
        await AsyncStorage.setItem(`gps_${sessionKey}`, JSON.stringify(cleanCoordinates));
        console.log('[LogService] Saved GPS data:', cleanCoordinates.length, 'points');
      }
      
      // Clear cache
      console.log('[LogService] Clearing cache...');
      this.cachedSessions = null;
      this.cachedLatestSession = null;
      
      console.log('[LogService] Session saved successfully:', sessionKey);
      return sessionKey;
    } catch (error) {
      console.error('[LogService] Error saving session:', error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(date: string, fileName: string): Promise<void> {
    try {
      const sessionKey = `${date}/${fileName}`;
      console.log('[LogService] Deleting session:', sessionKey);

      await AsyncStorage.multiRemove([
        `session_${sessionKey}`,
        `gps_${sessionKey}`,
        `telemetry_${sessionKey}`,
      ]);

      // Clear cache
      this.cachedSessions = null;
      this.cachedLatestSession = null;

      console.log('[LogService] Session deleted successfully');
    } catch (error) {
      console.error('[LogService] Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cachedSessions = null;
    this.cachedLatestSession = null;
  }

  /**
   * Clear corrupted sessions
   */
  async clearCorruptedSessions(): Promise<void> {
    try {
      console.log('[LogService] Checking for corrupted sessions...');
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith('session_'));
      
      let removedCount = 0;
      
      for (const key of sessionKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            JSON.parse(data); // Test if it's valid JSON
          }
        } catch {
          // Delete corrupted session
          console.log('[LogService] Removing corrupted session:', key);
          await AsyncStorage.removeItem(key);
          await AsyncStorage.removeItem(key.replace('session_', 'gps_'));
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        console.log(`[LogService] Removed ${removedCount} corrupted session(s)`);
        this.clearCache();
      } else {
        console.log('[LogService] No corrupted sessions found');
      }
    } catch (error) {
      console.error('[LogService] Error clearing corrupted sessions:', error);
    }
  }
}

export default new LogService();