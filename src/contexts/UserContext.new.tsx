import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  getUserProfile,
  getUserByEmail,
  getUserProgramParticipation,
  userHasRole,
  type UserProfile as UserProfileType,
  type ProgramParticipation
} from '@/lib/userProfileService'

// Extended user profile with program participation
export interface UserProfile extends UserProfileType {
  programs: ProgramParticipation[]
  roles: string[] // All active roles across programs
}

interface UserContextType {
  isLoading: boolean
  isAuthenticated: boolean
  userProfile: UserProfile | null
  isAdmin: boolean
  isMentee: boolean
  isMentor: boolean
  isHost: boolean
  checkUserProfile: (userId: string) => Promise<void>
  checkUserByEmail: (email: string) => Promise<void>
  getUserRole: (programType?: string) => string | null
  adminLogin: (username: string, password: string) => boolean
  logout: () => void
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // Get current user ID from localStorage (simple auth for now)
  const getCurrentUserId = (): string | null => {
    return localStorage.getItem('currentUserId')
  }

  const setCurrentUserId = (userId: string) => {
    localStorage.setItem('currentUserId', userId)
  }

  /**
   * Check user profile by user ID
   */
  const checkUserProfile = async (userId?: string) => {
    setIsLoading(true)
    try {
      const userIdToCheck = userId || getCurrentUserId()

      if (!userIdToCheck) {
        setIsAuthenticated(false)
        setUserProfile(null)
        setIsLoading(false)
        return
      }

      // Check for admin session
      if (userIdToCheck === 'admin') {
        const adminProfile: UserProfile = {
          id: 'admin',
          email: 'admin@skillpoint.com',
          full_name: 'Admin User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          programs: [],
          roles: ['admin'],
        }
        setUserProfile(adminProfile)
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }

      // Get user profile from new user_profiles table
      const profile = await getUserProfile(userIdToCheck)

      if (!profile) {
        setIsAuthenticated(false)
        setUserProfile(null)
        setIsLoading(false)
        return
      }

      // Get user's program participation
      const programs = await getUserProgramParticipation(userIdToCheck)

      // Extract unique roles
      const roles = Array.from(new Set(programs.map((p) => p.role_in_program)))

      // Create extended profile
      const extendedProfile: UserProfile = {
        ...profile,
        programs,
        roles,
      }

      setUserProfile(extendedProfile)
      setIsAuthenticated(true)
      setCurrentUserId(userIdToCheck)
    } catch (error) {
      console.error('Error checking user profile:', error)
      setIsAuthenticated(false)
      setUserProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Check user profile by email
   */
  const checkUserByEmail = async (email: string) => {
    setIsLoading(true)
    try {
      const profile = await getUserByEmail(email)

      if (!profile) {
        setIsAuthenticated(false)
        setUserProfile(null)
        setIsLoading(false)
        return
      }

      // Get user's program participation
      const programs = await getUserProgramParticipation(profile.id)

      // Extract unique roles
      const roles = Array.from(new Set(programs.map((p) => p.role_in_program)))

      // Create extended profile
      const extendedProfile: UserProfile = {
        ...profile,
        programs,
        roles,
      }

      setUserProfile(extendedProfile)
      setIsAuthenticated(true)
      setCurrentUserId(profile.id)
    } catch (error) {
      console.error('Error checking user by email:', error)
      setIsAuthenticated(false)
      setUserProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get user's role in a specific program type
   */
  const getUserRole = (programType?: string): string | null => {
    if (!userProfile || userProfile.programs.length === 0) {
      return null
    }

    if (programType) {
      // Find role in specific program type
      const programParticipation = userProfile.programs.find(
        (p) => p.program_type === programType
      )
      return programParticipation?.role_in_program || null
    }

    // Return first active role if no program type specified
    return userProfile.roles[0] || null
  }

  /**
   * Refresh current user profile
   */
  const refreshProfile = async () => {
    if (userProfile) {
      await checkUserProfile(userProfile.id)
    }
  }

  /**
   * Admin login
   */
  const adminLogin = (username: string, password: string): boolean => {
    // Simple admin credentials - in production this would be more secure
    if (username === 'admin' && password === 'admin123') {
      const adminProfile: UserProfile = {
        id: 'admin',
        email: 'admin@skillpoint.com',
        full_name: 'Admin User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        programs: [],
        roles: ['admin'],
      }

      setUserProfile(adminProfile)
      setIsAuthenticated(true)
      localStorage.setItem('currentUserId', 'admin')
      return true
    }
    return false
  }

  /**
   * Logout
   */
  const logout = () => {
    localStorage.removeItem('currentUserId')
    setIsAuthenticated(false)
    setUserProfile(null)
  }

  // Check for existing session on mount
  useEffect(() => {
    checkUserProfile()
  }, [])

  // Computed boolean helpers
  const isAdmin = userProfile?.id === 'admin' || userProfile?.roles.includes('admin') || false
  const isMentee = userProfile?.roles.includes('mentee') || false
  const isMentor = userProfile?.roles.includes('mentor') || false
  const isHost = userProfile?.roles.includes('host') || false

  const value: UserContextType = {
    isLoading,
    isAuthenticated,
    userProfile,
    isAdmin,
    isMentee,
    isMentor,
    isHost,
    checkUserProfile,
    checkUserByEmail,
    getUserRole,
    adminLogin,
    logout,
    refreshProfile,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

/**
 * Helper function for signup completion - to be called after successful signup
 */
export async function createUserSession(userId: string): Promise<void> {
  localStorage.setItem('currentUserId', userId)
}

/**
 * Helper function to create user session by email
 */
export async function createUserSessionByEmail(email: string): Promise<void> {
  const profile = await getUserByEmail(email)
  if (profile) {
    localStorage.setItem('currentUserId', profile.id)
  }
}