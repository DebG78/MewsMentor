import { supabase } from './supabase'
import { createGrowthEvent } from './growthEventsService'

export type ProficiencyLevel = 'learning' | 'practicing' | 'proficient' | 'expert'

export interface Skill {
  id: string
  name: string
  category?: string
  description?: string
  related_skills?: string[]
  created_at: string
  updated_at: string
}

export interface UserSkillProgress {
  id: string
  user_id: string
  skill_id: string
  proficiency_level: ProficiencyLevel
  evidence_count: number
  first_recorded: string
  last_updated: string
}

/**
 * Get all skills
 */
export async function getSkills(): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching skills:', error)
    return []
  }

  return data || []
}

/**
 * Get skills by category
 */
export async function getSkillsByCategory(category: string): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('category', category)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching skills by category:', error)
    return []
  }

  return data || []
}

/**
 * Get a skill by name (case-insensitive)
 */
export async function getSkillByName(skillName: string): Promise<Skill | null> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .ilike('name', skillName)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching skill by name:', error)
    return null
  }

  return data
}

/**
 * Create a new skill
 */
export async function createSkill(
  skillData: Omit<Skill, 'id' | 'created_at' | 'updated_at'>
): Promise<Skill | null> {
  const { data, error } = await supabase
    .from('skills')
    .insert(skillData)
    .select()
    .single()

  if (error) {
    console.error('Error creating skill:', error)
    return null
  }

  return data
}

/**
 * Get or create a skill by name
 */
export async function getOrCreateSkill(skillName: string, category?: string): Promise<Skill | null> {
  // Try to find existing skill
  let skill = await getSkillByName(skillName)

  // If not found, create it
  if (!skill) {
    skill = await createSkill({
      name: skillName,
      category: category || 'General',
      description: `Skill: ${skillName}`,
    })
  }

  return skill
}

/**
 * Get user's skill progress
 */
export async function getUserSkillsProgress(
  userId: string
): Promise<Array<UserSkillProgress & { skill?: Skill }>> {
  const { data, error } = await supabase
    .from('user_skill_progress')
    .select(`
      *,
      skills (*)
    `)
    .eq('user_id', userId)
    .order('last_updated', { ascending: false })

  if (error) {
    console.error('Error fetching user skills progress:', error)
    return []
  }

  // Flatten the structure
  return (data || []).map((item: any) => ({
    ...item,
    skill: item.skills,
  }))
}

/**
 * Get user's skills grouped by proficiency level
 */
export async function getUserSkillsByProficiency(
  userId: string
): Promise<Record<ProficiencyLevel, Array<UserSkillProgress & { skill?: Skill }>>> {
  const allSkills = await getUserSkillsProgress(userId)

  return {
    learning: allSkills.filter((s) => s.proficiency_level === 'learning'),
    practicing: allSkills.filter((s) => s.proficiency_level === 'practicing'),
    proficient: allSkills.filter((s) => s.proficiency_level === 'proficient'),
    expert: allSkills.filter((s) => s.proficiency_level === 'expert'),
  }
}

/**
 * Update skill progress for a user
 * This is typically called after a growth event
 */
export async function updateSkillProgress(
  userId: string,
  skillNames: string[],
  eventId?: string
): Promise<boolean> {
  try {
    for (const skillName of skillNames) {
      // Get or create the skill
      const skill = await getOrCreateSkill(skillName)
      if (!skill) {
        console.error(`Failed to get/create skill: ${skillName}`)
        continue
      }

      // Check if user already has progress for this skill
      const { data: existingProgress } = await supabase
        .from('user_skill_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('skill_id', skill.id)
        .single()

      if (existingProgress) {
        // Update existing progress
        const newEvidenceCount = existingProgress.evidence_count + 1
        const newProficiency = calculateProficiencyLevel(newEvidenceCount)

        await supabase
          .from('user_skill_progress')
          .update({
            evidence_count: newEvidenceCount,
            proficiency_level: newProficiency,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existingProgress.id)

        // Check if proficiency level changed (milestone!)
        if (newProficiency !== existingProgress.proficiency_level) {
          await createGrowthEvent({
            user_id: userId,
            event_type: 'skill_milestone',
            title: `${newProficiency.charAt(0).toUpperCase() + newProficiency.slice(1)} in ${skillName}`,
            description: `Reached ${newProficiency} level in ${skillName}`,
            event_data: {
              skill_name: skillName,
              skill_id: skill.id,
              old_level: existingProgress.proficiency_level,
              new_level: newProficiency,
              evidence_count: newEvidenceCount,
            },
            event_date: new Date().toISOString(),
            skills_developed: [skillName],
            related_event_id: eventId,
          })
        }
      } else {
        // Create new progress entry
        await supabase.from('user_skill_progress').insert({
          user_id: userId,
          skill_id: skill.id,
          proficiency_level: 'learning',
          evidence_count: 1,
          first_recorded: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        })
      }
    }

    return true
  } catch (error) {
    console.error('Error updating skill progress:', error)
    return false
  }
}

/**
 * Calculate proficiency level based on evidence count
 */
export function calculateProficiencyLevel(evidenceCount: number): ProficiencyLevel {
  if (evidenceCount >= 10) return 'expert'
  if (evidenceCount >= 5) return 'proficient'
  if (evidenceCount >= 2) return 'practicing'
  return 'learning'
}

/**
 * Get skills being actively developed (evidence in last 30 days)
 */
export async function getActiveSkills(userId: string): Promise<Array<UserSkillProgress & { skill?: Skill }>> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('user_skill_progress')
    .select(`
      *,
      skills (*)
    `)
    .eq('user_id', userId)
    .gte('last_updated', thirtyDaysAgo.toISOString())
    .order('last_updated', { ascending: false })

  if (error) {
    console.error('Error fetching active skills:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item,
    skill: item.skills,
  }))
}

/**
 * Get top skills across all users (for analytics)
 */
export async function getTopSkillsAcrossUsers(limit: number = 10): Promise<Array<{ skill: Skill; user_count: number }>> {
  const { data, error } = await supabase
    .from('user_skill_progress')
    .select('skill_id, skills(*)')

  if (error) {
    console.error('Error fetching top skills:', error)
    return []
  }

  // Count users per skill
  const skillCounts: Record<string, { skill: Skill; count: number }> = {}

  data?.forEach((item: any) => {
    const skillId = item.skill_id
    if (skillCounts[skillId]) {
      skillCounts[skillId].count++
    } else {
      skillCounts[skillId] = {
        skill: item.skills,
        count: 1,
      }
    }
  })

  // Convert to array and sort
  const topSkills = Object.values(skillCounts)
    .map((item) => ({
      skill: item.skill,
      user_count: item.count,
    }))
    .sort((a, b) => b.user_count - a.user_count)
    .slice(0, limit)

  return topSkills
}

/**
 * Search skills by name
 */
export async function searchSkills(query: string): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error searching skills:', error)
    return []
  }

  return data || []
}