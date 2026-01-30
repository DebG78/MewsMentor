import { supabase } from './supabase'

export type GrowthEventType =
  | 'mentoring_session'
  | 'badge_earned'
  | 'skill_milestone'
  | 'reflection'
  | 'goal_completed'
  | 'program_joined'
  | 'program_completed'

export interface GrowthEvent {
  id: string
  user_id: string
  program_cohort_id?: string
  event_type: GrowthEventType
  title: string
  description?: string
  event_data?: Record<string, any>
  event_date: string
  related_user_id?: string
  related_event_id?: string
  skills_developed?: string[]
  reflection?: string
  rating?: number
  created_at: string
  updated_at: string
}

export interface GrowthEventFilters {
  eventType?: GrowthEventType | GrowthEventType[]
  programCohortId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Get growth timeline for a user with optional filters
 */
export async function getGrowthTimeline(
  userId: string,
  filters?: GrowthEventFilters
): Promise<GrowthEvent[]> {
  let query = supabase
    .from('growth_events')
    .select('*')
    .eq('user_id', userId)

  // Apply filters
  if (filters?.eventType) {
    if (Array.isArray(filters.eventType)) {
      query = query.in('event_type', filters.eventType)
    } else {
      query = query.eq('event_type', filters.eventType)
    }
  }

  if (filters?.programCohortId) {
    query = query.eq('program_cohort_id', filters.programCohortId)
  }

  if (filters?.startDate) {
    query = query.gte('event_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('event_date', filters.endDate)
  }

  // Pagination
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query.order('event_date', { ascending: false })

  if (error) {
    console.error('Error fetching growth timeline:', error)
    return []
  }

  return data || []
}

/**
 * Get growth timeline with related user profiles
 */
export async function getGrowthTimelineWithProfiles(
  userId: string,
  filters?: GrowthEventFilters
): Promise<Array<GrowthEvent & { related_user?: any }>> {
  let query = supabase
    .from('growth_events')
    .select(`
      *,
      user_profiles!growth_events_related_user_id_fkey (
        id,
        full_name,
        role_title,
        profile_image_url
      )
    `)
    .eq('user_id', userId)

  // Apply filters (same as above)
  if (filters?.eventType) {
    if (Array.isArray(filters.eventType)) {
      query = query.in('event_type', filters.eventType)
    } else {
      query = query.eq('event_type', filters.eventType)
    }
  }

  if (filters?.programCohortId) {
    query = query.eq('program_cohort_id', filters.programCohortId)
  }

  if (filters?.startDate) {
    query = query.gte('event_date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('event_date', filters.endDate)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query.order('event_date', { ascending: false })

  if (error) {
    console.error('Error fetching growth timeline with profiles:', error)
    return []
  }

  // Flatten the structure
  return (data || []).map((item: any) => ({
    ...item,
    related_user: item.user_profiles,
  }))
}

/**
 * Create a new growth event
 */
export async function createGrowthEvent(
  eventData: Omit<GrowthEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<GrowthEvent | null> {
  const { data, error } = await supabase
    .from('growth_events')
    .insert(eventData)
    .select()
    .single()

  if (error) {
    console.error('Error creating growth event:', error)
    return null
  }

  return data
}

/**
 * Update a growth event
 */
export async function updateGrowthEvent(
  eventId: string,
  updates: Partial<Omit<GrowthEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<GrowthEvent | null> {
  const { data, error } = await supabase
    .from('growth_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error updating growth event:', error)
    return null
  }

  return data
}

/**
 * Delete a growth event
 */
export async function deleteGrowthEvent(eventId: string): Promise<boolean> {
  const { error } = await supabase.from('growth_events').delete().eq('id', eventId)

  if (error) {
    console.error('Error deleting growth event:', error)
    return false
  }

  return true
}

/**
 * Get growth events by type for a user
 */
export async function getGrowthEventsByType(
  userId: string,
  eventType: GrowthEventType
): Promise<GrowthEvent[]> {
  const { data, error } = await supabase
    .from('growth_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('Error fetching growth events by type:', error)
    return []
  }

  return data || []
}

/**
 * Get all growth events for a cohort (for admin/analytics)
 */
export async function getGrowthEventsByCohort(cohortId: string): Promise<GrowthEvent[]> {
  const { data, error } = await supabase
    .from('growth_events')
    .select('*')
    .eq('program_cohort_id', cohortId)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('Error fetching growth events by cohort:', error)
    return []
  }

  return data || []
}

/**
 * Get recent growth events across all users (for public feed)
 */
export async function getRecentGrowthEvents(
  eventTypes?: GrowthEventType[],
  limit: number = 20
): Promise<Array<GrowthEvent & { user_profile?: any }>> {
  let query = supabase
    .from('growth_events')
    .select(`
      *,
      user_profiles!growth_events_user_id_fkey (
        id,
        full_name,
        role_title,
        department,
        profile_image_url
      )
    `)

  if (eventTypes && eventTypes.length > 0) {
    query = query.in('event_type', eventTypes)
  }

  const { data, error } = await query
    .order('event_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent growth events:', error)
    return []
  }

  // Flatten the structure
  return (data || []).map((item: any) => ({
    ...item,
    user_profile: item.user_profiles,
  }))
}

/**
 * Get count of growth events by type for a user
 */
export async function getGrowthEventCounts(
  userId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<Record<GrowthEventType, number>> {
  let query = supabase
    .from('growth_events')
    .select('event_type')
    .eq('user_id', userId)

  if (dateRange) {
    query = query.gte('event_date', dateRange.startDate).lte('event_date', dateRange.endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching growth event counts:', error)
    return {} as Record<GrowthEventType, number>
  }

  // Count events by type
  const counts: Record<string, number> = {}
  data?.forEach((event) => {
    counts[event.event_type] = (counts[event.event_type] || 0) + 1
  })

  return counts as Record<GrowthEventType, number>
}

/**
 * Add reflection to an existing growth event
 */
export async function addReflectionToEvent(
  eventId: string,
  reflection: string,
  rating?: number
): Promise<boolean> {
  const updates: any = { reflection }
  if (rating !== undefined) {
    updates.rating = rating
  }

  const { error } = await supabase
    .from('growth_events')
    .update(updates)
    .eq('id', eventId)

  if (error) {
    console.error('Error adding reflection to event:', error)
    return false
  }

  return true
}

/**
 * Get growth events that need reflections (no reflection text)
 */
export async function getEventsNeedingReflection(userId: string): Promise<GrowthEvent[]> {
  const { data, error } = await supabase
    .from('growth_events')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', 'mentoring_session')
    .is('reflection', null)
    .order('event_date', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching events needing reflection:', error)
    return []
  }

  return data || []
}