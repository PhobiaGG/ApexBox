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

// Mock data for when files aren't available
const MOCK_SESSIONS = {
  '19Oct2025': [
    { date: '19Oct2025', time: '12.55pm', fileName: '12.55pm.csv', filePath: '' },
    { date: '19Oct2025', time: '1.12pm', fileName: '1.12pm.csv', filePath: '' },
  ],
  '20Oct2025': [
    { date: '20Oct2025', time: '9.04am', fileName: '9.04am.csv', filePath: '' },
  ],
  '21Oct2025': [
    { date: '21Oct2025', time: '3.22pm', fileName: '3.22pm.csv', filePath: '' },
  ],
};

const MOCK_CSV_DATA: Record<string, string> = {
  '19Oct2025/12.55pm.csv': `timestamp_ms,speed,g_force,temp,humidity,lux,altitude
0,0.0,0.0,22.5,45.2,850,150.0
1000,15.2,0.3,22.6,45.1,845,150.2
2000,28.5,0.6,22.7,45.0,840,150.5
3000,42.3,0.9,22.8,44.9,835,151.0
4000,55.8,1.2,23.0,44.8,830,151.5
5000,68.4,1.5,23.2,44.7,825,152.0
6000,79.2,1.8,23.5,44.6,820,152.5
7000,87.5,2.1,23.8,44.5,815,153.0
8000,93.2,2.4,24.0,44.4,810,153.5
9000,96.8,2.6,24.2,44.3,805,154.0
10000,98.5,2.7,24.4,44.2,800,154.5
11000,99.2,2.8,24.6,44.1,795,155.0
12000,99.8,2.8,24.8,44.0,790,155.5
13000,100.0,2.9,25.0,43.9,785,156.0
14000,98.5,2.7,25.1,43.8,780,156.5
15000,95.2,2.4,25.2,43.7,775,157.0
16000,89.8,2.0,25.3,43.6,770,157.5
17000,82.4,1.6,25.2,43.7,765,158.0
18000,73.5,1.2,25.1,43.8,760,158.5
19000,62.8,0.9,25.0,43.9,755,159.0
20000,50.5,0.6,24.8,44.0,750,159.5
21000,38.2,0.4,24.6,44.1,745,160.0
22000,25.8,0.2,24.4,44.2,740,160.5
23000,15.4,0.1,24.2,44.3,735,161.0
24000,8.2,0.0,24.0,44.4,730,161.5
25000,2.5,0.0,23.8,44.5,725,162.0
26000,0.0,0.0,23.6,44.6,720,162.5`,
  '19Oct2025/1.12pm.csv': `timestamp_ms,speed,g_force,temp,humidity,lux,altitude
0,0.0,0.0,23.2,48.5,920,148.0
1000,12.4,0.2,23.3,48.4,915,148.2
2000,24.8,0.5,23.4,48.3,910,148.5
3000,38.6,0.8,23.5,48.2,905,149.0
4000,52.3,1.1,23.7,48.1,900,149.5
5000,65.8,1.4,23.9,48.0,895,150.0
6000,77.5,1.7,24.1,47.9,890,150.5
7000,86.2,2.0,24.3,47.8,885,151.0
8000,91.8,2.2,24.5,47.7,880,151.5
9000,94.5,2.4,24.7,47.6,875,152.0
10000,95.8,2.5,24.9,47.5,870,152.5
11000,96.2,2.6,25.1,47.4,865,153.0
12000,96.5,2.6,25.3,47.3,860,153.5
13000,95.8,2.5,25.4,47.2,855,154.0
14000,93.2,2.3,25.5,47.1,850,154.5
15000,88.5,1.9,25.4,47.2,845,155.0
16000,81.2,1.5,25.3,47.3,840,155.5
17000,72.8,1.1,25.2,47.4,835,156.0
18000,62.5,0.8,25.1,47.5,830,156.5
19000,51.2,0.5,25.0,47.6,825,157.0
20000,39.8,0.3,24.9,47.7,820,157.5
21000,28.5,0.2,24.8,47.8,815,158.0
22000,17.2,0.1,24.7,47.9,810,158.5
23000,8.5,0.0,24.6,48.0,805,159.0
24000,2.8,0.0,24.5,48.1,800,159.5
25000,0.0,0.0,24.4,48.2,795,160.0`,
  '20Oct2025/9.04am.csv': `timestamp_ms,speed,g_force,temp,humidity,lux,altitude
0,0.0,0.0,21.8,52.3,780,145.0
1000,18.5,0.4,21.9,52.2,785,145.3
2000,35.2,0.8,22.0,52.1,790,145.7
3000,48.8,1.2,22.1,52.0,795,146.2
4000,62.5,1.6,22.3,51.9,800,146.8
5000,75.2,2.0,22.5,51.8,805,147.5
6000,85.8,2.4,22.7,51.7,810,148.2
7000,93.5,2.7,22.9,51.6,815,149.0
8000,98.2,3.0,23.1,51.5,820,149.8
9000,101.5,3.2,23.3,51.4,825,150.6
10000,103.2,3.3,23.5,51.3,830,151.5
11000,104.5,3.4,23.7,51.2,835,152.3
12000,105.0,3.5,23.9,51.1,840,153.2
13000,105.2,3.5,24.1,51.0,845,154.0
14000,104.8,3.4,24.3,50.9,850,154.8
15000,103.2,3.2,24.4,50.8,855,155.5
16000,100.5,2.9,24.5,50.7,860,156.2
17000,96.2,2.5,24.6,50.8,865,156.8
18000,89.8,2.1,24.5,50.9,870,157.3
19000,81.5,1.7,24.4,51.0,875,157.7
20000,71.2,1.3,24.3,51.1,880,158.0
21000,59.5,0.9,24.2,51.2,885,158.3
22000,46.8,0.6,24.1,51.3,890,158.5
23000,33.2,0.4,24.0,51.4,895,158.7
24000,19.5,0.2,23.9,51.5,900,158.8
25000,8.2,0.1,23.8,51.6,905,158.9
26000,2.5,0.0,23.7,51.7,910,159.0
27000,0.0,0.0,23.6,51.8,915,159.0`,
  '21Oct2025/3.22pm.csv': `timestamp_ms,speed,g_force,temp,humidity,lux,altitude
0,0.0,0.0,24.5,46.8,890,152.0
1000,22.5,0.5,24.6,46.7,895,152.4
2000,42.8,1.0,24.7,46.6,900,152.9
3000,58.5,1.5,24.8,46.5,905,153.5
4000,71.2,2.0,25.0,46.4,910,154.2
5000,82.5,2.4,25.2,46.3,915,155.0
6000,91.8,2.8,25.4,46.2,920,155.8
7000,98.5,3.1,25.6,46.1,925,156.7
8000,102.8,3.3,25.8,46.0,930,157.6
9000,105.5,3.5,26.0,45.9,935,158.5
10000,107.2,3.6,26.2,45.8,940,159.4
11000,108.5,3.7,26.4,45.7,945,160.3
12000,109.2,3.8,26.6,45.6,950,161.2
13000,109.8,3.8,26.8,45.5,955,162.0
14000,110.0,3.9,27.0,45.4,960,162.8
15000,109.5,3.8,27.1,45.3,965,163.5
16000,108.2,3.6,27.2,45.2,970,164.2
17000,105.8,3.4,27.3,45.1,975,164.8
18000,102.5,3.1,27.2,45.2,980,165.3
19000,97.8,2.8,27.1,45.3,985,165.7
20000,91.5,2.4,27.0,45.4,990,166.0
21000,83.8,2.0,26.9,45.5,995,166.2
22000,74.5,1.6,26.8,45.6,1000,166.4
23000,63.8,1.2,26.7,45.7,1005,166.5
24000,52.2,0.9,26.6,45.8,1010,166.6
25000,39.5,0.6,26.5,45.9,1015,166.6
26000,26.8,0.4,26.4,46.0,1020,166.6
27000,15.2,0.2,26.3,46.1,1025,166.6
28000,6.5,0.1,26.2,46.2,1030,166.5
29000,1.8,0.0,26.1,46.3,1035,166.5
30000,0.0,0.0,26.0,46.4,1040,166.5`,
};

