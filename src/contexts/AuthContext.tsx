import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToAuthState,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  resetUserPassword,
} from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<User>;
  signUp: (email: string, pass: string, name?: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user: User | null) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    return loginWithEmail(email, pass);
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    return registerWithEmail(email, pass, name);
  };

  const signOut = async () => {
    await logoutUser();
  };

  const resetPassword = async (email: string) => {
    await resetUserPassword(email);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé au sein d’un AuthProvider');
  }
  return context;
}
