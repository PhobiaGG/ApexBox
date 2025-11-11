import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase compat imports for auth
import type firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Keep modular imports for Firestore and Storage (they work fine)
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

// Import from firebase config
import { auth, db, storage, app } from '../config/firebase'; 
import * as Haptics from 'expo-haptics';

// Use compat User type
type User = firebase.User;

// --- INTERFACES AND TYPES ---

export interface CarData {
  id: string;
  make: string;
  model: string;
  year: string;
  nickname: string;
  isActive: boolean;
  createdAt?: number;
  color?: string;
  upgrades?: string;
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
  state?: string; 
  carModel?: string; 
  carYear?: string; 
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  initializing: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUsername: (newName: string) => Promise<void>;
  updateUserProfileDoc: (updates: { carModel?: string, carYear?: string }) => Promise<void>;
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
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use compat syntax for onAuthStateChanged
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
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
        
        console.log('[Auth] Loading garage for user:', uid);
        const garage = await loadGarage(uid);
        console.log(`[Auth] Loaded ${garage.length} cars from garage`);
        
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
          premium: data.premium || true,
          garage,
          friendId,
          crewIds: data.crewIds || [],
          state: data.state,
          carModel: data.carModel,
          carYear: data.carYear,
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
      // Compat syntax
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      throw new Error(error.message);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // Compat syntax
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user?.updateProfile({ displayName });
      
      const friendId = generateFriendId();
      
      await setDoc(doc(db, 'users', userCredential.user!.uid), {
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
      // Compat syntax
      await auth.signOut();
      setProfile(null);
    } catch (error: any) {
      console.error('[Auth] Logout error:', error);
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Compat syntax
      await auth.sendPasswordResetEmail(email);
    } catch (error: any) {
      console.error('[Auth] Reset password error:', error);
      throw new Error(error.message);
    }
  };

