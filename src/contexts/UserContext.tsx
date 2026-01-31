import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  id: string;
  type: 'admin';
  data: null;
}

interface UserContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  adminLogin: (username: string, password: string) => boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const checkAdminSession = () => {
    setIsLoading(true);
    try {
      const userId = localStorage.getItem('currentUserId');

      if (userId === 'admin') {
        const adminProfile: UserProfile = {
          id: 'admin',
          type: 'admin',
          data: null,
        };
        setUserProfile(adminProfile);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
      setIsAuthenticated(false);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = (username: string, password: string): boolean => {
    // Simple admin credentials - in production this would be more secure
    if (username === 'admin' && password === 'admin123') {
      const adminProfile: UserProfile = {
        id: 'admin',
        type: 'admin',
        data: null,
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
    checkAdminSession();
  }, []);

  const value: UserContextType = {
    isLoading,
    isAuthenticated,
    userProfile,
    adminLogin,
    logout,
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
