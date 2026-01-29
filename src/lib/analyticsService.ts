import { supabase } from './supabase'

export interface GrowthAnalytics {
  totalParticipants: number
  participationRate: number
  totalGrowthEvents: number
  uniqueSkillsDeveloped: number
  crossDepartmentConnections: number
  programBreakdown: {
    mentoring: number
    crossExposure: number
    both: number
  }
}

export interface SkillsDevelopmentAnalytics {
  topSkills: Array<{ skillName: string; count: number; category?: string }>
  skillsByCategory: Record<string, number>
  skillProgression: Array<{ skill: string; learning: number; practicing: number; proficient: number; expert: number }>
}

export interface ProgramParticipationStats {
  mentoring: {
    activePairs: number
    totalSessions: number
    completionRate: number
    avgRating: number
  }
  crossExposure: {
    totalBookings: number
    hoursCompleted: number
    activeHosts: number
    avgRating: number
  }
  programOverlap: number // Users in both programs
}

export interface CrossDepartmentConnection {
  department1: string
  department2: string
  connectionCount: number
}

/**
 * Get overall growth analytics for a date range
 */
export async function getGrowthAnalytics(
  dateRange?: { startDate: string; endDate: string }
): Promise<GrowthAnalytics> {
  try {
    // Total participants across all programs
    const { count: totalParticipants } = await supabase
      .from('program_participants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Total growth events in date range
    let eventsQuery = supabase
      .from('growth_events')
      .select('*', { count: 'exact', head: true })

    if (dateRange) {
      eventsQuery = eventsQuery
        .gte('event_date', dateRange.startDate)
        .lte('event_date', dateRange.endDate)
    }

    const { count: totalGrowthEvents } = await eventsQuery

    // Unique skills being developed
    const { data: skillsData } = await supabase
      .from('user_skill_progress')
      .select('skill_id')

    const uniqueSkillsDeveloped = new Set(skillsData?.map((s) => s.skill_id)).size

    // Cross-department connections
    const { data: connectionsData } = await supabase
      .from('growth_events')
      .select(`
        user_id,
        related_user_id,
        user_profiles!growth_events_user_id_fkey (department),
        related_profiles:user_profiles!growth_events_related_user_id_fkey (department)
      `)
      .not('related_user_id', 'is', null)

    let crossDepartmentConnections = 0
    if (connectionsData) {
      connectionsData.forEach((item: any) => {
        const dept1 = item.user_profiles?.department
        const dept2 = item.related_profiles?.department
        if (dept1 && dept2 && dept1 !== dept2) {
          crossDepartmentConnections++
        }
      })
    }

    // Program breakdown
    const { data: mentoringParticipants } = await supabase
      .from('program_participants')
      .select('user_id, program_cohorts!inner(programs!inner(type))')
      .eq('program_cohorts.programs.type', 'mentoring')
      .eq('status', 'active')

    const { data: crossExposureParticipants } = await supabase
      .from('program_participants')
      .select('user_id, program_cohorts!inner(programs!inner(type))')
      .eq('program_cohorts.programs.type', 'cross_exposure')
      .eq('status', 'active')

    const mentoringUserIds = new Set(mentoringParticipants?.map((p) => p.user_id) || [])
    const crossExposureUserIds = new Set(crossExposureParticipants?.map((p) => p.user_id) || [])

    const bothPrograms = [...mentoringUserIds].filter((id) => crossExposureUserIds.has(id)).length

    return {
      totalParticipants: totalParticipants || 0,
      participationRate: 0, // Calculate against total employees if you have that data
      totalGrowthEvents: totalGrowthEvents || 0,
      uniqueSkillsDeveloped,
      crossDepartmentConnections,
      programBreakdown: {
        mentoring: mentoringUserIds.size,
        crossExposure: crossExposureUserIds.size,
        both: bothPrograms,
      },
    }
  } catch (error) {
    console.error('Error fetching growth analytics:', error)
    return {
      totalParticipants: 0,
      participationRate: 0,
      totalGrowthEvents: 0,
      uniqueSkillsDeveloped: 0,
      crossDepartmentConnections: 0,
      programBreakdown: { mentoring: 0, crossExposure: 0, both: 0 },
    }
  }
}

/**
 * Get skills development analytics
 */
export async function getSkillsDevelopmentAnalytics(
  dateRange?: { startDate: string; endDate: string }
): Promise<SkillsDevelopmentAnalytics> {
  try {
    // Get all user skill progress
    const { data: skillProgressData } = await supabase
      .from('user_skill_progress')
      .select(`
        proficiency_level,
        evidence_count,
        skills (
          id,
          name,
          category
        )
      `)

    if (!skillProgressData) {
      return {
        topSkills: [],
        skillsByCategory: {},
        skillProgression: [],
      }
    }

    // Top skills by evidence count
    const skillCounts: Record<string, { count: number; category?: string }> = {}
    skillProgressData.forEach((item: any) => {
      const skillName = item.skills?.name
      if (skillName) {
        if (!skillCounts[skillName]) {
          skillCounts[skillName] = { count: 0, category: item.skills?.category }
        }
        skillCounts[skillName].count += item.evidence_count
      }
    })

    const topSkills = Object.entries(skillCounts)
      .map(([skillName, data]) => ({
        skillName,
        count: data.count,
        category: data.category,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Skills by category
    const skillsByCategory: Record<string, number> = {}
    skillProgressData.forEach((item: any) => {
      const category = item.skills?.category || 'Uncategorized'
      skillsByCategory[category] = (skillsByCategory[category] || 0) + 1
    })

    // Skill progression (proficiency distribution per skill)
    const skillProgression: Record<string, any> = {}
    skillProgressData.forEach((item: any) => {
      const skillName = item.skills?.name
      if (skillName) {
        if (!skillProgression[skillName]) {
          skillProgression[skillName] = {
            skill: skillName,
            learning: 0,
            practicing: 0,
            proficient: 0,
            expert: 0,
          }
        }
        skillProgression[skillName][item.proficiency_level]++
      }
    })

    return {
      topSkills,
      skillsByCategory,
      skillProgression: Object.values(skillProgression).slice(0, 15),
    }
  } catch (error) {
    console.error('Error fetching skills development analytics:', error)
    return {
      topSkills: [],
      skillsByCategory: {},
      skillProgression: [],
    }
  }
}

/**
 * Get program participation statistics
 */
export async function getProgramParticipationStats(
  dateRange?: { startDate: string; endDate: string }
): Promise<ProgramParticipationStats> {
  try {
    // Mentoring stats
    let mentoringEventsQuery = supabase
      .from('growth_events')
      .select('rating')
      .eq('event_type', 'mentoring_session')

    if (dateRange) {
      mentoringEventsQuery = mentoringEventsQuery
        .gte('event_date', dateRange.startDate)
        .lte('event_date', dateRange.endDate)
    }

    const { data: mentoringEvents } = await mentoringEventsQuery

    const totalSessions = mentoringEvents?.length || 0
    const ratedSessions = mentoringEvents?.filter((e) => e.rating !== null) || []
    const avgMentoringRating =
      ratedSessions.length > 0
        ? ratedSessions.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedSessions.length
        : 0

    // Cross-exposure stats
    let bookingsQuery = supabase
      .from('shadow_bookings')
      .select('duration_hours, shadow_rating, host_rating')
      .in('status', ['confirmed', 'completed'])

    if (dateRange) {
      bookingsQuery = bookingsQuery
        .gte('start_datetime', dateRange.startDate)
        .lte('start_datetime', dateRange.endDate)
    }

    const { data: bookings } = await bookingsQuery

    const totalBookings = bookings?.length || 0
    const hoursCompleted =
      bookings?.reduce((sum, b) => sum + (b.duration_hours || 0), 0) || 0

    const ratedBookings = bookings?.filter((b) => b.shadow_rating !== null) || []
    const avgCrossExposureRating =
      ratedBookings.length > 0
        ? ratedBookings.reduce((sum, b) => sum + (b.shadow_rating || 0), 0) / ratedBookings.length
        : 0

    // Active hosts
    const { data: activeHosts } = await supabase
      .from('host_offerings')
      .select('host_user_id')
      .eq('is_active', true)

    const activeHostsCount = new Set(activeHosts?.map((h) => h.host_user_id)).size

    // Program overlap
    const { data: mentoringUsers } = await supabase
      .from('program_participants')
      .select('user_id, program_cohorts!inner(programs!inner(type))')
      .eq('program_cohorts.programs.type', 'mentoring')
      .eq('status', 'active')

    const { data: crossExposureUsers } = await supabase
      .from('program_participants')
      .select('user_id, program_cohorts!inner(programs!inner(type))')
      .eq('program_cohorts.programs.type', 'cross_exposure')
      .eq('status', 'active')

    const mentoringUserIds = new Set(mentoringUsers?.map((u) => u.user_id) || [])
    const crossExposureUserIds = new Set(crossExposureUsers?.map((u) => u.user_id) || [])
    const programOverlap = [...mentoringUserIds].filter((id) => crossExposureUserIds.has(id)).length

    return {
      mentoring: {
        activePairs: 0, // Would need to query matches from cohorts
        totalSessions,
        completionRate: 0, // Would need to calculate based on expected sessions
        avgRating: avgMentoringRating,
      },
      crossExposure: {
        totalBookings,
        hoursCompleted,
        activeHosts: activeHostsCount,
        avgRating: avgCrossExposureRating,
      },
      programOverlap,
    }
  } catch (error) {
    console.error('Error fetching program participation stats:', error)
    return {
      mentoring: { activePairs: 0, totalSessions: 0, completionRate: 0, avgRating: 0 },
      crossExposure: { totalBookings: 0, hoursCompleted: 0, activeHosts: 0, avgRating: 0 },
      programOverlap: 0,
    }
  }
}

/**
 * Get cross-department connections
 */
export async function getCrossDepartmentConnections(
  dateRange?: { startDate: string; endDate: string }
): Promise<CrossDepartmentConnection[]> {
  try {
    let query = supabase
      .from('growth_events')
      .select(`
        user_profiles!growth_events_user_id_fkey (department),
        related_profiles:user_profiles!growth_events_related_user_id_fkey (department)
      `)
      .not('related_user_id', 'is', null)

    if (dateRange) {
      query = query
        .gte('event_date', dateRange.startDate)
        .lte('event_date', dateRange.endDate)
    }

    const { data } = await query

    // Build connection matrix
    const connections: Record<string, number> = {}

    data?.forEach((item: any) => {
      const dept1 = item.user_profiles?.department
      const dept2 = item.related_profiles?.department

      if (dept1 && dept2 && dept1 !== dept2) {
        // Create a consistent key (alphabetically sorted)
        const key = [dept1, dept2].sort().join(' <-> ')
        connections[key] = (connections[key] || 0) + 1
      }
    })

    // Convert to array format
    return Object.entries(connections)
      .map(([key, count]) => {
        const [department1, department2] = key.split(' <-> ')
        return { department1, department2, connectionCount: count }
      })
      .sort((a, b) => b.connectionCount - a.connectionCount)
  } catch (error) {
    console.error('Error fetching cross-department connections:', error)
    return []
  }
}

/**
 * Export analytics to CSV format
 */
export async function exportAnalyticsToCSV(
  type: 'growth' | 'skills' | 'participation' | 'connections',
  dateRange?: { startDate: string; endDate: string }
): Promise<string> {
  try {
    switch (type) {
      case 'growth': {
        const data = await getGrowthAnalytics(dateRange)
        return `Metric,Value
Total Participants,${data.totalParticipants}
Total Growth Events,${data.totalGrowthEvents}
Unique Skills Developed,${data.uniqueSkillsDeveloped}
Cross-Department Connections,${data.crossDepartmentConnections}
Mentoring Program Users,${data.programBreakdown.mentoring}
Cross-Exposure Program Users,${data.programBreakdown.crossExposure}
Both Programs Users,${data.programBreakdown.both}`
      }

      case 'skills': {
        const data = await getSkillsDevelopmentAnalytics(dateRange)
        const rows = data.topSkills.map(
          (skill) => `${skill.skillName},${skill.count},${skill.category || 'N/A'}`
        )
        return `Skill,Count,Category\n${rows.join('\n')}`
      }

      case 'connections': {
        const data = await getCrossDepartmentConnections(dateRange)
        const rows = data.map(
          (conn) => `${conn.department1},${conn.department2},${conn.connectionCount}`
        )
        return `Department 1,Department 2,Connections\n${rows.join('\n')}`
      }

      default:
        return 'Invalid export type'
    }
  } catch (error) {
    console.error('Error exporting analytics to CSV:', error)
    return 'Error exporting data'
  }
}