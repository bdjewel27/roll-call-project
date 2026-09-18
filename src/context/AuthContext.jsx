import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ROLES } from '../constants/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch profile info from 'profiles' table for Supabase user
  const fetchProfile = async (authUser) => {
    if (!authUser) return null;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[RollCall Auth] Error fetching profile:', error.message);
      }

      return {
        id: authUser.id,
        email: authUser.email,
        role: profile?.role || authUser.user_metadata?.role || ROLES.TEACHER,
        fullName: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      };
    } catch (err) {
      console.warn('[RollCall Auth] Profile lookup exception:', err);
      return {
        id: authUser.id,
        email: authUser.email,
        role: authUser.user_metadata?.role || ROLES.TEACHER,
        fullName: authUser.user_metadata?.full_name || 'User',
      };
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const fullUser = await fetchProfile(session.user);
        if (mounted) setUser(fullUser);
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setLoading(false);
    });

    // 2. Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const fullUser = await fetchProfile(session.user);
        if (mounted) setUser(fullUser);
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Pure Supabase Auth sign-in with email & password
  const login = async (_role = ROLES.ADMIN, email = '', password = '') => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    const fullUser = await fetchProfile(data.user);
    setUser(fullUser);
    setLoading(false);
    return fullUser;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setUser(null);
  };

  const value = {
    user,
    role: user?.role || null,
    isAdmin: user?.role === ROLES.ADMIN,
    isTeacher: user?.role === ROLES.TEACHER,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
