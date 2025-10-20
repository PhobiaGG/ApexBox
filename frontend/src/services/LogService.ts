import * as FileSystem from 'expo-file-system';
import { parseCSV, calculateStats, TelemetrySample, SessionStats } from '../utils/csv';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionMetadata {
  date: string;
  time: string;
  fileName: string;
  filePath: string;
  stats?: SessionStats;
}

class LogService {
  private logsDir = FileSystem.documentDirectory + 'ApexBox_Logs/';

  async getSessionsByDate(): Promise<Record<string, SessionMetadata[]>> {
    try {
      const cached = await AsyncStorage.getItem('sessions_cache');
      if (cached) {
        console.log('[LogService] Using cached sessions');
        return JSON.parse(cached);
      }

      console.log('[LogService] Scanning logs directory:', this.logsDir);
      
      // Check if directory exists, if not return empty
      const dirInfo = await FileSystem.getInfoAsync(this.logsDir);
      if (!dirInfo.exists) {
        console.log('[LogService] Logs directory does not exist');
        return {};
      }

      const dateFolders = await FileSystem.readDirectoryAsync(this.logsDir);
      console.log('[LogService] Found date folders:', dateFolders);

      const sessionsByDate: Record<string, SessionMetadata[]> = {};

      for (const dateFolder of dateFolders) {
        const datePath = this.logsDir + dateFolder + '/';
        const files = await FileSystem.readDirectoryAsync(datePath);
        
        sessionsByDate[dateFolder] = files
          .filter(f => f.endsWith('.csv'))
          .map(file => ({
            date: dateFolder,
            time: file.replace('.csv', ''),
            fileName: file,
            filePath: datePath + file,
          }));
      }

      await AsyncStorage.setItem('sessions_cache', JSON.stringify(sessionsByDate));
      return sessionsByDate;
    } catch (error) {
      console.error('[LogService] Error reading sessions:', error);
      return {};
    }
  }

  async getSessionData(session: SessionMetadata): Promise<TelemetrySample[]> {
    try {
      console.log('[LogService] Reading session file:', session.filePath);
      const content = await FileSystem.readAsStringAsync(session.filePath);
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
}

export default new LogService();