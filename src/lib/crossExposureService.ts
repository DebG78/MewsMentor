import { supabase } from './supabase'
import { createGrowthEvent } from './growthEventsService'
import { updateSkillProgress } from './skillsService'

export interface HostOffering {
  id: string
  host_user_id: string
  title: string
  description: string
  skills_offered?: string[]
  topics_covered?: string[]
  what_shadow_will_do?: string
  availability?: Record<string, any>
  max_concurrent_shadows?: number
  slots_per_week?: number
  is_active: boolean
  is_accepting_bookings: boolean
  allowed_shadow_departments?: string[]
  allowed_shadow_levels?: string[]
  created_at: string
  updated_at: string
}

export interface ShadowBooking {
  id: string
  host_offering_id: string
  host_user_id: string
  shadow_user_id: string
  booking_type: 'single' | 'recurring'
  start_datetime: string
  end_datetime: string
  duration_hours: number
  learning_goals?: string
  skills_to_develop?: string[]
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  booking_source?: string
  shadow_rating?: number
  shadow_reflection?: string
  host_rating?: number
  host_feedback?: string
  skills_developed?: string[]
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface HostAvailabilityBlock {
  id: string
  host_offering_id: string
  host_user_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  is_booked: boolean
  booking_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * Get all host offerings with optional filters
 */
export async function getHostOfferings(filters?: {
  department?: string
  skills?: string[]
  isActive?: boolean
}): Promise<Array<HostOffering & { host_profile?: any }>> {
  let query = supabase
    .from('host_offerings')
    .select(`
      *,
      user_profiles!host_offerings_host_user_id_fkey (
        id,
        full_name,
        role_title,
        department,
        profile_image_url
      )
    `)

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
    query = query.eq('is_accepting_bookings', filters.isActive)
  }

  if (filters?.skills && filters.skills.length > 0) {
    query = query.overlaps('skills_offered', filters.skills)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching host offerings:', error)
    return []
  }

  // Flatten and filter by department if needed
  let results = (data || []).map((item: any) => ({
    ...item,
    host_profile: item.user_profiles,
  }))

  if (filters?.department) {
    results = results.filter((item) => item.host_profile?.department === filters.department)
  }

  return results
}

/**
 * Get a specific host offering by ID
 */
export async function getHostOfferingById(
  offeringId: string
): Promise<(HostOffering & { host_profile?: any }) | null> {
  const { data, error } = await supabase
    .from('host_offerings')
    .select(`
      *,
      user_profiles!host_offerings_host_user_id_fkey (
        id,
        full_name,
        role_title,
        department,
        location_timezone,
        profile_image_url
      )
    `)
    .eq('id', offeringId)
    .single()

  if (error) {
    console.error('Error fetching host offering:', error)
    return null
  }

  return {
    ...data,
    host_profile: (data as any).user_profiles,
  }
}

/**
 * Create a new host offering
 */
export async function createHostOffering(
  offeringData: Omit<HostOffering, 'id' | 'created_at' | 'updated_at'>
): Promise<HostOffering | null> {
  const { data, error } = await supabase
    .from('host_offerings')
    .insert(offeringData)
    .select()
    .single()

  if (error) {
    console.error('Error creating host offering:', error)
    return null
  }

  return data
}

/**
 * Update a host offering
 */
export async function updateHostOffering(
  offeringId: string,
  updates: Partial<Omit<HostOffering, 'id' | 'host_user_id' | 'created_at' | 'updated_at'>>
): Promise<HostOffering | null> {
  const { data, error } = await supabase
    .from('host_offerings')
    .update(updates)
    .eq('id', offeringId)
    .select()
    .single()

  if (error) {
    console.error('Error updating host offering:', error)
    return null
  }

  return data
}

/**
 * Delete (deactivate) a host offering
 */
export async function deleteHostOffering(offeringId: string): Promise<boolean> {
  const { error } = await supabase
    .from('host_offerings')
    .update({ is_active: false, is_accepting_bookings: false })
    .eq('id', offeringId)

  if (error) {
    console.error('Error deleting host offering:', error)
    return false
  }

  return true
}

/**
 * Get available slots for an offering within a date range
 */
export async function getAvailableSlots(
  offeringId: string,
  dateRange: { startDate: string; endDate: string }
): Promise<HostAvailabilityBlock[]> {
  const { data, error } = await supabase
    .from('host_availability_blocks')
    .select('*')
    .eq('host_offering_id', offeringId)
    .eq('is_available', true)
    .eq('is_booked', false)
    .gte('date', dateRange.startDate)
    .lte('date', dateRange.endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching available slots:', error)
    return []
  }

  return data || []
}

/**
 * Create a shadow booking
 */
export async function createShadowBooking(
  bookingData: Omit<ShadowBooking, 'id' | 'created_at' | 'updated_at'>
): Promise<ShadowBooking | null> {
  const { data, error } = await supabase
    .from('shadow_bookings')
    .insert(bookingData)
    .select()
    .single()

  if (error) {
    console.error('Error creating shadow booking:', error)
    return null
  }

  return data
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: ShadowBooking['status']
): Promise<boolean> {
  const { error } = await supabase
    .from('shadow_bookings')
    .update({ status })
    .eq('id', bookingId)

  if (error) {
    console.error('Error updating booking status:', error)
    return false
  }

  return true
}

/**
 * Get bookings for a user (as host or shadow)
 */
export async function getBookingsByUser(
  userId: string,
  role: 'host' | 'shadow'
): Promise<Array<ShadowBooking & { host_profile?: any; shadow_profile?: any; offering?: any }>> {
  const userIdField = role === 'host' ? 'host_user_id' : 'shadow_user_id'

  const { data, error } = await supabase
    .from('shadow_bookings')
    .select(`
      *,
      host_user:user_profiles!shadow_bookings_host_user_id_fkey (
        id,
        full_name,
        role_title,
        department,
        profile_image_url
      ),
      shadow_user:user_profiles!shadow_bookings_shadow_user_id_fkey (
        id,
        full_name,
        role_title,
        department,
        profile_image_url
      ),
      host_offerings (
        id,
        title,
        description
      )
    `)
    .eq(userIdField, userId)
    .order('start_datetime', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item,
    host_profile: item.host_user,
    shadow_profile: item.shadow_user,
    offering: item.host_offerings,
  }))
}

