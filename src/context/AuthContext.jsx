import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { ROLES } from '../constants/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isLoggingInRef = useRef(false);

  const normalizeRole = (role) => {
    if (!role || typeof role !== 'string') return null;
    const lower = role.trim().toLowerCase();
    if (lower === ROLES.ADMIN || lower === ROLES.TEACHER) {
      return lower;
    }
    return null;
  };

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

      const role =
        normalizeRole(profile?.role) ||
        normalizeRole(authUser.user_metadata?.role) ||
        null;

      return {
        id: authUser.id,
        email: authUser.email,
        role,
        fullName: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      };
    } catch (err) {
      console.warn('[RollCall Auth] Profile lookup exception:', err);
      const role = normalizeRole(authUser.user_metadata?.role) || null;
      return {
        id: authUser.id,
        email: authUser.email,
        role,
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (isLoggingInRef.current && event === 'SIGNED_IN') {
        // Skip duplicate profile fetch and race condition; login() is actively handling it
        return;
      }
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
  const login = async (email = '', password = '') => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    isLoggingInRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const fullUser = await fetchProfile(data.user);
      setUser(fullUser);
      return fullUser;
    } finally {
      setLoading(false);
      isLoggingInRef.current = false;
    }
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
