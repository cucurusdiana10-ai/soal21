import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Initial session check
    supabase?.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        logout();
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        logout();
      } else if (event === 'SIGNED_IN' && session) {
        // Only fetch if we don't have the user state yet to avoid duplicate calls on login
        if (!user) {
          const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          if (data) {
            login(data);
          }
        }
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    
    // Only call signOut if we actually have a session to avoid infinite loops
    supabase?.auth.getSession().then(({ data }) => {
      if (data?.session) {
        supabase.auth.signOut().catch(() => {});
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
