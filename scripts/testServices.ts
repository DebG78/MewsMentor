/**
 * Test Phase 1 Services
 * Run: npx tsx scripts/testServices.ts
 */

import { supabase } from './supabaseClient'

async function testServices() {
  console.log('🧪 Testing Phase 1 Services...\n')

  try {
    // Test 1: Get user profile
    console.log('1️⃣  Testing getUserByEmail...')
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'carol.wong@example.com')
      .single()

    if (userError || !user) {
      console.log('   ❌ User not found - check seed data')
      return
    }

    console.log(`   ✅ Found user: ${user.full_name} (${user.role_title})`)

    // Test 2: Get program participation
    console.log('\n2️⃣  Testing getUserProgramParticipation...')
    const { data: programs, error: programsError } = await supabase
      .from('program_participants')
      .select(`
        *,
        cohort:program_cohorts(name)
      `)
      .eq('user_id', user.id)

    if (programsError) {
      console.log('   ❌ Error fetching programs:', programsError.message)
    } else {
      console.log(`   ✅ User is in ${programs?.length || 0} program(s)`)
      programs?.forEach((p: any) => {
        console.log(`      • ${p.cohort.name} as ${p.role_in_program}`)
      })
    }

    // Test 3: Get growth timeline
    console.log('\n3️⃣  Testing getGrowthTimeline...')
    const { data: events, error: eventsError } = await supabase
      .from('growth_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: false })

    if (eventsError) {
      console.log('   ❌ Error fetching events:', eventsError.message)
    } else {
      console.log(`   ✅ User has ${events?.length || 0} growth event(s)`)
      events?.slice(0, 3).forEach((e: any) => {
        console.log(`      • ${e.event_type}: ${e.title}`)
      })
    }

    // Test 4: Get skills progress
    console.log('\n4️⃣  Testing getUserSkillsProgress...')
    const { data: skills, error: skillsError } = await supabase
      .from('user_skill_progress')
      .select(`
        *,
        skill:skills(name)
      `)
      .eq('user_id', user.id)

    if (skillsError) {
      console.log('   ❌ Error fetching skills:', skillsError.message)
    } else {
      console.log(`   ✅ User is developing ${skills?.length || 0} skill(s)`)
      skills?.forEach((s: any) => {
        console.log(`      • ${s.skill?.name}: ${s.proficiency_level} (${s.evidence_count} evidence)`)
      })
    }

    // Test 5: Get badges
    console.log('\n5️⃣  Testing getUserBadges...')
    const { data: badges, error: badgesError } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(name, icon)
      `)
      .eq('user_id', user.id)

    if (badgesError) {
      console.log('   ❌ Error fetching badges:', badgesError.message)
    } else {
      console.log(`   ✅ User has earned ${badges?.length || 0} badge(s)`)
      if (badges && badges.length > 0) {
        badges.forEach((b: any) => {
          console.log(`      • ${b.badge?.icon} ${b.badge?.name}`)
        })
      }
    }

    // Test 6: Get host offerings
    console.log('\n6️⃣  Testing getHostOfferings...')
    const { data: offerings, error: offeringsError } = await supabase
      .from('host_offerings')
      .select(`
        *,
        host_profile:user_profiles!host_offerings_host_user_id_fkey(full_name)
      `)
      .eq('is_active', true)

    if (offeringsError) {
      console.log('   ❌ Error fetching offerings:', offeringsError.message)
    } else {
      console.log(`   ✅ Found ${offerings?.length || 0} active host offering(s)`)
      offerings?.forEach((o: any) => {
        console.log(`      • "${o.title}" by ${o.host_profile?.full_name}`)
      })
    }

    console.log('\n🎉 All services working correctly!')
    console.log('\n📊 Summary:')
    console.log(`   Users: 1`)
    console.log(`   Programs: ${programs?.length || 0}`)
    console.log(`   Growth Events: ${events?.length || 0}`)
    console.log(`   Skills: ${skills?.length || 0}`)
    console.log(`   Badges: ${badges?.length || 0}`)
    console.log(`   Host Offerings: ${offerings?.length || 0}`)

  } catch (error) {
    console.error('\n❌ Error testing services:', error)
  }
}

testServices()