import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  deleteUser,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Car {
  id: string;
  nickname: string;
  make: string;
  model: string;
  year: string;
  color: string;
  upgrades?: string;
  isActive: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  carModel: string;
  carYear: string;
  avatarURI: string | null;
  premium: boolean;
  createdAt: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  garage: Car[];
  loading: boolean;
  initializing: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string>;
  addCar: (car: Omit<Car, 'id' | 'isActive'>) => Promise<void>;
  setActiveCar: (carId: string) => Promise<void>;
  deleteCar: (carId: string) => Promise<void>;
  loadGarage: () => Promise<void>;
  getActiveCar: () => Car | null;
  upgradeToPremium: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [garage, setGarage] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await loadUserProfile(firebaseUser.uid);
        await loadGarage();
      } else {
        setProfile(null);
        setGarage([]);
      }
      
      setLoading(false);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const loadUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error('[Auth] Error loading profile:', error);
    }
  };

  const loadGarage = async () => {
    if (!user) return;
    
    try {
      const garageRef = collection(db, 'users', user.uid, 'garage');
      const snapshot = await getDocs(garageRef);
      const cars: Car[] = [];
      
      snapshot.forEach(doc => {
        cars.push({ id: doc.id, ...doc.data() } as Car);
      });
      
      setGarage(cars);
      console.log(`[Auth] Loaded ${cars.length} cars from garage`);
    } catch (error) {
      console.error('[Auth] Error loading garage:', error);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      const newProfile: UserProfile = {
        uid,
        email,
        displayName,
        carModel: '',
        carYear: '',
        avatarURI: null,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'users', uid), newProfile);
      setProfile(newProfile);
      
      console.log('[Auth] User created:', uid);
    } catch (error: any) {
      console.error('[Auth] Sign up error:', error);
      throw new Error(error.message);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('[Auth] User signed in');
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.multiRemove(['@apexbox_auth', '@apexbox_profile']);
      setProfile(null);
      setGarage([]);
      console.log('[Auth] User logged out');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('[Auth] Password reset email sent');
    } catch (error: any) {
      console.error('[Auth] Reset password error:', error);
      throw new Error(error.message);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) {
      throw new Error('No user logged in');
    }

    try {
      const updatedProfile = { ...profile, ...updates };
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setProfile(updatedProfile);
      console.log('[Auth] Profile updated');
    } catch (error) {
      console.error('[Auth] Update profile error:', error);
      throw error;
    }
  };

  const updateUsername = async (newUsername: string) => {
    if (!user || !profile) {
      throw new Error('No user logged in');
    }

    try {
      // Update Firebase Auth displayName
      await updateFirebaseProfile(user, { displayName: newUsername });

      // Update Firestore profile
      const updatedProfile = { ...profile, displayName: newUsername };
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      
      // Update local state immediately
      setProfile(updatedProfile);
      
      console.log('[Auth] Username updated:', newUsername);
    } catch (error) {
      console.error('[Auth] Update username error:', error);
      throw error;
    }
  };

  const uploadAvatar = async (uri: string): Promise<string> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('[Auth] Avatar uploaded:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('[Auth] Upload avatar error:', error);
      throw error;
    }
  };

  const addCar = async (car: Omit<Car, 'id' | 'isActive'>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // If this is the first car, make it active
      const isActive = garage.length === 0;

      const garageRef = collection(db, 'users', user.uid, 'garage');
      const newCar = { ...car, isActive };
      
      await addDoc(garageRef, newCar);
      await loadGarage();
      
      console.log('[Auth] Car added to garage');
    } catch (error) {
      console.error('[Auth] Add car error:', error);
      throw error;
    }
  };

  const setActiveCar = async (carId: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Deactivate all cars
      for (const car of garage) {
        const carRef = doc(db, 'users', user.uid, 'garage', car.id);
        await updateDoc(carRef, { isActive: false });
      }

      // Activate selected car
      const carRef = doc(db, 'users', user.uid, 'garage', carId);
      await updateDoc(carRef, { isActive: true });

      await loadGarage();
      console.log('[Auth] Active car switched');
    } catch (error) {
      console.error('[Auth] Set active car error:', error);
      throw error;
    }
  };

  const deleteCar = async (carId: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const carRef = doc(db, 'users', user.uid, 'garage', carId);
      await deleteDoc(carRef);
      
      await loadGarage();
      console.log('[Auth] Car deleted from garage');
    } catch (error) {
      console.error('[Auth] Delete car error:', error);
      throw error;
    }
  };

  const getActiveCar = (): Car | null => {
    return garage.find(car => car.isActive) || null;
  };

  const deleteAccount = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Delete garage
      const garageRef = collection(db, 'users', user.uid, 'garage');
      const snapshot = await getDocs(garageRef);
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Delete Firestore document
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Delete auth account
      await deleteUser(user);
      
      // Clear local storage
      await AsyncStorage.multiRemove(['@apexbox_auth', '@apexbox_profile']);
      
      console.log('[Auth] Account deleted');
    } catch (error) {
      console.error('[Auth] Delete account error:', error);
      throw error;
    }
  };

  const upgradeToPremium = async () => {
    if (!user || !profile) {
      throw new Error('No user logged in');
    }

    try {
      const updatedProfile = { ...profile, premium: true };
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setProfile(updatedProfile);
      console.log('[Auth] User upgraded to premium');
    } catch (error) {
      console.error('[Auth] Upgrade to premium error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        garage,
        loading,
        initializing,
        signUp,
        signIn,
        logout,
        resetPassword,
        updateProfile,
        updateUsername,
        deleteAccount,
        uploadAvatar,
        addCar,
        setActiveCar,
        deleteCar,
        loadGarage,
        getActiveCar,
        upgradeToPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
