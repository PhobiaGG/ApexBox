import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarURI?: string;
  topSpeed: number;
  maxGForce: number;
  totalSessions: number;
  lastUpdated: number;
  state?: string; // US state for filtering (e.g., "CA", "NY", "TX")
}

class LeaderboardService {
  /**
   * Update user's leaderboard stats after a session
   */
  async updateUserStats(
    uid: string,
    sessionTopSpeed: number,
    sessionMaxGForce: number,
    userState?: string
  ): Promise<void> {
    try {
      console.log('[Leaderboard] Updating stats for user:', uid);
      console.log('[Leaderboard] Session top speed:', sessionTopSpeed);
      console.log('[Leaderboard] Session max G-force:', sessionMaxGForce);
      
      const leaderboardRef = doc(db, 'leaderboard', uid);
      const leaderboardDoc = await getDoc(leaderboardRef);
      
      if (leaderboardDoc.exists()) {
        // Update existing entry
        const currentData = leaderboardDoc.data();
        const newTopSpeed = Math.max(currentData.topSpeed || 0, sessionTopSpeed);
        const newMaxGForce = Math.max(currentData.maxGForce || 0, sessionMaxGForce);
        const newTotalSessions = (currentData.totalSessions || 0) + 1;
        
        await updateDoc(leaderboardRef, {
          topSpeed: newTopSpeed,
          maxGForce: newMaxGForce,
          totalSessions: newTotalSessions,
          lastUpdated: Date.now(),
        });
        
        console.log('[Leaderboard] ✅ Stats updated');
      } else {
        // Create new entry
        const userDoc = await getDoc(doc(db, 'users', uid));
        const userData = userDoc.data();
        
        await setDoc(leaderboardRef, {
          uid,
          displayName: userData?.displayName || 'Anonymous',
          avatarURI: userData?.avatarURI || null,
          topSpeed: sessionTopSpeed,
          maxGForce: sessionMaxGForce,
          totalSessions: 1,
          lastUpdated: Date.now(),
          state: userState || userData?.state || null,
        });
        
        console.log('[Leaderboard] ✅ New entry created');
      }
    } catch (error) {
      console.error('[Leaderboard] Error updating stats:', error);
      throw error;
    }
  }

  /**
   * Get top speed leaderboard
   */
  async getTopSpeedLeaderboard(limitCount: number = 50): Promise<LeaderboardEntry[]> {
    try {
      console.log('[Leaderboard] Fetching top speed leaderboard...');
      
      const leaderboardQuery = query(
        collection(db, 'leaderboard'),
        orderBy('topSpeed', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(leaderboardQuery);
      const entries: LeaderboardEntry[] = [];
      
      snapshot.forEach((doc) => {
        entries.push(doc.data() as LeaderboardEntry);
      });
      
      console.log('[Leaderboard] ✅ Fetched', entries.length, 'top speed entries');
      return entries;
    } catch (error) {
      console.error('[Leaderboard] Error fetching top speed leaderboard:', error);
      return [];
    }
  }

  /**
   * Get max G-force leaderboard
   */
  async getMaxGForceLeaderboard(limitCount: number = 50): Promise<LeaderboardEntry[]> {
    try {
      console.log('[Leaderboard] Fetching max G-force leaderboard...');
      
      const leaderboardQuery = query(
        collection(db, 'leaderboard'),
        orderBy('maxGForce', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(leaderboardQuery);
      const entries: LeaderboardEntry[] = [];
      
      snapshot.forEach((doc) => {
        entries.push(doc.data() as LeaderboardEntry);
      });
      
      console.log('[Leaderboard] ✅ Fetched', entries.length, 'max G-force entries');
      return entries;
    } catch (error) {
      console.error('[Leaderboard] Error fetching max G-force leaderboard:', error);
      return [];
    }
  }

  /**
   * Get user's rank in top speed leaderboard
   */
  async getUserTopSpeedRank(uid: string): Promise<number | null> {
    try {
      const entries = await this.getTopSpeedLeaderboard(1000); // Get more entries for accurate ranking
      const index = entries.findIndex(entry => entry.uid === uid);
      return index !== -1 ? index + 1 : null;
    } catch (error) {
      console.error('[Leaderboard] Error getting user rank:', error);
      return null;
    }
  }

  /**
   * Get user's rank in max G-force leaderboard
   */
  async getUserMaxGForceRank(uid: string): Promise<number | null> {
    try {
      const entries = await this.getMaxGForceLeaderboard(1000); // Get more entries for accurate ranking
      const index = entries.findIndex(entry => entry.uid === uid);
      return index !== -1 ? index + 1 : null;
    } catch (error) {
      console.error('[Leaderboard] Error getting user rank:', error);
      return null;
    }
  }

  /**
   * Get user's leaderboard entry
   */
  async getUserEntry(uid: string): Promise<LeaderboardEntry | null> {
    try {
      const leaderboardDoc = await getDoc(doc(db, 'leaderboard', uid));
      
      if (leaderboardDoc.exists()) {
        return leaderboardDoc.data() as LeaderboardEntry;
      }
      
      return null;
    } catch (error) {
      console.error('[Leaderboard] Error getting user entry:', error);
      return null;
    }
  }
}

export default new LeaderboardService();
