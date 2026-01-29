/**
 * Database Seeding Script
 *
 * Run this with: npx tsx scripts/seedDatabase.ts
 *
 * Make sure you have VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! // Use service role key

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // Step 1: Seed Users
    console.log('📝 Seeding user profiles...')
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .upsert([
        {
          id: 'user_001',
          email: 'alice.johnson@example.com',
          full_name: 'Alice Johnson',
          role_title: 'Senior Software Engineer',
          department: 'Engineering',
          location_timezone: 'America/Los_Angeles',
          languages: ['English'],
          experience_years: 8,
          bio: 'Passionate about building scalable systems and mentoring junior developers.',
          current_skills: ['JavaScript', 'React', 'Node.js', 'System Design'],
          target_skills: ['Leadership', 'Technical Writing']
        },
        {
          id: 'user_002',
          email: 'bob.smith@example.com',
          full_name: 'Bob Smith',
          role_title: 'Product Manager',
          department: 'Product',
          location_timezone: 'America/New_York',
          languages: ['English', 'Spanish'],
          experience_years: 5,
          current_skills: ['Product Strategy', 'Data Analysis'],
          target_skills: ['Technical Skills', 'Public Speaking']
        },
        {
          id: 'user_003',
          email: 'carol.wong@example.com',
          full_name: 'Carol Wong',
          role_title: 'Junior Developer',
          department: 'Engineering',
          location_timezone: 'America/Los_Angeles',
          languages: ['English', 'Mandarin'],
          experience_years: 2,
          current_skills: ['JavaScript', 'HTML', 'CSS'],
          target_skills: ['React', 'System Design', 'Testing']
        }
      ], { onConflict: 'email' })

    if (usersError) {
      console.error('❌ Error seeding users:', usersError)
    } else {
      console.log('✅ Users seeded successfully\n')
    }

    // Step 2: Seed Skills
    console.log('📝 Seeding skills...')
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .upsert([
        { name: 'JavaScript', category: 'Programming', description: 'Programming language for web development' },
        { name: 'React', category: 'Frontend', description: 'JavaScript library for building user interfaces' },
        { name: 'System Design', category: 'Architecture', description: 'Designing scalable systems' },
        { name: 'Leadership', category: 'Management', description: 'Leading and inspiring teams' },
        { name: 'Communication', category: 'Soft Skills', description: 'Effective communication' }
      ], { onConflict: 'name' })

    if (skillsError) {
      console.error('❌ Error seeding skills:', skillsError)
    } else {
      console.log('✅ Skills seeded successfully\n')
    }

    // Step 3: Get mentoring program ID
    console.log('📝 Getting program IDs...')
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, type')
      .eq('type', 'mentoring')
      .single()

    if (programsError || !programs) {
      console.error('❌ Error getting programs:', programsError)
      return
    }

    console.log('✅ Found mentoring program:', programs.id, '\n')

    // Step 4: Create cohort
    console.log('📝 Creating cohort...')
    const { data: cohort, error: cohortError } = await supabase
      .from('program_cohorts')
      .upsert({
        id: 'cohort_q1_2025',
        program_id: programs.id,
        name: 'Q1 2025 Mentoring Program',
        description: 'First quarter mentoring cohort',
        status: 'active',
        start_date: '2025-01-15',
        end_date: '2025-04-15',
        program_manager: 'Sarah Johnson',
        target_skills: ['Leadership', 'System Design', 'Communication']
      }, { onConflict: 'id' })

    if (cohortError) {
      console.error('❌ Error creating cohort:', cohortError)
    } else {
      console.log('✅ Cohort created successfully\n')
    }

    // Step 5: Add participants
    console.log('📝 Adding program participants...')
    const { error: participantsError } = await supabase
      .from('program_participants')
      .upsert([
        {
          user_id: 'user_001',
          program_cohort_id: 'cohort_q1_2025',
          role_in_program: 'mentor',
          role_data: { capacity: 2, topics_to_mentor: ['System Design', 'React'] },
          status: 'active'
        },
        {
          user_id: 'user_003',
          program_cohort_id: 'cohort_q1_2025',
          role_in_program: 'mentee',
          role_data: { topics_to_learn: ['React', 'System Design'] },
          status: 'active'
        }
      ])

    if (participantsError) {
      console.error('❌ Error adding participants:', participantsError)
    } else {
      console.log('✅ Participants added successfully\n')
    }

    console.log('🎉 Database seeding completed!\n')

    // Verify
    const { count: userCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true })
    const { count: skillCount } = await supabase.from('skills').select('*', { count: 'exact', head: true })

    console.log('📊 Summary:')
    console.log(`   Users: ${userCount}`)
    console.log(`   Skills: ${skillCount}`)

  } catch (error) {
    console.error('❌ Seeding failed:', error)
  }
}

// Run the seeding
seedDatabase()