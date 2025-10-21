import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  carModel: string;
  carYear: string;
  avatarURI: string | null;
  createdAt: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Load user profile from Firestore
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
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error('[Auth] Error loading profile:', error);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // Create user profile in Firestore
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

  const deleteAccount = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        logout,
        resetPassword,
        updateProfile,
        deleteAccount,
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
