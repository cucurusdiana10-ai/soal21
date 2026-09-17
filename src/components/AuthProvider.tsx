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
    supabase?.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const saved = localStorage.getItem('auth_user');
        if (!saved) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .or(`id.eq.${session.user.id},username.eq.${session.user.email?.split('@')[0]}`)
            .limit(1)
            .maybeSingle();
          if (data) {
            login(data);
          }
        }
      } else {
        // If no active Supabase Auth session, check if we have a valid database user in localStorage
        const saved = localStorage.getItem('auth_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed?.id) {
              // Verify user is still active in database
              const { data: verified } = await supabase
                .from('users')
                .select('*')
                .eq('id', parsed.id)
                .maybeSingle();
              if (verified && verified.status === 'active') {
                setUser(verified);
              } else if (verified && verified.status !== 'active') {
                setUser(null);
                localStorage.removeItem('auth_user');
              }
            }
          } catch {
            setUser(null);
            localStorage.removeItem('auth_user');
          }
        }
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('auth_user');
      } else if (event === 'SIGNED_IN' && session?.user) {
        const saved = localStorage.getItem('auth_user');
        if (!saved) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .or(`id.eq.${session.user.id},username.eq.${session.user.email?.split('@')[0]}`)
            .limit(1)
            .maybeSingle();
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
    try {
      await supabase?.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
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
