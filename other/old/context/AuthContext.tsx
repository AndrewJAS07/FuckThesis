import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signIn, signUp, signOut } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// Define user types
export type UserType = 'commuter' | 'driver' | null;

export interface AuthUser {
  id: string;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  userType: UserType;
}

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  setUserType: (type: UserType) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<UserType>(null);

  useEffect(() => {
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setLoading(false);
        
        if (session?.user) {
          // Fetch user profile from auth.users or your custom profiles table
          const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            phoneNumber: userData?.phone_number || '',
            firstName: userData?.first_name || '',
            lastName: userData?.last_name || '',
            userType: (userData?.user_type as UserType) || null,
          });
        } else {
          setUser(null);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Set up userType in context
  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
    setUserType: (type: UserType) => setUserType(type),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Create hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}