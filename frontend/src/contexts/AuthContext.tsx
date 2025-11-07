import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import * as Haptics from 'expo-haptics';

export interface CarData {
  id: string;
  make: string;
  model: string;
  year: string;
  nickname: string;
  isActive: boolean;
}

export interface CrewMember {
  uid: string;
  displayName: string;
  avatarURI?: string;
  topSpeed: number;
  totalSessions: number;
}

export interface Crew {
  id: string;
  name: string;
  description: string;
  code: string;
  adminId: string;
  memberIds: string[];
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarURI?: string;
  premium: boolean;
  garage?: CarData[];
  friendId?: string;
  crewIds?: string[];
  state?: string; // US state code (e.g., "CA", "NY", "TX")
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUsername: (newName: string) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<void>;
  updateUserState: (stateCode: string) => Promise<void>;
  addCar: (car: Omit<CarData, 'id' | 'isActive'>) => Promise<void>;
  updateCar: (carId: string, updates: Partial<CarData>) => Promise<void>;
  deleteCar: (carId: string) => Promise<void>;
  setActiveCar: (carId: string) => Promise<void>;
  getActiveCar: () => CarData | null;
  createCrew: (name: string, description: string) => Promise<string>;
  joinCrew: (crewCode: string) => Promise<void>;
  leaveCrew: (crewId: string) => Promise<void>;
  getUserCrews: () => Promise<Crew[]>;
  addMemberToCrew: (crewId: string, memberFriendId: string) => Promise<void>;
  removeMemberFromCrew: (crewId: string, memberUid: string) => Promise<void>;
  upgradeToPremium: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadUserProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadUserProfile = async (uid: string) => {
    try {
      console.log('[Auth] Loading profile for user:', uid);
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('[Auth] Profile loaded successfully');
        
        // Load garage
        console.log('[Auth] Loading garage for user:', uid);
        const garage = await loadGarage(uid);
        console.log(`[Auth] Loaded ${garage.length} cars from garage`);
        
        // Ensure friendId exists
        let friendId = data.friendId;
        if (!friendId) {
          friendId = generateFriendId();
          await updateDoc(doc(db, 'users', uid), { friendId });
          console.log('[Auth] Generated new friendId:', friendId);
        }
        
        setProfile({
          uid,
          email: data.email,
          displayName: data.displayName,
          avatarURI: data.avatarURI,
          premium: data.premium || false,
          garage,
          friendId,
          crewIds: data.crewIds || [],
          state: data.state,
        });
        console.log('[Auth] User data loaded successfully');
      }
    } catch (error) {
      console.error('[Auth] Error loading user profile:', error);
    }
  };

  const loadGarage = async (uid: string): Promise<CarData[]> => {
    try {
      const garageRef = collection(db, 'users', uid, 'garage');
      const garageSnap = await getDocs(garageRef);
      return garageSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarData));
    } catch (error) {
      console.error('[Auth] Error loading garage:', error);
      return [];
    }
  };

  const generateFriendId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateCrewCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 11; i++) {
      if (i === 5) result += '-';
      else result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      throw new Error(error.message);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      const friendId = generateFriendId();
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        premium: false,
        createdAt: Date.now(),
        friendId,
        crewIds: [],
      });
    } catch (error: any) {
      console.error('[Auth] Signup error:', error);
      throw new Error(error.message);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setProfile(null);
    } catch (error: any) {
      console.error('[Auth] Logout error:', error);
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('[Auth] Reset password error:', error);
      throw new Error(error.message);
    }
  };

  const updateUsername = async (newName: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: newName });
      
      // Update user profile doc
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName });
      
      // Update leaderboard entries (if exists, using setDoc with merge)
      try {
        const leaderboardRef = doc(db, 'leaderboards', user.uid);
        await setDoc(leaderboardRef, { displayName: newName }, { merge: true });
        console.log('[Auth] ✅ Updated leaderboard entry');
      } catch (leaderboardError) {
        console.log('[Auth] No leaderboard entry to update (will create on first session)');
      }
      
      // Update local state
      if (profile) {
        setProfile({ ...profile, displayName: newName });
      }
      
      console.log('[Auth] ✅ Username updated:', newName);
    } catch (error: any) {
      console.error('[Auth] Update username error:', error);
      throw new Error(error.message);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Upload image to storage
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user profile doc (use avatarURI to match interface)
      await updateDoc(doc(db, 'users', user.uid), { avatarURI: downloadURL });
      
      // Update leaderboard entries (if exists, using setDoc with merge)
      try {
        const leaderboardRef = doc(db, 'leaderboards', user.uid);
        await setDoc(leaderboardRef, { avatarURI: downloadURL }, { merge: true });
        console.log('[Auth] ✅ Updated leaderboard entry');
      } catch (leaderboardError) {
        console.log('[Auth] No leaderboard entry to update (will create on first session)');
      }
      
      // Update local state
      if (profile) {
        setProfile({ ...profile, avatarURI: downloadURL });
      }
      
      console.log('[Auth] ✅ Avatar updated');
    } catch (error: any) {
      console.error('[Auth] Upload avatar error:', error);
      throw new Error(error.message);
    }
  };

  const addCar = async (car: Omit<CarData, 'id' | 'isActive'>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const garageRef = collection(db, 'users', user.uid, 'garage');
      const garageSnap = await getDocs(garageRef);
      const isFirstCar = garageSnap.empty;
      
      const newCarRef = doc(garageRef);
      const newCar = {
        ...car,
        id: newCarRef.id,
        isActive: isFirstCar,
        createdAt: Date.now(),
      };
      
      // Optimistic update - add to UI immediately
      if (profile) {
        const updatedGarage = [...(profile.garage || []), newCar];
        setProfile({ ...profile, garage: updatedGarage });
      }
      
      // Save to Firebase
      await setDoc(newCarRef, {
        ...car,
        isActive: isFirstCar,
        createdAt: Date.now(),
      });
      
      // Don't reload on success - optimistic update is correct
      
    } catch (error: any) {
      console.error('[Auth] Add car error:', error);
      // Rollback on error
      if (profile) {
        const freshGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: freshGarage });
      }
      throw new Error(error.message);
    }
  };

  const updateCar = async (carId: string, updates: Partial<CarData>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Optimistic update - update UI immediately
      if (profile) {
        const updatedGarage = profile.garage?.map(car => 
          car.id === carId ? { ...car, ...updates } : car
        ) || [];
        setProfile({ ...profile, garage: updatedGarage });
      }
      
      // Update Firebase
      await updateDoc(doc(db, 'users', user.uid, 'garage', carId), updates);
      
      // Don't reload on success - optimistic update is correct
      
    } catch (error: any) {
      console.error('[Auth] Update car error:', error);
      // Rollback on error
      if (profile) {
        const freshGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: freshGarage });
      }
      throw new Error(error.message);
    }
  };

  const deleteCar = async (carId: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      console.log('[Auth] ======= STARTING CAR DELETION =======');
      console.log('[Auth] Car ID to delete:', carId);
      console.log('[Auth] Current garage count:', profile?.garage?.length || 0);
      
      // IMPORTANT: Delete from Firebase FIRST before updating UI
      // This ensures the delete operation completes successfully
      await deleteDoc(doc(db, 'users', user.uid, 'garage', carId));
      console.log('[Auth] ✅ Firebase delete successful');
      
      // Now update UI to reflect the deletion
      if (profile && profile.garage) {
        const updatedGarage = profile.garage.filter(car => car.id !== carId);
        console.log('[Auth] Updated garage count:', updatedGarage.length);
        setProfile({ ...profile, garage: updatedGarage });
        console.log('[Auth] ✅ Profile updated with new garage');
      }
      
      console.log('[Auth] ======= CAR DELETION COMPLETE =======');
      
    } catch (error: any) {
      console.error('[Auth] ❌ Delete car error:', error);
      console.error('[Auth] Error details:', error.code, error.message);
      
      // Rollback on error - reload from Firebase
      if (profile && user) {
        console.log('[Auth] Rolling back - reloading garage from Firebase');
        const freshGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: freshGarage });
      }
      
      throw new Error(error.message || 'Failed to delete car');
    }
  };

  const setActiveCar = async (carId: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Optimistic update - update UI immediately
      if (profile) {
        const updatedGarage = profile.garage?.map(car => ({
          ...car,
          isActive: car.id === carId,
        })) || [];
        setProfile({ ...profile, garage: updatedGarage });
      }
      
      // Update Firebase
      const garageRef = collection(db, 'users', user.uid, 'garage');
      const garageSnap = await getDocs(garageRef);
      
      const batch = [];
      for (const carDoc of garageSnap.docs) {
        batch.push(
          updateDoc(carDoc.ref, { isActive: carDoc.id === carId })
        );
      }
      
      await Promise.all(batch);
      
      // Don't reload on success - optimistic update is correct
      
    } catch (error: any) {
      console.error('[Auth] Set active car error:', error);
      // Rollback on error
      if (profile) {
        const freshGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: freshGarage });
      }
      throw new Error(error.message);
    }
  };

  const getActiveCar = (): CarData | null => {
    if (!profile?.garage) return null;
    return profile.garage.find(car => car.isActive) || null;
  };

  /**
   * Update user's state (for leaderboard filtering)
   */
  const updateUserState = async (stateCode: string): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      console.log('[Auth] Updating user state to:', stateCode);
      
      // Update Firebase
      await updateDoc(doc(db, 'users', user.uid), {
        state: stateCode,
      });
      
      // Update local profile
      if (profile) {
        setProfile({ ...profile, state: stateCode });
      }
      
      console.log('[Auth] ✅ User state updated');
    } catch (error: any) {
      console.error('[Auth] Error updating state:', error);
      throw new Error(error.message);
    }
  };

  /**
   * Clean up duplicate cars from Firebase
   * This is a utility function to fix data inconsistencies
   */
  const cleanupDuplicateCars = async (): Promise<void> => {
    if (!user) return;
    
    try {
      console.log('[Auth] ======= CLEANING UP DUPLICATE CARS =======');
      
      const garage = await loadGarage(user.uid);
      const ids = garage.map(c => c.id);
      const uniqueIds = [...new Set(ids)];
      
      if (ids.length === uniqueIds.length) {
        console.log('[Auth] No duplicates found');
        return;
      }
      
      console.log('[Auth] Found duplicates, cleaning up...');
      
      // Delete all cars
      for (const car of garage) {
        await deleteDoc(doc(db, 'users', user.uid, 'garage', car.id));
      }
      
      // Re-add unique cars only
      const uniqueCars = garage.filter((car, index, self) => 
        index === self.findIndex(c => c.id === car.id)
      );
      
      for (const car of uniqueCars) {
        await setDoc(doc(db, 'users', user.uid, 'garage', car.id), {
          make: car.make,
          model: car.model,
          year: car.year,
          nickname: car.nickname,
          isActive: car.isActive,
          createdAt: car.createdAt || Date.now(),
        });
      }
      
      console.log('[Auth] ✅ Duplicates cleaned up');
      
      // Reload garage
      const freshGarage = await loadGarage(user.uid);
      if (profile) {
        setProfile({ ...profile, garage: freshGarage });
      }
    } catch (error) {
      console.error('[Auth] Error cleaning up duplicates:', error);
    }
  };

  // CREW FUNCTIONS
  const createCrew = async (name: string, description: string): Promise<string> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      console.log('[Auth] ======= CREATING CREW =======');
      console.log('[Auth] Name:', name);
      console.log('[Auth] Description:', description);
      console.log('[Auth] User ID:', user.uid);
      
      // Generate unique crew code
      const crewCode = generateCrewCode();
      console.log('[Auth] Generated crew code:', crewCode);
      
      // Create crew document with auto-generated ID
      const crewRef = doc(collection(db, 'crews'));
      console.log('[Auth] Crew ID:', crewRef.id);
      
      const crewData = {
        name,
        description,
        code: crewCode,
        adminId: user.uid,
        memberIds: [user.uid],
        createdAt: Date.now(),
      };
      
      console.log('[Auth] Saving crew to Firebase...');
      await setDoc(crewRef, crewData);
      console.log('[Auth] ✅ Crew saved to Firebase');
      
      // Add crew ID to user's crewIds array
      console.log('[Auth] Updating user crewIds...');
      await updateDoc(doc(db, 'users', user.uid), {
        crewIds: arrayUnion(crewRef.id),
      });
      console.log('[Auth] ✅ User crewIds updated');
      
      // Update local profile
      if (profile) {
        const updatedCrewIds = [...(profile.crewIds || []), crewRef.id];
        setProfile({
          ...profile,
          crewIds: updatedCrewIds,
        });
        console.log('[Auth] ✅ Profile updated with new crew');
      }
      
      console.log('[Auth] ======= CREW CREATED SUCCESSFULLY =======');
      console.log('[Auth] Crew Code:', crewCode);
      
      return crewCode;
    } catch (error: any) {
      console.error('[Auth] ❌ Create crew error:', error);
      console.error('[Auth] Error code:', error.code);
      console.error('[Auth] Error message:', error.message);
      throw new Error(error.message || 'Failed to create crew');
    }
  };

  const joinCrew = async (crewCode: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Find crew by code
      const crewsQuery = query(collection(db, 'crews'), where('code', '==', crewCode.toUpperCase()));
      const crewsSnap = await getDocs(crewsQuery);
      
      if (crewsSnap.empty) {
        throw new Error('Crew not found. Please check the code and try again.');
      }
      
      const crewDoc = crewsSnap.docs[0];
      const crewData = crewDoc.data();
      
      // Check if already a member
      if (crewData.memberIds.includes(user.uid)) {
        throw new Error('You are already a member of this crew.');
      }
      
      // Add user to crew
      await updateDoc(crewDoc.ref, {
        memberIds: arrayUnion(user.uid),
      });
      
      // Add crew to user's crewIds
      await updateDoc(doc(db, 'users', user.uid), {
        crewIds: arrayUnion(crewDoc.id),
      });
      
      if (profile) {
        setProfile({
          ...profile,
          crewIds: [...(profile.crewIds || []), crewDoc.id],
        });
      }
    } catch (error: any) {
      console.error('[Auth] Join crew error:', error);
      throw error;
    }
  };

  const leaveCrew = async (crewId: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const crewRef = doc(db, 'crews', crewId);
      const crewDoc = await getDoc(crewRef);
      
      if (!crewDoc.exists()) {
        throw new Error('Crew not found');
      }
      
      const crewData = crewDoc.data();
      
      // If user is admin and there are other members, transfer admin or delete crew
      if (crewData.adminId === user.uid) {
        const otherMembers = crewData.memberIds.filter((id: string) => id !== user.uid);
        
        if (otherMembers.length > 0) {
          // Transfer admin to first member
          await updateDoc(crewRef, {
            adminId: otherMembers[0],
            memberIds: arrayRemove(user.uid),
          });
        } else {
          // Delete crew if no other members
          await deleteDoc(crewRef);
        }
      } else {
        // Just remove user from crew
        await updateDoc(crewRef, {
          memberIds: arrayRemove(user.uid),
        });
      }
      
      // Remove crew from user's crewIds
      await updateDoc(doc(db, 'users', user.uid), {
        crewIds: arrayRemove(crewId),
      });
      
      if (profile) {
        setProfile({
          ...profile,
          crewIds: (profile.crewIds || []).filter(id => id !== crewId),
        });
      }
    } catch (error: any) {
      console.error('[Auth] Leave crew error:', error);
      throw new Error('Failed to leave crew');
    }
  };

  const getUserCrews = async (): Promise<Crew[]> => {
    if (!user) return [];
    
    try {
      if (!profile?.crewIds || profile.crewIds.length === 0) {
        return [];
      }
      
      const crews: Crew[] = [];
      
      for (const crewId of profile.crewIds) {
        const crewDoc = await getDoc(doc(db, 'crews', crewId));
        if (crewDoc.exists()) {
          crews.push({
            id: crewDoc.id,
            ...crewDoc.data(),
          } as Crew);
        }
      }
      
      return crews;
    } catch (error: any) {
      console.error('[Auth] Get user crews error:', error);
      return [];
    }
  };

  const addMemberToCrew = async (crewId: string, memberFriendId: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Find user by friendId
      const usersQuery = query(collection(db, 'users'), where('friendId', '==', memberFriendId));
      const usersSnap = await getDocs(usersQuery);
      
      if (usersSnap.empty) {
        throw new Error('User not found');
      }
      
      const memberDoc = usersSnap.docs[0];
      const memberId = memberDoc.id;
      
      // Add to crew
      await updateDoc(doc(db, 'crews', crewId), {
        memberIds: arrayUnion(memberId),
      });
      
      // Add crew to member's crewIds
      await updateDoc(doc(db, 'users', memberId), {
        crewIds: arrayUnion(crewId),
      });
    } catch (error: any) {
      console.error('[Auth] Add member to crew error:', error);
      throw error;
    }
  };

  const removeMemberFromCrew = async (crewId: string, memberUid: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await updateDoc(doc(db, 'crews', crewId), {
        memberIds: arrayRemove(memberUid),
      });
      
      await updateDoc(doc(db, 'users', memberUid), {
        crewIds: arrayRemove(crewId),
      });
    } catch (error: any) {
      console.error('[Auth] Remove member from crew error:', error);
      throw error;
    }
  };

  const upgradeToPremium = async () => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // For now, just set premium to true in Firestore
      // In production, this would be triggered by successful in-app purchase
      await updateDoc(doc(db, 'users', user.uid), {
        premium: true,
      });
      
      if (profile) {
        setProfile({ ...profile, premium: true });
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('[Auth] Upgrade to premium error:', error);
      throw new Error('Failed to upgrade to premium');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut: signOutUser,
        resetPassword,
        updateUsername,
        uploadAvatar,
        updateUserState,
        // Car management
        addCar,
        updateCar,
        deleteCar,
        setActiveCar,
        getActiveCar,
        createCrew,
        joinCrew,
        leaveCrew,
        getUserCrews,
        addMemberToCrew,
        removeMemberFromCrew,
        upgradeToPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
