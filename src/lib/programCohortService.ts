import { supabase } from './supabase'

export interface Program {
  id: string
  name: string
  type: 'mentoring' | 'cross_exposure' | 'other'
  description?: string
  status: 'active' | 'inactive' | 'archived'
  program_config?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ProgramCohort {
  id: string
  program_id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'completed' | 'paused'
  start_date?: string
  end_date?: string
  program_manager?: string
  target_skills?: string[]
  matches?: Record<string, any>
  matching_history?: Record<string, any>
  mentor_survey_id?: string
  mentee_survey_id?: string
  created_at: string
  updated_at: string
}

export interface ProgramParticipant {
  id: string
  user_id: string
  program_cohort_id: string
  role_in_program: 'mentee' | 'mentor' | 'host' | 'shadow' | 'admin'
  role_data?: Record<string, any>
  status: 'active' | 'inactive' | 'completed' | 'dropped'
  joined_at: string
  completed_at?: string
  created_at: string
  updated_at: string
}

/**
 * Get all programs, optionally filtered by type
 */
export async function getPrograms(programType?: string): Promise<Program[]> {
  let query = supabase.from('programs').select('*')

  if (programType) {
    query = query.eq('type', programType)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) {
    console.error('Error fetching programs:', error)
    return []
  }

  return data || []
}

/**
 * Get all program cohorts, optionally filtered by program type
 */
export async function getProgramCohorts(programType?: string): Promise<ProgramCohort[]> {
  let query = supabase.from('program_cohorts').select('*, programs!inner(*)')

  if (programType) {
    query = query.eq('programs.type', programType)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching program cohorts:', error)
    return []
  }

  return data || []
}

/**
 * Get a specific cohort by ID
 */
export async function getCohortById(cohortId: string): Promise<ProgramCohort | null> {
  const { data, error } = await supabase
    .from('program_cohorts')
    .select('*')
    .eq('id', cohortId)
    .single()

  if (error) {
    console.error('Error fetching cohort:', error)
    return null
  }

  return data
}

/**
 * Get all participants in a cohort, optionally filtered by role
 */
export async function getCohortParticipants(
  cohortId: string,
  role?: string
): Promise<Array<ProgramParticipant & { user_profile?: any }>> {
  let query = supabase
    .from('program_participants')
    .select(`
      *,
      user_profiles (*)
    `)
    .eq('program_cohort_id', cohortId)
    .eq('status', 'active')

  if (role) {
    query = query.eq('role_in_program', role)
  }

  const { data, error } = await query.order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching cohort participants:', error)
    return []
  }

  // Flatten the structure
  return (data || []).map((item: any) => ({
    ...item,
    user_profile: item.user_profiles,
  }))
}

/**
 * Create a new cohort
 */
export async function createCohort(
  cohortData: Omit<ProgramCohort, 'id' | 'created_at' | 'updated_at'>
): Promise<ProgramCohort | null> {
  const { data, error } = await supabase
    .from('program_cohorts')
    .insert(cohortData)
    .select()
    .single()

  if (error) {
    console.error('Error creating cohort:', error)
    return null
  }

  return data
}

/**
 * Update a cohort
 */
export async function updateCohort(
  cohortId: string,
  updates: Partial<Omit<ProgramCohort, 'id' | 'created_at' | 'updated_at'>>
): Promise<ProgramCohort | null> {
  const { data, error } = await supabase
    .from('program_cohorts')
    .update(updates)
    .eq('id', cohortId)
    .select()
    .single()

  if (error) {
    console.error('Error updating cohort:', error)
    return null
  }

  return data
}

/**
 * Delete a cohort
 */
export async function deleteCohort(cohortId: string): Promise<boolean> {
  const { error } = await supabase.from('program_cohorts').delete().eq('id', cohortId)

  if (error) {
    console.error('Error deleting cohort:', error)
    return false
  }

  return true
}

/**
 * Add a participant to a cohort
 */
export async function addParticipantToCohort(
  userId: string,
  cohortId: string,
  role: 'mentee' | 'mentor' | 'host' | 'shadow' | 'admin',
  roleData?: Record<string, any>
): Promise<ProgramParticipant | null> {
  const { data, error } = await supabase
    .from('program_participants')
    .insert({
      user_id: userId,
      program_cohort_id: cohortId,
      role_in_program: role,
      role_data: roleData || {},
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding participant to cohort:', error)
    return null
  }

  return data
}

/**
 * Remove a participant from a cohort
 */
export async function removeParticipantFromCohort(participantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('program_participants')
    .update({ status: 'dropped' })
    .eq('id', participantId)

  if (error) {
    console.error('Error removing participant from cohort:', error)
    return false
  }

  return true
}

/**
 * Get active cohorts for a specific program type
 */
export async function getActiveCohorts(programType?: string): Promise<ProgramCohort[]> {
  let query = supabase
    .from('program_cohorts')
    .select('*, programs!inner(*)')
    .eq('status', 'active')

  if (programType) {
    query = query.eq('programs.type', programType)
  }

  const { data, error } = await query.order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching active cohorts:', error)
    return []
  }

  return data || []
}

/**
 * Get cohort with full program details
 */
export async function getCohortWithProgram(cohortId: string): Promise<any> {
  const { data, error } = await supabase
    .from('program_cohorts')
    .select('*, programs(*)')
    .eq('id', cohortId)
    .single()

  if (error) {
    console.error('Error fetching cohort with program:', error)
    return null
  }

  return data
}

/**
 * Update cohort matches (for mentoring program)
 */
export async function updateCohortMatches(
  cohortId: string,
  matches: Record<string, any>
): Promise<boolean> {
  const { error } = await supabase
    .from('program_cohorts')
    .update({ matches })
    .eq('id', cohortId)

  if (error) {
    console.error('Error updating cohort matches:', error)
    return false
  }

  return true
}

/**
 * Add to matching history (for mentoring program)
 */
export async function addToMatchingHistory(
  cohortId: string,
  historyEntry: Record<string, any>
): Promise<boolean> {
  // First, get current matching history
  const { data: cohort, error: fetchError } = await supabase
    .from('program_cohorts')
    .select('matching_history')
    .eq('id', cohortId)
    .single()

  if (fetchError) {
    console.error('Error fetching matching history:', fetchError)
    return false
  }

  const currentHistory = (cohort?.matching_history as any[]) || []
  const updatedHistory = [...currentHistory, historyEntry]

  const { error: updateError } = await supabase
    .from('program_cohorts')
    .update({ matching_history: updatedHistory })
    .eq('id', cohortId)

  if (updateError) {
    console.error('Error updating matching history:', updateError)
    return false
  }

  return true
}