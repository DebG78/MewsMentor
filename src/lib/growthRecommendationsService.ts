import { supabase } from './supabase'

export interface GrowthRecommendation {
  id: string
  user_id?: string
  program_cohort_id?: string
  recommendation_key: string
  title: string
  description: string
  icon: string
  stage: string
  display_order: number
  is_completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

/**
 * Initialize recommendations for a user based on program type
 */
export async function initializeRecommendationsForUser(
  userId: string,
  programType: 'mentoring',
  cohortId?: string
): Promise<GrowthRecommendation[]> {
  const templates = getMentoringRecommendationTemplates()

  const recommendations = templates.map((template) => ({
    user_id: userId,
    program_cohort_id: cohortId,
    recommendation_key: template.key,
    title: template.title,
    description: template.description,
    icon: template.icon,
    stage: template.stage,
    display_order: template.order,
    is_completed: false,
  }))

  const { data, error } = await supabase
    .from('growth_recommendations')
    .upsert(recommendations, { onConflict: 'user_id,recommendation_key', ignoreDuplicates: false })
    .select()

  if (error) {
    console.error('Error initializing recommendations:', error)
    return []
  }

  return data || []
}

/**
 * Get recommendations for a user
 */
export async function getRecommendationsForUser(
  userId: string,
  stage?: string
): Promise<{ active: GrowthRecommendation[]; completed: GrowthRecommendation[] }> {
  let query = supabase
    .from('growth_recommendations')
    .select('*')
    .eq('user_id', userId)

  if (stage) {
    query = query.eq('stage', stage)
  }

  const { data, error } = await query.order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching recommendations:', error)
    return { active: [], completed: [] }
  }

  const recommendations = data || []

  return {
    active: recommendations.filter((r) => !r.is_completed),
    completed: recommendations.filter((r) => r.is_completed),
  }
}

/**
 * Complete a recommendation
 */
export async function completeRecommendation(
  recommendationId: string
): Promise<GrowthRecommendation | null> {
  const { data, error } = await supabase
    .from('growth_recommendations')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', recommendationId)
    .select()
    .single()

  if (error) {
    console.error('Error completing recommendation:', error)
    return null
  }

  return data
}

/**
 * Uncomplete a recommendation
 */
export async function uncompleteRecommendation(
  recommendationId: string
): Promise<GrowthRecommendation | null> {
  const { data, error } = await supabase
    .from('growth_recommendations')
    .update({
      is_completed: false,
      completed_at: null,
    })
    .eq('id', recommendationId)
    .select()
    .single()

  if (error) {
    console.error('Error uncompleting recommendation:', error)
    return null
  }

  return data
}

/**
 * Get recommendation stats for a user
 */
export async function getRecommendationStats(userId: string): Promise<{
  total: number
  completed: number
  completionRate: number
}> {
  const { data, error } = await supabase
    .from('growth_recommendations')
    .select('is_completed')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching recommendation stats:', error)
    return { total: 0, completed: 0, completionRate: 0 }
  }

  const total = data?.length || 0
  const completed = data?.filter((r) => r.is_completed).length || 0
  const completionRate = total > 0 ? (completed / total) * 100 : 0

  return { total, completed, completionRate }
}

/**
 * Delete a recommendation
 */
export async function deleteRecommendation(recommendationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('growth_recommendations')
    .delete()
    .eq('id', recommendationId)

  if (error) {
    console.error('Error deleting recommendation:', error)
    return false
  }

  return true
}

// ============================================================================
// RECOMMENDATION TEMPLATES
// ============================================================================

interface RecommendationTemplate {
  key: string
  title: string
  description: string
  icon: string
  stage: string
  order: number
}

/**
 * Mentoring program recommendation templates
 */
function getMentoringRecommendationTemplates(): RecommendationTemplate[] {
  return [
    // Getting started
    {
      key: 'complete_profile',
      title: 'Complete your profile',
      description: 'Add your skills, goals, and preferences to your profile',
      icon: 'User',
      stage: 'getting_started',
      order: 1,
    },
    {
      key: 'set_goals',
      title: 'Set your learning goals',
      description: 'Define what you want to achieve in this program',
      icon: 'Target',
      stage: 'getting_started',
      order: 2,
    },
    {
      key: 'introduce_yourself',
      title: 'Introduce yourself',
      description: 'Send a message to your mentor or mentee',
      icon: 'Mail',
      stage: 'getting_started',
      order: 3,
    },
    // Active participation
    {
      key: 'schedule_first_session',
      title: 'Schedule your first session',
      description: 'Book your kickoff meeting',
      icon: 'Calendar',
      stage: 'active',
      order: 1,
    },
    {
      key: 'add_reflection',
      title: 'Add a reflection',
      description: 'Reflect on your recent session or learning',
      icon: 'PenTool',
      stage: 'active',
      order: 2,
    },
    {
      key: 'update_skills',
      title: 'Track your progress',
      description: 'Update the skills you\'re developing',
      icon: 'TrendingUp',
      stage: 'active',
      order: 3,
    },
  ]
}

