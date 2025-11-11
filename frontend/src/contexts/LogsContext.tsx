import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionFile {
  date: string;
  fileName: string;
}

interface SessionSample {
  timestamp_ms: number;
  speed: number;
  g_force: number;
  temp: number;
  humidity: number;
  lux: number;
  altitude: number;
}

interface SessionData {
  samples: SessionSample[];
  duration: number;
  maxSpeed: number;
  maxGForce: number;
}

interface LogsContextType {
  sessions: SessionFile[];
  latestSession: SessionData | null;
  isLoading: boolean;
  rescan: () => Promise<void>;
  deleteSession: (date: string, fileName: string) => Promise<void>;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionFile[]>([]);
  const [latestSession, setLatestSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSessions();
  }, []);

  // ✅ Initialize with cleanup
  const initializeSessions = async () => {
    await clearCorruptedSessions();
    await loadSessions();
  };

  // ✅ Clean up corrupted sessions automatically
  const clearCorruptedSessions = async () => {
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
          await AsyncStorage.removeItem(key.replace('session_', 'telemetry_'));
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        console.log(`[LogService] Removed ${removedCount} corrupted session(s)`);
      } else {
        console.log('[LogService] No corrupted sessions found');
      }
    } catch (error) {
      console.error('[LogService] Error clearing corrupted sessions:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      console.log('[LogService] Getting sessions from AsyncStorage...');
      
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith('session_'));
      
      const sessionFiles: SessionFile[] = sessionKeys.map(key => {
        const parts = key.replace('session_', '').split('/');
        return {
          date: parts[0],
          fileName: parts[1],
        };
      });

      // Sort by date descending (newest first)
      sessionFiles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('[LogService] Found', sessionFiles.length, 'sessions');
      setSessions(sessionFiles);

      // Load latest session data
      if (sessionFiles.length > 0) {
        await loadLatestSessionData(sessionFiles[0]);
      } else {
        setLatestSession(null);
      }
    } catch (error) {
      console.error('[LogService] Error loading sessions:', error);
      setSessions([]);
      setLatestSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLatestSessionData = async (session: SessionFile) => {
    try {
      const sessionKey = `${session.date}/${session.fileName}`;
      const metadataStr = await AsyncStorage.getItem(`session_${sessionKey}`);
      
      if (metadataStr) {
        try {
          const metadata = JSON.parse(metadataStr);
          console.log('[LogService] Loaded latest session data');
          
          // ✅ Validate and sanitize loaded data
          const samples = (metadata.samples || []).map((s: any) => ({
            timestamp_ms: s.timestamp_ms || 0,
            speed: isFinite(s.speed) ? s.speed : 0,
            g_force: isFinite(s.g_force) ? s.g_force : 0,
            temp: isFinite(s.temp) ? s.temp : 0,
            humidity: isFinite(s.humidity) ? s.humidity : 0,
            lux: isFinite(s.lux) ? s.lux : 0,
            altitude: isFinite(s.altitude) ? s.altitude : 0,
          }));
          
          setLatestSession({
            samples,
            duration: metadata.duration || 0,
            maxSpeed: isFinite(metadata.maxSpeed) ? metadata.maxSpeed : 0,
            maxGForce: isFinite(metadata.maxGForce) ? metadata.maxGForce : 0,
          });
        } catch (parseError) {
          console.error('[LogService] Error parsing session metadata, removing corrupted data');
          // If parse fails, delete the corrupted data
          await AsyncStorage.removeItem(`session_${sessionKey}`);
          await AsyncStorage.removeItem(`gps_${sessionKey}`);
          await AsyncStorage.removeItem(`telemetry_${sessionKey}`);
          setLatestSession(null);
        }
      } else {
        setLatestSession(null);
      }
    } catch (error) {
      console.error('[LogService] Error loading latest session data:', error);
      setLatestSession(null);
    }
  };

  const rescan = async () => {
    console.log('[LogService] Rescanning sessions...');
    await loadSessions();
  };

  const deleteSession = async (date: string, fileName: string) => {
    try {
      const sessionKey = `${date}/${fileName}`;
      console.log('[LogService] Deleting session:', sessionKey);

      // Delete all related data
      await AsyncStorage.multiRemove([
        `session_${sessionKey}`,
        `gps_${sessionKey}`,
        `telemetry_${sessionKey}`,
      ]);

      // Reload sessions
      await loadSessions();
      console.log('[LogService] Session deleted successfully');
    } catch (error) {
      console.error('[LogService] Error deleting session:', error);
      throw error;
    }
  };

  return (
    <LogsContext.Provider value={{ sessions, latestSession, isLoading, rescan, deleteSession }}>
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
}