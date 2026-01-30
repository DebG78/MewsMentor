import { supabase } from './supabase'
import { createGrowthEvent, getGrowthEventCounts } from './growthEventsService'

export type BadgeType = 'milestone' | 'skill' | 'engagement' | 'impact'

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  badge_type: BadgeType
  criteria: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  evidence_event_id?: string
  created_at: string
}

/**
 * Initialize default badge definitions
 * Call this once during setup
 */
export async function initializeBadges(): Promise<void> {
  const defaultBadges: Omit<Badge, 'id' | 'created_at' | 'updated_at'>[] = [
    // Milestone Badges
    {
      name: 'First Steps',
      description: 'Joined your first program',
      icon: '🎯',
      badge_type: 'milestone',
      criteria: {
        type: 'event_count',
        event_type: 'program_joined',
        min_count: 1,
      },
    },
    {
      name: 'Program Graduate',
      description: 'Successfully completed a program',
      icon: '🎓',
      badge_type: 'milestone',
      criteria: {
        type: 'event_count',
        event_type: 'program_completed',
        min_count: 1,
      },
    },

    // Skill Badges
    {
      name: 'Skill Champion',
      description: 'Reached proficient level in 5 skills',
      icon: '⭐',
      badge_type: 'skill',
      criteria: {
        type: 'proficient_skills',
        min_count: 5,
      },
    },
    {
      name: 'Skill Master',
      description: 'Reached expert level in 3 skills',
      icon: '🏆',
      badge_type: 'skill',
      criteria: {
        type: 'expert_skills',
        min_count: 3,
      },
    },

    // Engagement Badges
    {
      name: 'Active Learner',
      description: 'Participated in 10 mentoring sessions',
      icon: '📚',
      badge_type: 'engagement',
      criteria: {
        type: 'event_count',
        event_type: 'mentoring_session',
        min_count: 10,
      },
    },
    {
      name: 'Reflective Practitioner',
      description: 'Added thoughtful reflections to 15 activities',
      icon: '💭',
      badge_type: 'engagement',
      criteria: {
        type: 'reflections',
        min_count: 15,
      },
    },
    {
      name: 'Cross-Functional Explorer',
      description: 'Connected with people from 3+ departments',
      icon: '🌐',
      badge_type: 'engagement',
      criteria: {
        type: 'department_diversity',
        min_departments: 3,
      },
    },

    // Impact Badges
    {
      name: 'Great Mentor',
      description: 'Completed 5 mentoring sessions with positive feedback',
      icon: '🤝',
      badge_type: 'impact',
      criteria: {
        type: 'mentoring_sessions',
        min_count: 5,
        min_rating: 4,
      },
    },
  ]

  for (const badgeData of defaultBadges) {
    // Check if badge already exists
    const { data: existing } = await supabase
      .from('badges')
      .select('id')
      .eq('name', badgeData.name)
      .single()

    if (!existing) {
      await supabase.from('badges').insert(badgeData)
    }
  }
}

/**
 * Get all badge definitions
 */
