/**
 * Initialize Default Badges
 * Run once: npx tsx scripts/initBadges.ts
 */

import { supabase } from './supabaseClient'

type BadgeType = 'milestone' | 'skill' | 'engagement' | 'impact'

interface BadgeInsert {
  name: string
  description: string
  icon: string
  badge_type: BadgeType
  criteria: Record<string, any>
}

async function initializeBadges(): Promise<void> {
  const defaultBadges: BadgeInsert[] = [
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
      description: 'Reached proficient level in 3 skills',
      icon: '⚡',
      badge_type: 'skill',
      criteria: {
        type: 'skill_level',
        min_level: 'proficient',
        min_skills: 3,
      },
    },
    {
      name: 'Skill Master',
      description: 'Reached expert level in any skill',
      icon: '🏆',
      badge_type: 'skill',
      criteria: {
        type: 'skill_level',
        min_level: 'expert',
        min_skills: 1,
      },
    },
    // Engagement Badges
    {
      name: 'Active Learner',
      description: 'Completed 10 growth events',
      icon: '📚',
      badge_type: 'engagement',
      criteria: {
        type: 'event_count',
        min_count: 10,
      },
    },
    {
      name: 'Reflective Practitioner',
      description: 'Completed 5 reflection events',
      icon: '💭',
      badge_type: 'engagement',
      criteria: {
        type: 'event_count',
        event_type: 'reflection',
        min_count: 5,
      },
    },
    {
      name: 'Cross-Functional Explorer',
      description: 'Completed 3 cross-exposure shadows',
      icon: '🔍',
      badge_type: 'engagement',
      criteria: {
        type: 'event_count',
        event_type: 'cross_exposure_shadow',
        min_count: 3,
      },
    },
    // Impact Badges
    {
      name: 'Great Mentor',
      description: 'Completed 10 mentoring sessions',
      icon: '🌟',
      badge_type: 'impact',
      criteria: {
        type: 'event_count',
        event_type: 'mentoring_session',
        min_count: 10,
      },
    },
    {
      name: 'Generous Host',
      description: 'Hosted 5 cross-exposure sessions',
      icon: '🤝',
      badge_type: 'impact',
      criteria: {
        type: 'event_count',
        event_type: 'cross_exposure_host',
        min_count: 5,
      },
    },
  ]

  // Upsert all badges
  const { error } = await supabase
    .from('badges')
    .upsert(defaultBadges, { onConflict: 'name', ignoreDuplicates: false })

  if (error) {
    throw new Error(`Failed to initialize badges: ${error.message}`)
  }
}

async function run() {
  console.log('🎖️  Initializing badges...\n')

  await initializeBadges()

  console.log('✅ Badges initialized successfully!')
  console.log('\nDefault badges created:')
  console.log('  • First Steps (milestone)')
  console.log('  • Program Graduate (milestone)')
  console.log('  • Skill Champion (skill)')
  console.log('  • Skill Master (skill)')
  console.log('  • Active Learner (engagement)')
  console.log('  • Reflective Practitioner (engagement)')
  console.log('  • Cross-Functional Explorer (engagement)')
  console.log('  • Great Mentor (impact)')
  console.log('  • Generous Host (impact)')
}

run().catch(console.error)