import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { ROLES } from '../constants/roles';
import { invalidateCache } from '../services/dataService';

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

      const role = normalizeRole(profile?.role);

      // If user exists in Auth but has no profile or valid role in profiles table:
      // immediately reject login, sign out, and invalidate auth session
      if (!profile || !role) {
        console.warn('[RollCall Auth] Unauthorized login: No profile found for user', authUser.id);
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('[RollCall Auth] Sign out error during profile rejection:', e);
        }
        invalidateCache();
        return null;
      }

      return {
        id: authUser.id,
        email: authUser.email,
        role,
        fullName: profile.full_name || authUser.email?.split('@')[0] || 'User',
      };
    } catch (err) {
      console.warn('[RollCall Auth] Profile lookup exception:', err);
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[RollCall Auth] Sign out error:', e);
      }
      invalidateCache();
      return null;
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
      if (isLoggingInRef.current) {
        // Skip all auth state changes while login() is actively verifying role
        return;
      }
      if (session?.user) {
        const fullUser = await fetchProfile(session.user);
        if (mounted) setUser(fullUser);
      } else {
        invalidateCache();
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
  const login = async (selectedRole, email = '', password = '') => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    if (!selectedRole) {
      throw new Error('Selected role is required for login.');
    }

    invalidateCache();
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

      if (!data?.user) {
        throw new Error('Login failed: No user returned.');
      }

      // Fetch the user's role from the profiles table using the user's ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const profileRole = profile?.role?.toLowerCase() || '';
      const uiRole = selectedRole.toLowerCase();

      if (uiRole !== profileRole) {
        await supabase.auth.signOut();
        setUser(null);
        throw new Error(`Role mismatch: This account is registered as a ${profileRole || 'unknown role'}, not an ${uiRole}.`);
      }

      // If roles match, proceed to fetch the full profile and set user
      const fullUser = await fetchProfile(data.user);
      if (!fullUser) {
        throw new Error('Unauthorized account: No active profile record found.');
      }

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
    } finally {
      invalidateCache();
      setUser(null);
    }
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

// oxlint-disable-next-line react/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