class LogService {
  private logsDir = FileSystem.documentDirectory + 'ApexBox_Logs/';

  async getSessionsByDate(): Promise<Record<string, SessionMetadata[]>> {
    try {
      console.log('[LogService] Getting sessions...');
      
      // Use mock sessions for now
      const cached = await AsyncStorage.getItem('sessions_cache');
      if (cached) {
        console.log('[LogService] Using cached sessions');
        return JSON.parse(cached);
      }

      // Return mock sessions
      console.log('[LogService] Using mock sessions');
      await AsyncStorage.setItem('sessions_cache', JSON.stringify(MOCK_SESSIONS));
      return MOCK_SESSIONS;
    } catch (error) {
      console.error('[LogService] Error reading sessions:', error);
      return MOCK_SESSIONS;
    }
  }

  async getSessionData(session: SessionMetadata): Promise<TelemetrySample[]> {
    try {
      console.log('[LogService] Reading session:', session.date, session.fileName);
      
      // Use mock CSV data
      const csvKey = `${session.date}/${session.fileName}`;
      const content = MOCK_CSV_DATA[csvKey];
      
      if (!content) {
        console.error('[LogService] Mock data not found for:', csvKey);
        return [];
      }
      
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
        stats: calculateStats({ samples: telemetryData, csvFilePath: sessionKey }),
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
}

export default new LogService();