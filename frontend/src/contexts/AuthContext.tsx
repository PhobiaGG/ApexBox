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

  const signOut = async () => {
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
      await updateProfile(user, { displayName: newName });
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName });
      
      if (profile) {
        setProfile({ ...profile, displayName: newName });
      }
    } catch (error: any) {
      console.error('[Auth] Update username error:', error);
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
      
      if (profile) {
        setProfile({ ...profile, avatarURI: downloadURL });
      }
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
      await setDoc(newCarRef, {
        ...car,
        isActive: isFirstCar,
        createdAt: Date.now(),
      });
      
      if (profile) {
        const updatedGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: updatedGarage });
      }
    } catch (error: any) {
      console.error('[Auth] Add car error:', error);
      throw new Error(error.message);
    }
  };

  const updateCar = async (carId: string, updates: Partial<CarData>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await updateDoc(doc(db, 'users', user.uid, 'garage', carId), updates);
      
      if (profile) {
        const updatedGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: updatedGarage });
      }
    } catch (error: any) {
      console.error('[Auth] Update car error:', error);
      throw new Error(error.message);
    }
  };

  const deleteCar = async (carId: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'garage', carId));
      
      if (profile) {
        const updatedGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: updatedGarage });
      }
    } catch (error: any) {
      console.error('[Auth] Delete car error:', error);
      throw new Error(error.message);
    }
  };

  const setActiveCar = async (carId: string) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const garageRef = collection(db, 'users', user.uid, 'garage');
      const garageSnap = await getDocs(garageRef);
      
      const batch = [];
      for (const carDoc of garageSnap.docs) {
        batch.push(
          updateDoc(carDoc.ref, { isActive: carDoc.id === carId })
        );
      }
      
      await Promise.all(batch);
      
      if (profile) {
        const updatedGarage = await loadGarage(user.uid);
        setProfile({ ...profile, garage: updatedGarage });
      }
    } catch (error: any) {
      console.error('[Auth] Set active car error:', error);
      throw new Error(error.message);
    }
  };

  const getActiveCar = (): CarData | null => {
    if (!profile?.garage) return null;
    return profile.garage.find(car => car.isActive) || null;
  };

  // CREW FUNCTIONS
  const createCrew = async (name: string, description: string): Promise<string> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const crewCode = generateCrewCode();
      const crewRef = doc(collection(db, 'crews'));
      
      await setDoc(crewRef, {
        name,
        description,
        code: crewCode,
        adminId: user.uid,
        memberIds: [user.uid],
        createdAt: Date.now(),
      });
      
      // Add crew to user's crewIds
      await updateDoc(doc(db, 'users', user.uid), {
        crewIds: arrayUnion(crewRef.id),
      });
      
      if (profile) {
        setProfile({
          ...profile,
          crewIds: [...(profile.crewIds || []), crewRef.id],
        });
      }
      
      return crewCode;
    } catch (error: any) {
      console.error('[Auth] Create crew error:', error);
      throw new Error('Failed to create crew');
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        signup,
        logout,
        resetPassword,
        updateUsername,
        uploadAvatar,
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
