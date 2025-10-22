import * as FileSystem from 'expo-file-system';
import { parseCSV, calculateStats, TelemetrySample, SessionStats } from '../utils/csv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';

export interface SessionMetadata {
  date: string;
  time: string;
  fileName: string;
  filePath: string;
  stats?: SessionStats;
}

// No mock data - all sessions from user's real data

// No mock CSV data - all data from AsyncStorage or Firebase

class LogService {
  private logsDir = FileSystem.documentDirectory + 'ApexBox_Logs/';

  async getSessionsByDate(): Promise<Record<string, SessionMetadata[]>> {
    try {
      console.log('[LogService] Getting sessions from AsyncStorage...');
      
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => key.startsWith('session_'));
      
      console.log('[LogService] Found', sessionKeys.length, 'sessions');
      
      if (sessionKeys.length === 0) {
        console.log('[LogService] No sessions found');
        return {};
      }
      
      // Group sessions by date
      const sessionsByDate: Record<string, SessionMetadata[]> = {};
      
      for (const key of sessionKeys) {
        // key format: "session_DATE/TIME.csv"
        const sessionPath = key.replace('session_', '');
        const [date, fileName] = sessionPath.split('/');
        const time = fileName.replace('.csv', '');
        
        if (!sessionsByDate[date]) {
          sessionsByDate[date] = [];
        }
        
        sessionsByDate[date].push({
          date,
          time,
          fileName,
          filePath: sessionPath,
        });
      }
      
      // Sort sessions by time within each date
      for (const date in sessionsByDate) {
        sessionsByDate[date].sort((a, b) => a.time.localeCompare(b.time));
      }
      
      console.log('[LogService] Organized sessions by date:', Object.keys(sessionsByDate));
      return sessionsByDate;
    } catch (error) {
      console.error('[LogService] Error reading sessions:', error);
      return {};
    }
  }

  async getSessionData(session: SessionMetadata): Promise<TelemetrySample[]> {
    try {
      console.log('[LogService] Reading session:', session.date, session.fileName);
      
      // Get CSV data from AsyncStorage
      const sessionKey = `session_${session.filePath}`;
      const content = await AsyncStorage.getItem(sessionKey);
      
      if (!content) {
        console.log('[LogService] No data found for:', sessionKey);
        return [];
      }
      
      console.log('[LogService] Found CSV data, parsing...');
      return parseCSV(content);
    } catch (error) {
      console.error('[LogService] Error reading session data:', error);
      return [];
    }
  }

  async getSessionStats(session: SessionMetadata): Promise<SessionStats | null> {
    try {
      const samples = await this.getSessionData(session);
      return calculateStats(samples);
    } catch (error) {
      console.error('[LogService] Error calculating stats:', error);
      return null;
    }
  }

  async getLatestSession(): Promise<{ session: SessionMetadata; samples: TelemetrySample[] } | null> {
    try {
      const sessionsByDate = await this.getSessionsByDate();
      const dates = Object.keys(sessionsByDate).sort().reverse();
      
      if (dates.length === 0) return null;

      const latestDate = dates[0];
      const sessions = sessionsByDate[latestDate];
      
      if (sessions.length === 0) return null;

      const latestSession = sessions[sessions.length - 1];
      const samples = await this.getSessionData(latestSession);

      return { session: latestSession, samples };
    } catch (error) {
      console.error('[LogService] Error getting latest session:', error);
      return null;
    }
  }

  async rescan(): Promise<void> {
    console.log('[LogService] Rescanning logs...');
    await AsyncStorage.removeItem('sessions_cache');
    await this.getSessionsByDate();
  }

  async clearCache(): Promise<void> {
    console.log('[LogService] Clearing cache...');
    await AsyncStorage.removeItem('sessions_cache');
  }

  /**
   * Save a new session with telemetry and GPS data
   */
  async saveSession(
    telemetryData: TelemetrySample[],
    gpsCoordinates: any[],
    duration: number
  ): Promise<string> {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '');
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s/g, '').replace(':', '.');
      
      const fileName = `${timeStr}.csv`;
      const sessionKey = `${dateStr}/${fileName}`;
      
      console.log('[LogService] Saving session:', sessionKey);
      
      // Create CSV content
      const headers = 'timestamp_ms,speed,g_force,temp,humidity,lux,altitude';
      const rows = telemetryData.map(sample => 
        `${sample.timestamp_ms},${sample.speed},${sample.g_force},${sample.temperature},${sample.humidity || 0},${sample.lux || 0},${sample.altitude}`
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      
      // Save to AsyncStorage (for demo - in production would save to Firebase)
      await AsyncStorage.setItem(`session_${sessionKey}`, csvContent);
      
      // Save GPS data separately
      if (gpsCoordinates.length > 0) {
        await AsyncStorage.setItem(`gps_${sessionKey}`, JSON.stringify(gpsCoordinates));
        console.log('[LogService] Saved GPS data:', gpsCoordinates.length, 'points');
      }
      
      // Save metadata
      const metadata: SessionMetadata = {
        date: dateStr,
        time: timeStr,
        fileName,
        filePath: sessionKey,
        stats: calculateStats(telemetryData),
      };
      
      // Update cache
      await this.clearCache();
      
      console.log('[LogService] Session saved successfully:', sessionKey);
      return sessionKey;
    } catch (error) {
      console.error('[LogService] Error saving session:', error);
      throw error;
    }
  }

  /**
   * Get GPS data for a session
   */
  async getSessionGPS(session: SessionMetadata): Promise<any[]> {
    try {
      console.log('[LogService] Reading GPS data for:', session.date, session.fileName);
      
      // Get GPS data from AsyncStorage
      const gpsKey = `gps_${session.filePath}`;
      const gpsData = await AsyncStorage.getItem(gpsKey);
      
      if (!gpsData) {
        console.log('[LogService] No GPS data found for:', gpsKey);
        return [];
      }
      
      console.log('[LogService] Found GPS data, parsing...');
      return JSON.parse(gpsData);
    } catch (error) {
      console.error('[LogService] Error reading GPS data:', error);
      return [];
    }
  }
}

export default new LogService();