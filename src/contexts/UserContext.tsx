import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type MenteeRow = Database['public']['Tables']['mentees']['Row'];
type MentorRow = Database['public']['Tables']['mentors']['Row'];

export interface UserProfile {
  id: string;
  type: 'mentee' | 'mentor' | 'admin';
  data: MenteeRow | MentorRow | null;
  cohortId: string;
}

interface UserContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  checkUserProfile: (userId: string) => Promise<void>;
  adminLogin: (username: string, password: string) => boolean;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // For now, we'll use a simple approach - check localStorage for a user session
  // In a real app, this would integrate with Supabase Auth
  const getCurrentUserId = (): string | null => {
    return localStorage.getItem('currentUserId');
  };

  const setCurrentUserId = (userId: string) => {
    localStorage.setItem('currentUserId', userId);
  };

  const checkUserProfile = async (userId?: string) => {
    setIsLoading(true);
    try {
      const userIdToCheck = userId || getCurrentUserId();

      if (!userIdToCheck) {
        setIsAuthenticated(false);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }

      // Check for admin session
      if (userIdToCheck === 'admin') {
        const adminProfile: UserProfile = {
          id: 'admin',
          type: 'admin',
          data: null,
          cohortId: 'admin'
        };
        setUserProfile(adminProfile);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Check if user exists as mentee
      const { data: menteeData } = await supabase
        .from('mentees')
        .select('*')
        .eq('mentee_id', userIdToCheck)
        .single();

      if (menteeData) {
        setUserProfile({
          id: userIdToCheck,
          type: 'mentee',
          data: menteeData,
          cohortId: menteeData.cohort_id
        });
        setIsAuthenticated(true);
        setCurrentUserId(userIdToCheck);
        setIsLoading(false);
        return;
      }

      // Check if user exists as mentor
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('*')
        .eq('mentor_id', userIdToCheck)
        .single();

      if (mentorData) {
        setUserProfile({
          id: userIdToCheck,
          type: 'mentor',
          data: mentorData,
          cohortId: mentorData.cohort_id
        });
        setIsAuthenticated(true);
        setCurrentUserId(userIdToCheck);
        setIsLoading(false);
        return;
      }

      // User not found in either table
      setIsAuthenticated(false);
      setUserProfile(null);
    } catch (error) {
      console.error('Error checking user profile:', error);
      setIsAuthenticated(false);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (userProfile) {
      await checkUserProfile(userProfile.id);
    }
  };

  const adminLogin = (username: string, password: string): boolean => {
    // Simple admin credentials - in production this would be more secure
    if (username === 'admin' && password === 'admin123') {
      const adminProfile: UserProfile = {
        id: 'admin',
        type: 'admin',
        data: null,
        cohortId: 'admin'
      };

      setUserProfile(adminProfile);
      setIsAuthenticated(true);
      localStorage.setItem('currentUserId', 'admin');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('currentUserId');
    setIsAuthenticated(false);
    setUserProfile(null);
  };

  // Check for existing session on mount
  useEffect(() => {
    checkUserProfile();
  }, []);

  const value: UserContextType = {
    isLoading,
    isAuthenticated,
    userProfile,
    checkUserProfile,
    adminLogin,
    logout,
    refreshProfile
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Helper function for signup completion - to be called after successful signup
export async function createUserSession(userId: string): Promise<void> {
  localStorage.setItem('currentUserId', userId);
}