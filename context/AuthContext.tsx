import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { MemberAccount, UserAccount, UserProfile, UserRole } from '../types';

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
  users: UserAccount[];
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  updateMemberProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'fitness-auth-state';

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

interface PersistedAuthState {
  users: UserAccount[];
  currentUserId: string | null;
}

const loadInitialState = (): PersistedAuthState => {
  if (typeof window === 'undefined') {
    return { users: [], currentUserId: null };
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { users: [], currentUserId: null };
    }
    const parsed = JSON.parse(stored) as PersistedAuthState;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      currentUserId: parsed.currentUserId ?? null,
    };
  } catch (error) {
    console.warn('Failed to parse auth state from storage:', error);
    return { users: [], currentUserId: null };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = loadInitialState();
  const [users, setUsers] = useState<UserAccount[]>(initial.users);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initial.currentUserId);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: PersistedAuthState = { users, currentUserId };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist auth state:', error);
    }
  }, [users, currentUserId]);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return users.find(user => user.id === currentUserId) ?? null;
  }, [users, currentUserId]);

  const login = useCallback(async ({ email, password, role }: LoginPayload) => {
    const account = users.find(user => user.email.toLowerCase() === email.toLowerCase() && user.role === role);
    if (!account) {
      throw new Error('No account found for this role and email. Please sign up first.');
    }
    if (account.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }
    setCurrentUserId(account.id);
  }, [users]);

  const signup = useCallback(async ({ name, email, password, role, phone, businessName }: SignupPayload) => {
    if (!name.trim()) {
      throw new Error('Please provide a name.');
    }
    const exists = users.some(user => user.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }

    const id = createId();
    const timestamp = new Date().toISOString();

    const newAccount: UserAccount =
      role === 'owner'
        ? {
            id,
            role,
            name: name.trim(),
            email: email.trim(),
            password,
            createdAt: timestamp,
            phone: phone?.trim(),
            businessName: businessName?.trim(),
          }
        : {
            id,
            role,
            name: name.trim(),
            email: email.trim(),
            password,
            createdAt: timestamp,
            profile: null,
          };

    setUsers(prev => [...prev, newAccount]);
    setCurrentUserId(id);
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUserId(null);
  }, []);

  const updateMemberProfile = useCallback((profile: UserProfile | null) => {
    setUsers(prev =>
      prev.map(user => {
        if (user.id !== currentUserId || user.role !== 'member') {
          return user;
        }
        const member = user as MemberAccount;
        return { ...member, profile };
      })
    );
  }, [currentUserId]);

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, users, login, signup, logout, updateMemberProfile }),
    [currentUser, users, login, signup, logout, updateMemberProfile]
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