  const updateUsername = async (newName: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // Compat syntax
      await user.updateProfile({ displayName: newName });
      
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName });
      
      try {
        const leaderboardRef = doc(db, 'leaderboards', user.uid);
        await setDoc(leaderboardRef, { displayName: newName }, { merge: true });
        console.log('[Auth] ✅ Updated leaderboard entry');
      } catch (leaderboardError) {
        console.log('[Auth] No leaderboard entry to update');
      }
      
      if (profile) {
        setProfile({ ...profile, displayName: newName });
      }
      
      console.log('[Auth] ✅ Username updated:', newName);
    } catch (error: any) {
      console.error('[Auth] Update username error:', error);
      throw new Error(error.message);
    }
  };

  const updateUserProfileDoc = async (updates: { carModel?: string, carYear?: string }) => {
    if (!user) throw new Error("No user logged in");
    try {
      await updateDoc(doc(db, 'users', user.uid), updates);
      if (profile) {
        setProfile({ ...profile, ...updates });
      }
    } catch (error: any) {
      console.error("[Auth] Update profile error:", error);
      throw new Error(error.message);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', user.uid), { avatarURI: downloadURL });
      
      try {
        const leaderboardRef = doc(db, 'leaderboards', user.uid);
        await setDoc(leaderboardRef, { avatarURI: downloadURL }, { merge: true });
        console.log('[Auth] ✅ Updated leaderboard entry');
      } catch (leaderboardError) {
        console.log('[Auth] No leaderboard entry to update');
      }
      
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
      
      if (profile) {
        const updatedGarage = [...(profile.garage || []), newCar];
        setProfile({ ...profile, garage: updatedGarage });
      }
      
      await setDoc(newCarRef, {
        ...car,
        isActive: isFirstCar,
        createdAt: Date.now(),
      });
      
    } catch (error: any) {
      console.error('[Auth] Add car error:', error);
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
      if (profile) {
        const updatedGarage = profile.garage?.map(car => 
          car.id === carId ? { ...car, ...updates } : car
        ) || [];
        setProfile({ ...profile, garage: updatedGarage });
      }
      
      await updateDoc(doc(db, 'users', user.uid, 'garage', carId), updates);
      
    } catch (error: any) {
      console.error('[Auth] Update car error:', error);
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
      
      await deleteDoc(doc(db, 'users', user.uid, 'garage', carId));
      console.log('[Auth] ✅ Firebase delete successful');
      
      if (profile && profile.garage) {
        const updatedGarage = profile.garage.filter(car => car.id !== carId);
        console.log('[Auth] Updated garage count:', updatedGarage.length);
        setProfile({ ...profile, garage: updatedGarage });
        console.log('[Auth] ✅ Profile updated with new garage');
      }
      
      console.log('[Auth] ======= CAR DELETION COMPLETE =======');
      
    } catch (error: any) {
      console.error('[Auth] ❌ Delete car error:', error);
      
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
      if (profile) {
        const updatedGarage = profile.garage?.map(car => ({
          ...car,
          isActive: car.id === carId,
        })) || [];
        setProfile({ ...profile, garage: updatedGarage });
      }
      
      const garageRef = collection(db, 'users', user.uid, 'garage');
      const garageSnap = await getDocs(garageRef);
      
      const batch = [];
      for (const carDoc of garageSnap.docs) {
        batch.push(
          updateDoc(carDoc.ref, { isActive: carDoc.id === carId })
        );
      }
      
      await Promise.all(batch);
      
    } catch (error: any) {
      console.error('[Auth] Set active car error:', error);
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

  const updateUserState = async (stateCode: string): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      console.log('[Auth] Updating user state to:', stateCode);
      
      await updateDoc(doc(db, 'users', user.uid), {
        state: stateCode,
      });
      
      if (profile) {
        setProfile({ ...profile, state: stateCode });
      }
      
      console.log('[Auth] ✅ User state updated');
    } catch (error: any) {
      console.error('[Auth] Error updating state:', error);
      throw new Error(error.message);
    }
  };

  const createCrew = async (name: string, description: string): Promise<string> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      console.log('[Auth] ======= CREATING CREW =======');
      
      const crewCode = generateCrewCode();
      const crewRef = doc(collection(db, 'crews'));
      
      const crewData = {
        name,
        description,
        code: crewCode,
        adminId: user.uid,
        memberIds: [user.uid],
        createdAt: Date.now(),
      };
      
      await setDoc(crewRef, crewData);
      
      await updateDoc(doc(db, 'users', user.uid), {
        crewIds: arrayUnion(crewRef.id),
      });
      
      if (profile) {
        const updatedCrewIds = [...(profile.crewIds || []), crewRef.id];
        setProfile({
          ...profile,
          crewIds: updatedCrewIds,
        });
      }
      
      console.log('[Auth] ======= CREW CREATED SUCCESSFULLY =======');
      
      return crewCode;
    } catch (error: any) {
      console.error('[Auth] ❌ Create crew error:', error);
      throw new Error(error.message || 'Failed to create crew');
    }
  };

  const joinCrew = async (crewCode: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const crewsQuery = query(collection(db, 'crews'), where('code', '==', crewCode.toUpperCase()));
      const crewsSnap = await getDocs(crewsQuery);
      
      if (crewsSnap.empty) {
        throw new Error('Crew not found. Please check the code and try again.');
      }
      
      const crewDoc = crewsSnap.docs[0];
      const crewData = crewDoc.data();
      
      if (crewData.memberIds.includes(user.uid)) {
        throw new Error('You are already a member of this crew.');
      }
      
      await updateDoc(crewDoc.ref, {
        memberIds: arrayUnion(user.uid),
      });
      
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
      
      if (crewData.adminId === user.uid) {
        const otherMembers = crewData.memberIds.filter((id: string) => id !== user.uid);
        
        if (otherMembers.length > 0) {
          await updateDoc(crewRef, {
            adminId: otherMembers[0],
            memberIds: arrayRemove(user.uid),
          });
        } else {
          await deleteDoc(crewRef);
        }
      } else {
        await updateDoc(crewRef, {
          memberIds: arrayRemove(user.uid),
        });
      }
      
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
      const usersQuery = query(collection(db, 'users'), where('friendId', '==', memberFriendId));
      const usersSnap = await getDocs(usersQuery);
      
      if (usersSnap.empty) {
        throw new Error('User not found');
      }
      
      const memberDoc = usersSnap.docs[0];
      const memberId = memberDoc.id;
      
      await updateDoc(doc(db, 'crews', crewId), {
        memberIds: arrayUnion(memberId),
      });
      
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

  const deleteAccount = async () => {
    if (!user) throw new Error("No user logged in");
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Compat syntax
      await user.delete();
      
      setUser(null);
      setProfile(null);
    } catch (error: any) {
      console.error("[Auth] Delete account error:", error);
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('This is a sensitive action. Please log out and log back in to delete your account.');
      }
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        initializing: loading,
        signIn,
        signUp,
        signOut: signOutUser,
        resetPassword,
        updateUsername,
        updateUserProfileDoc,
        uploadAvatar,
        updateUserState,
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
        deleteAccount,
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