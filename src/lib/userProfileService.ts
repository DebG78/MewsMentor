import { supabase } from './supabase'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role_title?: string
  department?: string
  location_timezone?: string
  languages?: string[]
  experience_years?: number
  bio?: string
  profile_image_url?: string
  current_skills?: string[]
  target_skills?: string[]
  skills_progression?: Record<string, any>
  preferences?: Record<string, any>
  availability_settings?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ProgramParticipation {
  id: string
  program_id: string
  program_name: string
  program_type: string
  cohort_id: string
  cohort_name: string
  role_in_program: string
  status: string
  joined_at: string
  completed_at?: string
}

/**
 * Get a user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

/**
 * Get a user profile by email
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error fetching user by email:', error)
    return null
  }

  return data
}

/**
 * Create a new user profile
 */
export async function createUserProfile(
  profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert(profileData)
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    return null
  }

  return data
}

/**
 * Update a user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'email' | 'created_at' | 'updated_at'>>
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }

  return data
}

/**
 * Get all program participations for a user
 */
export async function getUserProgramParticipation(
  userId: string
): Promise<ProgramParticipation[]> {
  const { data, error } = await supabase
    .from('program_participants')
    .select(`
      id,
      role_in_program,
      status,
      joined_at,
      completed_at,
      program_cohorts (
        id,
        name,
        programs (
          id,
          name,
          type
        )
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching user program participation:', error)
    return []
  }

  // Transform the data to flatten the nested structure
  return (data || []).map((item: any) => ({
    id: item.id,
    program_id: item.program_cohorts?.programs?.id || '',
    program_name: item.program_cohorts?.programs?.name || '',
    program_type: item.program_cohorts?.programs?.type || '',
    cohort_id: item.program_cohorts?.id || '',
    cohort_name: item.program_cohorts?.name || '',
    role_in_program: item.role_in_program,
    status: item.status,
    joined_at: item.joined_at,
    completed_at: item.completed_at,
  }))
}

/**
 * Search users by query and filters
 */
export async function searchUsers(
  query?: string,
  filters?: {
    department?: string
    skills?: string[]
    experienceYears?: { min?: number; max?: number }
  }
): Promise<UserProfile[]> {
  let queryBuilder = supabase.from('user_profiles').select('*')

  // Text search on name or email
  if (query) {
    queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
  }

  // Filter by department
  if (filters?.department) {
    queryBuilder = queryBuilder.eq('department', filters.department)
  }

  // Filter by skills (contains any of the specified skills)
  if (filters?.skills && filters.skills.length > 0) {
    queryBuilder = queryBuilder.overlaps('current_skills', filters.skills)
  }

  // Filter by experience years
  if (filters?.experienceYears?.min !== undefined) {
    queryBuilder = queryBuilder.gte('experience_years', filters.experienceYears.min)
  }
  if (filters?.experienceYears?.max !== undefined) {
    queryBuilder = queryBuilder.lte('experience_years', filters.experienceYears.max)
  }

  const { data, error } = await queryBuilder.order('full_name', { ascending: true })

  if (error) {
    console.error('Error searching users:', error)
    return []
  }

  return data || []
}

/**
 * Get user's role in a specific program cohort
 */
export async function getUserRoleInCohort(
  userId: string,
  cohortId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('program_participants')
    .select('role_in_program')
    .eq('user_id', userId)
    .eq('program_cohort_id', cohortId)
    .eq('status', 'active')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching user role in cohort:', error)
    return null
  }

  return data.role_in_program
}

/**
 * Check if user has a specific role in any active program
 */
export async function userHasRole(
  userId: string,
  role: string,
  programType?: string
): Promise<boolean> {
  let query = supabase
    .from('program_participants')
    .select('id, program_cohorts!inner(programs!inner(type))')
    .eq('user_id', userId)
    .eq('role_in_program', role)
    .eq('status', 'active')

  if (programType) {
    query = query.eq('program_cohorts.programs.type', programType)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error('Error checking user role:', error)
    return false
  }

  return (data?.length || 0) > 0
}