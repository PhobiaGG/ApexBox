import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import LogService, { SessionMetadata } from '../services/LogService';
import { TelemetrySample } from '../utils/csv';

interface LogsContextType {
  sessionsByDate: Record<string, SessionMetadata[]>;
  latestSession: { session: SessionMetadata; samples: TelemetrySample[] } | null;
  isLoading: boolean;
  rescan: () => Promise<void>;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, SessionMetadata[]>>({});
  const [latestSession, setLatestSession] = useState<{ session: SessionMetadata; samples: TelemetrySample[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const sessions = await LogService.getSessionsByDate();
      setSessionsByDate(sessions);
      
      const latest = await LogService.getLatestSession();
      setLatestSession(latest);
    } catch (error) {
      console.error('[LogsContext] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const rescan = async () => {
    try {
      await LogService.rescan();
      await loadLogs();
    } catch (error) {
      console.error('[LogsContext] Rescan error:', error);
    }
  };

  return (
    <LogsContext.Provider value={{ sessionsByDate, latestSession, isLoading, rescan }}>
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within LogsProvider');
  }
  return context;
}