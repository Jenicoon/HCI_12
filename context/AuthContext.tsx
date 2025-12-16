import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import type { MemberAccount, UserAccount, UserProfile, UserRole } from '../types';
import { firebaseAuth, firestore } from '../services/firebase';

interface LoginPayload {
  email: string;
  password: string;
  role: UserRole;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  businessName?: string;
}

interface AuthContextValue {
  currentUser: UserAccount | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateMemberProfile: (profile: UserProfile | null) => Promise<void>;
}

interface UserDocument {
  role: UserRole;
  name: string;
  email: string;
  createdAt: string;
  phone?: string;
  businessName?: string;
  profile?: UserProfile | null;
}

const USERS_COLLECTION = 'users';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapUserDocumentToAccount = (uid: string, data: UserDocument): UserAccount => {
  if (data.role === 'owner') {
    return {
      id: uid,
      role: 'owner',
      name: data.name,
      email: data.email,
      createdAt: data.createdAt,
      phone: data.phone,
      businessName: data.businessName,
    };
  }
  return {
    id: uid,
    role: 'member',
    name: data.name,
    email: data.email,
    createdAt: data.createdAt,
    profile: data.profile ?? null,
  } satisfies MemberAccount;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, firebaseUser => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!firebaseUser) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const docRef = doc(firestore, USERS_COLLECTION, firebaseUser.uid);
      unsubscribeUserDoc = onSnapshot(
        docRef,
        async snapshot => {
          if (!snapshot.exists()) {
            const fallbackDoc: UserDocument = {
              role: 'member',
              name: (firebaseUser.displayName ?? firebaseUser.email ?? 'Member').trim() || 'Member',
              email: (firebaseUser.email ?? '').trim(),
              createdAt: new Date().toISOString(),
              profile: null,
            };

            try {
              await setDoc(docRef, { ...fallbackDoc });
              setCurrentUser(mapUserDocumentToAccount(firebaseUser.uid, fallbackDoc));
            } catch (error) {
              console.error('Failed to initialize user document:', error);
              setCurrentUser(null);
            } finally {
              setLoading(false);
            }
            return;
          }

          try {
            const data = snapshot.data() as UserDocument;
            const createdAt = snapshot.get('createdAt');
            const createdAtIso = typeof createdAt === 'string' ? createdAt : new Date().toISOString();
            const normalizedData: UserDocument = {
              ...data,
              createdAt: createdAtIso,
            };

            setCurrentUser(mapUserDocumentToAccount(firebaseUser.uid, normalizedData));
          } catch (error) {
            console.error('Failed to map user document:', error);
            setCurrentUser(null);
          } finally {
            setLoading(false);
          }
        },
        error => {
          console.error('Failed to subscribe to user document:', error);
          setCurrentUser(null);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
      unsubscribeAuth();
    };
  }, []);

  const login = useCallback(async ({ email, password, role }: LoginPayload) => {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const docRef = doc(firestore, USERS_COLLECTION, credential.user.uid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      const timestampIso = new Date().toISOString();
      const derivedName = (credential.user.displayName ?? email.split('@')[0] ?? '').trim() || '사용자';
      const normalizedEmail = (credential.user.email ?? email).trim();

      if (role === 'owner') {
        const ownerDocument: UserDocument = {
          role: 'owner',
          name: derivedName,
          email: normalizedEmail,
          createdAt: timestampIso,
        };
        const phoneNumber = credential.user.phoneNumber?.trim();
        if (phoneNumber) {
          ownerDocument.phone = phoneNumber;
        }
        await setDoc(docRef, ownerDocument);
      } else {
        const memberDocument: UserDocument = {
          role: 'member',
          name: derivedName,
          email: normalizedEmail,
          createdAt: timestampIso,
          profile: null,
        } satisfies UserDocument;
        await setDoc(docRef, memberDocument);
      }
      return;
    }

    const userData = snapshot.data() as UserDocument;
    if (userData.role !== role) {
      await signOut(firebaseAuth);
      const message =
        userData.role === 'owner'
          ? '이 계정은 헬스장(오너) 계정입니다. 로그인 유형에서 Gym Owner를 선택해 주세요.'
          : '이 계정은 회원 계정입니다. 로그인 유형에서 Member를 선택해 주세요.';
      throw new Error(message);
    }
  }, []);

  const signup = useCallback(
    async ({ name, email, password, role, phone, businessName }: SignupPayload) => {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (firebaseAuth.currentUser) {
        try {
          await updateProfile(firebaseAuth.currentUser, { displayName: name.trim() });
        } catch (error) {
          console.warn('프로필 표시 이름 업데이트 실패:', error);
        }
      }

      const docRef = doc(firestore, USERS_COLLECTION, credential.user.uid);
      const timestampIso = new Date().toISOString();
      const baseDocument: UserDocument = {
        role,
        name: name.trim(),
        email: email.trim(),
        createdAt: timestampIso,
      };

      if (role === 'owner') {
        baseDocument.phone = phone?.trim();
        baseDocument.businessName = businessName?.trim();
      } else {
        baseDocument.profile = null;
      }

      await setDoc(docRef, {
        ...baseDocument,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut(firebaseAuth);
  }, []);

  const updateMemberProfile = useCallback(
    async (profile: UserProfile | null) => {
      if (!currentUser || currentUser.role !== 'member') {
        return;
      }
      const docRef = doc(firestore, USERS_COLLECTION, currentUser.id);
      await updateDoc(docRef, { profile });
      setCurrentUser(prev => {
        if (!prev || prev.role !== 'member') {
          return prev;
        }
        const member = prev as MemberAccount;
        return { ...member, profile };
      });
    },
    [currentUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, loading, login, signup, logout, updateMemberProfile }),
    [currentUser, loading, login, signup, logout, updateMemberProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