/**
 * Get upcoming bookings for a user
 */
export async function getUpcomingBookings(
  userId: string,
  role: 'host' | 'shadow'
): Promise<Array<ShadowBooking & { host_profile?: any; shadow_profile?: any; offering?: any }>> {
  const userIdField = role === 'host' ? 'host_user_id' : 'shadow_user_id'
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('shadow_bookings')
    .select(`
      *,
      host_user:user_profiles!shadow_bookings_host_user_id_fkey (
        id,
        full_name,
        role_title,
        profile_image_url
      ),
      shadow_user:user_profiles!shadow_bookings_shadow_user_id_fkey (
        id,
        full_name,
        role_title,
        profile_image_url
      ),
      host_offerings (
        id,
        title,
        description
      )
    `)
    .eq(userIdField, userId)
    .eq('status', 'confirmed')
    .gte('start_datetime', now)
    .order('start_datetime', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error fetching upcoming bookings:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item,
    host_profile: item.host_user,
    shadow_profile: item.shadow_user,
    offering: item.host_offerings,
  }))
}

/**
 * Complete a booking with feedback
 */
export async function completeBooking(
  bookingId: string,
  feedbackData: {
    rating?: number
    feedback?: string
    skills_developed?: string[]
  }
): Promise<boolean> {
  try {
    // Get the booking details with offering information
    const { data: booking, error: fetchError } = await supabase
      .from('shadow_bookings')
      .select(`
        *,
        offering:host_offerings(title, description)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      console.error('Error fetching booking:', fetchError)
      return false
    }

    // Update the booking with feedback
    const { error: updateError } = await supabase
      .from('shadow_bookings')
      .update({
        status: 'completed',
        shadow_rating: feedbackData.rating,
        shadow_reflection: feedbackData.feedback,
        skills_developed: feedbackData.skills_developed,
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return false
    }

    // Get the offering title
    const offeringTitle = (booking as any).offering?.title || 'Job Shadow Experience'

    // Create growth event for shadow
    await createGrowthEvent({
      user_id: booking.shadow_user_id,
      event_type: 'cross_exposure_shadow',
      title: `Shadowed: ${offeringTitle}`,
      description: feedbackData.feedback || 'Completed a job shadowing experience',
      event_data: {
        booking_id: bookingId,
        host_offering_id: booking.host_offering_id,
        duration_hours: booking.duration_hours,
      },
      event_date: booking.start_datetime,
      related_user_id: booking.host_user_id,
      skills_developed: feedbackData.skills_developed,
      reflection: feedbackData.feedback,
      rating: feedbackData.rating,
    })

    // Create growth event for host (they hosted a session)
    await createGrowthEvent({
      user_id: booking.host_user_id,
      event_type: 'cross_exposure_host',
      title: `Hosted: ${offeringTitle}`,
      description: `Hosted a shadow session on ${offeringTitle}`,
      event_data: {
        booking_id: bookingId,
        host_offering_id: booking.host_offering_id,
        duration_hours: booking.duration_hours,
      },
      event_date: booking.start_datetime,
      related_user_id: booking.shadow_user_id,
    })

    // Update skill progress for shadow if skills were developed
    if (feedbackData.skills_developed && feedbackData.skills_developed.length > 0) {
      await updateSkillProgress(booking.shadow_user_id, feedbackData.skills_developed)
    }

    return true
  } catch (error) {
    console.error('Error completing booking:', error)
    return false
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string, reason?: string): Promise<boolean> {
  const updates: any = { status: 'cancelled' }
  if (reason) {
    updates.admin_notes = reason
  }

  const { error } = await supabase
    .from('shadow_bookings')
    .update(updates)
    .eq('id', bookingId)

  if (error) {
    console.error('Error cancelling booking:', error)
    return false
  }

  return true
}

/**
 * Get host offerings by user (for host dashboard)
 */
export async function getHostOfferingsByUser(userId: string): Promise<HostOffering[]> {
  const { data, error } = await supabase
    .from('host_offerings')
    .select('*')
    .eq('host_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching host offerings by user:', error)
    return []
  }

  return data || []
}

/**
 * Get booking count for a host offering
 */
export async function getOfferingBookingCount(offeringId: string): Promise<number> {
  const { count, error } = await supabase
    .from('shadow_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('host_offering_id', offeringId)
    .in('status', ['confirmed', 'completed'])

  if (error) {
    console.error('Error counting bookings:', error)
    return 0
  }

  return count || 0
}

/**
 * Get ALL host offerings (for admin)
 */
export async function getAllHostOfferings(): Promise<any[]> {
  const { data, error } = await supabase
    .from('host_offerings')
    .select(`
      *,
      host:user_profiles!host_user_id(
        full_name,
        department
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all host offerings:', error)
    return []
  }

  // Flatten the data structure
  return (data || []).map((offering: any) => ({
    ...offering,
    host_name: offering.host?.full_name || 'Unknown',
    department: offering.host?.department || null,
  }))
}

/**
 * Get ALL bookings (for admin)
 */
export async function getAllBookings(): Promise<any[]> {
  const { data, error } = await supabase
    .from('shadow_bookings')
    .select(`
      *,
      host:user_profiles!host_user_id(full_name),
      shadow:user_profiles!shadow_user_id(full_name),
      offering:host_offerings(title)
    `)
    .order('start_datetime', { ascending: false })

  if (error) {
    console.error('Error fetching all bookings:', error)
    return []
  }

  // Flatten the data structure
  return (data || []).map((booking: any) => ({
    ...booking,
    host_name: booking.host?.full_name || 'Unknown',
    shadow_name: booking.shadow?.full_name || 'Unknown',
    offering_title: booking.offering?.title || 'N/A',
  }))
}

/**
 * Get bookings where user is the shadow
 */
export async function getShadowBookings(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('shadow_bookings')
    .select(`
      *,
      host:user_profiles!host_user_id(full_name, role_title, profile_image_url),
      offering:host_offerings(title, description)
    `)
    .eq('shadow_user_id', userId)
    .order('start_datetime', { ascending: false })

  if (error) {
    console.error('Error fetching shadow bookings:', error)
    return []
  }

  // Flatten the data structure
  return (data || []).map((booking: any) => ({
    ...booking,
    host_name: booking.host?.full_name || 'Unknown',
    host_role: booking.host?.role_title,
    host_image: booking.host?.profile_image_url,
    offering_title: booking.offering?.title || 'N/A',
    offering_description: booking.offering?.description,
  }))
}

/**
 * Get bookings where user is the host
 */
export async function getHostBookings(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('shadow_bookings')
    .select(`
      *,
      shadow:user_profiles!shadow_user_id(full_name, role_title, profile_image_url),
      offering:host_offerings(title, description)
    `)
    .eq('host_user_id', userId)
    .order('start_datetime', { ascending: false })

  if (error) {
    console.error('Error fetching host bookings:', error)
    return []
  }

  // Flatten the data structure
  return (data || []).map((booking: any) => ({
    ...booking,
    shadow_name: booking.shadow?.full_name || 'Unknown',
    shadow_role: booking.shadow?.role_title,
    shadow_image: booking.shadow?.profile_image_url,
    offering_title: booking.offering?.title || 'N/A',
    offering_description: booking.offering?.description,
  }))
}