export async function getBadgeDefinitions(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('badge_type', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching badge definitions:', error)
    return []
  }

  return data || []
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<Array<UserBadge & { badge?: Badge }>> {
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      *,
      badges (*)
    `)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })

  if (error) {
    console.error('Error fetching user badges:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item,
    badge: item.badges,
  }))
}

/**
 * Check if user has already earned a badge
 */
async function userHasBadge(userId: string, badgeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking user badge:', error)
  }

  return !!data
}

/**
 * Award a badge to a user
 */
export async function awardBadge(
  userId: string,
  badgeId: string,
  evidenceEventId?: string
): Promise<boolean> {
  try {
    // Check if user already has this badge
    const hasBadge = await userHasBadge(userId, badgeId)
    if (hasBadge) {
      return false // Already has badge
    }

    // Award the badge
    const { data: userBadge, error: awardError } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        evidence_event_id: evidenceEventId,
      })
      .select()
      .single()

    if (awardError) {
      console.error('Error awarding badge:', awardError)
      return false
    }

    // Get badge details
    const { data: badge } = await supabase
      .from('badges')
      .select('*')
      .eq('id', badgeId)
      .single()

    if (badge) {
      // Create a growth event for the badge earning
      await createGrowthEvent({
        user_id: userId,
        event_type: 'badge_earned',
        title: `Earned: ${badge.name}`,
        description: badge.description,
        event_data: {
          badge_id: badgeId,
          badge_name: badge.name,
          badge_type: badge.badge_type,
        },
        event_date: new Date().toISOString(),
        related_event_id: evidenceEventId,
      })
    }

    return true
  } catch (error) {
    console.error('Error in awardBadge:', error)
    return false
  }
}

/**
 * Check badge criteria and return whether user qualifies
 */
export async function checkBadgeCriteria(userId: string, criteria: Record<string, any>): Promise<boolean> {
  try {
    switch (criteria.type) {
      case 'event_count': {
        // Count specific event type
        const { count } = await supabase
          .from('growth_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('event_type', criteria.event_type)

        return (count || 0) >= criteria.min_count
      }

      case 'total_events': {
        // Count multiple event types
        const { count } = await supabase
          .from('growth_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('event_type', criteria.event_types)

        return (count || 0) >= criteria.min_count
      }

      case 'proficient_skills': {
        // Count skills at proficient or expert level
        const { count } = await supabase
          .from('user_skill_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('proficiency_level', ['proficient', 'expert'])

        return (count || 0) >= criteria.min_count
      }

      case 'expert_skills': {
        // Count skills at expert level
        const { count } = await supabase
          .from('user_skill_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('proficiency_level', 'expert')

        return (count || 0) >= criteria.min_count
      }

      case 'reflections': {
        // Count events with reflections
        const { count } = await supabase
          .from('growth_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('reflection', 'is', null)

        return (count || 0) >= criteria.min_count
      }

      case 'department_diversity': {
        // Count unique departments connected with
        const { data: events } = await supabase
          .from('growth_events')
          .select(`
            related_user_id,
            user_profiles!growth_events_related_user_id_fkey (department)
          `)
          .eq('user_id', userId)
          .not('related_user_id', 'is', null)

        if (!events) return false

        const uniqueDepartments = new Set(
          events
            .map((e: any) => e.user_profiles?.department)
            .filter((d) => d && d !== null)
        )

        return uniqueDepartments.size >= criteria.min_departments
      }

      case 'mentoring_sessions': {
        // Count mentoring sessions with good ratings
        const { data: events } = await supabase
          .from('growth_events')
          .select('rating')
          .eq('user_id', userId)
          .eq('event_type', 'mentoring_session')
          .gte('rating', criteria.min_rating)

        return (events?.length || 0) >= criteria.min_count
      }

      default:
        console.warn(`Unknown badge criteria type: ${criteria.type}`)
        return false
    }
  } catch (error) {
    console.error('Error checking badge criteria:', error)
    return false
  }
}

/**
 * Evaluate all badges for a user and award any newly earned ones
 */
export async function evaluateBadges(userId: string): Promise<string[]> {
  const awardedBadges: string[] = []

  try {
    // Get all badge definitions
    const badges = await getBadgeDefinitions()

    // Check each badge
    for (const badge of badges) {
      // Skip if user already has this badge
      const hasBadge = await userHasBadge(userId, badge.id)
      if (hasBadge) continue

      // Check if user meets criteria
      const qualifies = await checkBadgeCriteria(userId, badge.criteria)

      if (qualifies) {
        // Award the badge
        const awarded = await awardBadge(userId, badge.id)
        if (awarded) {
          awardedBadges.push(badge.name)
        }
      }
    }

    return awardedBadges
  } catch (error) {
    console.error('Error evaluating badges:', error)
    return awardedBadges
  }
}

/**
 * Get badge progress for a user (almost-earned badges)
 */
export async function getBadgeProgress(
  userId: string
): Promise<Array<{ badge: Badge; progress: number; target: number }>> {
  const badges = await getBadgeDefinitions()
  const progress: Array<{ badge: Badge; progress: number; target: number }> = []

  for (const badge of badges) {
    // Skip if already earned
    const hasBadge = await userHasBadge(userId, badge.id)
    if (hasBadge) continue

    // Calculate progress based on criteria type
    const criteria = badge.criteria
    let currentProgress = 0
    let target = 0

    switch (criteria.type) {
      case 'event_count':
      case 'total_events': {
        const { count } = await supabase
          .from('growth_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        currentProgress = count || 0
        target = criteria.min_count
        break
      }

      case 'proficient_skills':
      case 'expert_skills': {
        const { count } = await supabase
          .from('user_skill_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        currentProgress = count || 0
        target = criteria.min_count
        break
      }

      default:
        continue
    }

    // Only include badges where user has made some progress
    if (currentProgress > 0 && currentProgress < target) {
      progress.push({
        badge,
        progress: currentProgress,
        target,
      })
    }
  }

  return progress
}