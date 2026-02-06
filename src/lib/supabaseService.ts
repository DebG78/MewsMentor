import { supabase } from './supabase'
import { Cohort, MenteeData, MentorData, ImportResult, MatchingOutput, MatchingHistoryEntry } from '@/types/mentoring'
import type { Database } from '@/types/database'

type CohortRow = Database['public']['Tables']['cohorts']['Row']
type CohortInsert = Database['public']['Tables']['cohorts']['Insert']
type CohortUpdate = Database['public']['Tables']['cohorts']['Update']
type MenteeRow = Database['public']['Tables']['mentees']['Row']
type MentorRow = Database['public']['Tables']['mentors']['Row']

// Convert database row to frontend Cohort type
function dbCohortToCohort(dbCohort: CohortRow, mentees: MenteeData[], mentors: MentorData[]): Cohort {
  return {
    id: dbCohort.id,
    name: dbCohort.name,
    description: dbCohort.description || undefined,
    status: dbCohort.status,
    created_date: dbCohort.created_date,
    start_date: dbCohort.start_date || undefined,
    end_date: dbCohort.end_date || undefined,
    mentees,
    mentors,
    matches: dbCohort.matches as MatchingOutput | undefined,
    matching_history: dbCohort.matching_history as MatchingHistoryEntry[] | undefined,
    program_manager: dbCohort.program_manager || undefined,
    target_skills: dbCohort.target_skills || undefined,
    success_rate_target: dbCohort.success_rate_target || 85,
    mentor_survey_id: (dbCohort as any).mentor_survey_id || undefined,
    mentee_survey_id: (dbCohort as any).mentee_survey_id || undefined
  }
}

// Convert database row to frontend MenteeData type
function dbMenteeToMentee(dbMentee: MenteeRow): MenteeData {
  return {
    id: dbMentee.mentee_id,
    name: dbMentee.full_name || dbMentee.mentee_id,
    role: dbMentee.role,
    experience_years: dbMentee.experience_years,
    location_timezone: dbMentee.location_timezone,
    topics_to_learn: dbMentee.topics_to_learn,
    meeting_frequency: dbMentee.meeting_frequency,
    languages: dbMentee.languages,
    industry: dbMentee.industry
  }
}

// Convert database row to frontend MentorData type
function dbMentorToMentor(dbMentor: MentorRow): MentorData {
  return {
    id: dbMentor.mentor_id,
    name: dbMentor.full_name || dbMentor.mentor_id,
    role: dbMentor.role,
    experience_years: dbMentor.experience_years,
    location_timezone: dbMentor.location_timezone,
    topics_to_mentor: dbMentor.topics_to_mentor,
    capacity_remaining: dbMentor.capacity_remaining,
    languages: dbMentor.languages,
    industry: dbMentor.industry
  }
}

// Generate unique ID for cohorts
function generateCohortId(): string {
  return `cohort_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create a new cohort
export async function createCohort(
  name: string,
  description?: string,
  programManager?: string
): Promise<Cohort | null> {
  const cohortData: CohortInsert = {
    id: generateCohortId(),
    name,
    description,
    status: 'draft',
    created_date: new Date().toISOString(),
    program_manager: programManager,
    target_skills: [],
    success_rate_target: 85
  }

  const { data, error } = await supabase
    .from('cohorts')
    .insert(cohortData)
    .select()
    .single()

  if (error) {
    console.error('Error creating cohort:', error)
    console.error('Cohort data attempted:', cohortData)
    return null
  }

  if (!data) {
    console.error('No data returned from cohort creation')
    return null
  }

  return dbCohortToCohort(data, [], [])
}

// Get all cohorts with their mentees and mentors
export async function getAllCohorts(): Promise<Cohort[]> {
  const { data: cohorts, error } = await supabase
    .from('cohorts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cohorts:', error)
    return []
  }

  // Fetch mentees and mentors for each cohort
  const cohortsWithData = await Promise.all(
    cohorts.map(async (cohort) => {
      const [menteesResult, mentorsResult] = await Promise.all([
        supabase.from('mentees').select('*').eq('cohort_id', cohort.id),
        supabase.from('mentors').select('*').eq('cohort_id', cohort.id)
      ])

      const mentees = menteesResult.data?.map(dbMenteeToMentee) || []
      const mentors = mentorsResult.data?.map(dbMentorToMentor) || []

      return dbCohortToCohort(cohort, mentees, mentors)
    })
  )

  return cohortsWithData
}

// Get cohort by ID
export async function getCohortById(id: string): Promise<Cohort | null> {
  const { data: cohort, error } = await supabase
    .from('cohorts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching cohort:', error)
    return null
  }

  // Fetch mentees and mentors
  const [menteesResult, mentorsResult] = await Promise.all([
    supabase.from('mentees').select('*').eq('cohort_id', id),
    supabase.from('mentors').select('*').eq('cohort_id', id)
  ])

  const mentees = menteesResult.data?.map(dbMenteeToMentee) || []
  const mentors = mentorsResult.data?.map(dbMentorToMentor) || []

  return dbCohortToCohort(cohort, mentees, mentors)
}

// Update cohort
export async function updateCohort(id: string, updates: Partial<Cohort>): Promise<Cohort | null> {
  const updateData: CohortUpdate = {
    ...(updates.name && { name: updates.name }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.status && { status: updates.status }),
    ...(updates.program_manager !== undefined && { program_manager: updates.program_manager }),
    ...(updates.target_skills && { target_skills: updates.target_skills }),
    ...(updates.success_rate_target && { success_rate_target: updates.success_rate_target }),
    ...(updates.matches && { matches: updates.matches as any }),
    ...(updates.matching_history && { matching_history: updates.matching_history as any }),
    ...(updates.mentor_survey_id !== undefined && { mentor_survey_id: updates.mentor_survey_id }),
    ...(updates.mentee_survey_id !== undefined && { mentee_survey_id: updates.mentee_survey_id }),
    updated_at: new Date().toISOString()
  }

  // If marking cohort as completed, move all mentees and mentors to unassigned
  if (updates.status === 'completed') {
    await Promise.all([
      supabase.from('mentees').update({ cohort_id: 'unassigned' }).eq('cohort_id', id),
      supabase.from('mentors').update({ cohort_id: 'unassigned' }).eq('cohort_id', id)
    ])
  }

  const { data, error } = await supabase
    .from('cohorts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating cohort:', JSON.stringify(error, null, 2))
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
    console.error('Error code:', error.code)
    console.error('Update data keys:', Object.keys(updateData))
    console.error('Cohort ID:', id)
    return null
  }

  // Fetch updated cohort with mentees and mentors
  return getCohortById(id)
}

// Delete cohort
export async function deleteCohort(id: string): Promise<boolean> {
  // Move mentees and mentors back to unassigned instead of deleting them
  await Promise.all([
    supabase.from('mentees').update({ cohort_id: 'unassigned' }).eq('cohort_id', id),
    supabase.from('mentors').update({ cohort_id: 'unassigned' }).eq('cohort_id', id)
  ])

  const { error } = await supabase
    .from('cohorts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting cohort:', error)
    return false
  }

  return true
}

const MENTEE_LIFE_EXPERIENCE_LABELS = {
  returning_from_leave: 'Returning from maternity/paternity/parental leave',
  navigating_menopause: 'Navigating menopause or andropause',
  career_break: 'Career break / sabbatical',
  relocation: 'Relocation to a new country',
  career_change: 'Career change or industry switch',
  health_challenges: 'Managing health challenges (physical or mental)',
  stepping_into_leadership: 'Stepping into leadership for the first time',
  working_towards_promotion: 'Working towards a promotion',
  thinking_about_internal_move: 'Thinking about an internal move'
} as const;

const MENTOR_LIFE_EXPERIENCE_LABELS = {
  returning_from_leave: 'Returning from maternity/paternity/parental leave',
  navigating_menopause: 'Navigating menopause or andropause',
  career_break: 'Career break / sabbatical',
  relocation: 'Relocation to a new country',
  career_change: 'Career change or industry switch',
  health_challenges: 'Managing health challenges (physical or mental)',
  stepping_into_leadership: 'Stepping into leadership for the first time',
  promotions: 'Promotions',
  internal_moves: 'Internal moves'
} as const;

function parseExperienceYears(value?: string): number {
  if (!value) return 0;

  // Handle common patterns from CSV
  const cleanValue = value.trim().toLowerCase();

  if (cleanValue.includes('0-2') || cleanValue.includes('0–2')) return 1;
  if (cleanValue.includes('3-5') || cleanValue.includes('3–5')) return 4;
  if (cleanValue.includes('6-10') || cleanValue.includes('6–10')) return 8;
  if (cleanValue.includes('10+') || cleanValue.includes('10 +')) return 12;
  if (cleanValue.includes('15+') || cleanValue.includes('15 +')) return 15;

  // Try to extract first number
  const matches = value.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  return parseInt(matches[0], 10);
}

function sanitizeText(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildMenteeLifeExperiences(mentee: MenteeData): string[] {
  const experiences: string[] = [];
  if (mentee.returning_from_leave) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.returning_from_leave);
  if (mentee.navigating_menopause) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.navigating_menopause);
  if (mentee.career_break) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.career_break);
  if (mentee.relocation) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.relocation);
  if (mentee.career_change) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.career_change);
  if (mentee.health_challenges) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.health_challenges);
  if (mentee.stepping_into_leadership) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.stepping_into_leadership);
  if (mentee.working_towards_promotion) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.working_towards_promotion);
  if (mentee.thinking_about_internal_move) experiences.push(MENTEE_LIFE_EXPERIENCE_LABELS.thinking_about_internal_move);
  if (mentee.other_situation?.trim()) {
    experiences.push('Other: ' + mentee.other_situation.trim());
  }
  return experiences;
}

function buildMentorLifeExperiences(mentor: MentorData): string[] {
  const experiences: string[] = [];
  if (mentor.returning_from_leave) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.returning_from_leave);
  if (mentor.navigating_menopause) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.navigating_menopause);
  if (mentor.career_break) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.career_break);
  if (mentor.relocation) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.relocation);
  if (mentor.career_change) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.career_change);
  if (mentor.health_challenges) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.health_challenges);
  if (mentor.stepping_into_leadership) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.stepping_into_leadership);
  if (mentor.promotions) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.promotions);
  if (mentor.internal_moves) experiences.push(MENTOR_LIFE_EXPERIENCE_LABELS.internal_moves);
  if (mentor.other_experience?.trim()) {
    experiences.push('Other: ' + mentor.other_experience.trim());
  }
  return experiences;
}

function ensureLanguages(languages?: string[]): string[] {
  if (Array.isArray(languages) && languages.length > 0) {
    const cleaned = languages
      .map(language => language?.trim())
      .filter((language): language is string => Boolean(language && language.length));
    if (cleaned.length > 0) {
      return cleaned;
    }
  }
  return ['English'];
}

function ensureIndustry(industry?: string): string {
  const cleaned = industry?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : 'General';
}

// Add mentors and mentees from import to cohort
export async function addImportDataToCohort(
  cohortId: string,
  importData: ImportResult
): Promise<Cohort | null> {
  // Insert mentees (filter out ones already in this cohort)
  if (importData.mentees.length > 0) {
    console.log('Starting mentee import for cohort:', cohortId);
    console.log('Mentee IDs to import (with duplicates):', importData.mentees.map(m => m.id));

    // First, deduplicate the import data itself (in case CSV has duplicate rows)
    const uniqueMenteesMap = new Map();
    importData.mentees.forEach(mentee => {
      if (!uniqueMenteesMap.has(mentee.id)) {
        uniqueMenteesMap.set(mentee.id, mentee);
      } else {
        console.log(`Deduplicating: ${mentee.id} appears multiple times in import file`);
      }
    });
    const uniqueImportedMentees = Array.from(uniqueMenteesMap.values());

    console.log(`Deduplicated import: ${importData.mentees.length} rows -> ${uniqueImportedMentees.length} unique mentees`);

    // Get existing mentees for this cohort by checking cohort_id + mentee_id combination
    const { data: existingMentees, error: queryError } = await supabase
      .from('mentees')
      .select('cohort_id, mentee_id')
      .eq('cohort_id', cohortId);

    console.log('Query for existing mentees in this cohort:', {
      cohortId,
      existingCount: existingMentees?.length || 0,
      existingMenteeIds: existingMentees?.map((m: any) => m.mentee_id) || [],
      queryError
    });

    const existingMenteeIds = new Set(existingMentees?.map((m: any) => m.mentee_id) || []);

    console.log('Existing mentee IDs in this specific cohort:', Array.from(existingMenteeIds));

    // Filter out mentees that already exist in this cohort
    const newMentees = uniqueImportedMentees.filter(m => {
      const isDuplicate = existingMenteeIds.has(m.id);
      if (isDuplicate) {
        console.log(`Filtering out duplicate mentee: ${m.id} (already in cohort ${cohortId})`);
      }
      return !isDuplicate;
    });

    if (newMentees.length === 0) {
      console.log('No new mentees to add - all already exist in this cohort');
    } else {
      console.log(`Adding ${newMentees.length} new mentees (${importData.mentees.length - newMentees.length} already exist in cohort ${cohortId})`);
    }

    const menteeInserts = newMentees.map(mentee => {
      const languages = ensureLanguages(mentee.languages)
      const industry = ensureIndustry((mentee as { industry?: string }).industry)
      const pronouns = sanitizeText(mentee.pronouns)
      const motivation = sanitizeText(mentee.motivation)
      const mainReason = sanitizeText(mentee.main_reason)
      const preferredStyle = sanitizeText(mentee.preferred_mentor_style)
      const preferredEnergy = sanitizeText(mentee.preferred_mentor_energy)
      const feedbackPreference = sanitizeText(mentee.feedback_preference)
      const mentorExperienceImportance = sanitizeText(mentee.mentor_experience_importance)
      const unwantedQualities = sanitizeText(mentee.what_not_wanted)
      const mentorQualities = sanitizeText(mentee.desired_qualities)
      const expectations = sanitizeText(mentee.expectations)

      // Parse has_participated_before (can be string "0"/"1", number 0/1, or boolean)
      const hasParticipatedBefore = (mentee as any).has_participated_before === '1' ||
                                     (mentee as any).has_participated_before === 1 ||
                                     (mentee as any).has_participated_before === true;

      return {
        cohort_id: cohortId,
        mentee_id: mentee.id,
        full_name: mentee.name || mentee.id,
        role: sanitizeText(mentee.role) || 'Pending role',
        experience_years: parseExperienceYears(mentee.experience_years),
        location_timezone: sanitizeText(mentee.location_timezone) || 'Not specified',
        life_experiences: Array.isArray((mentee as any).life_experiences) ? (mentee as any).life_experiences : buildMenteeLifeExperiences(mentee),
        topics_to_learn: Array.isArray(mentee.topics_to_learn) ? mentee.topics_to_learn : [],
        meeting_frequency: sanitizeText(mentee.meeting_frequency) || 'Not set',
        languages,
        industry,
        has_participated_before: hasParticipatedBefore,
        ...(pronouns ? { pronouns } : {}),
        ...(motivation ? { motivation } : {}),
        ...(mainReason ? { main_reason: mainReason } : {}),
        ...(preferredStyle ? { preferred_style: preferredStyle } : {}),
        ...(preferredEnergy ? { preferred_energy: preferredEnergy } : {}),
        ...(feedbackPreference ? { feedback_preference: feedbackPreference } : {}),
        ...(mentorExperienceImportance ? { mentor_experience_importance: mentorExperienceImportance } : {}),
        ...(unwantedQualities ? { unwanted_qualities: unwantedQualities } : {}),
        ...(mentorQualities ? { mentor_qualities: mentorQualities } : {}),
        ...(expectations ? { expectations } : {})
      }
    })

    console.log('About to insert mentees:', {
      cohortId,
      sampleRecord: menteeInserts[0],
      sampleRecordKeys: Object.keys(menteeInserts[0]),
      totalRecords: menteeInserts.length,
      allMenteeIds: menteeInserts.map(m => m.mentee_id)
    });

    if (menteeInserts.length === 0) {
      console.log('Skipping mentee insert - no new records to add');
    } else {
      const { error: menteeError } = await supabase
        .from('mentees')
        .insert(menteeInserts)

    if (menteeError) {
      console.error('Error inserting mentees:', {
        error: menteeError,
        message: menteeError.message,
        details: menteeError.details,
        hint: menteeError.hint,
        code: menteeError.code,
        sampleData: menteeInserts[0],
        totalRecords: menteeInserts.length
      })

      const message = menteeError.message?.toLowerCase() || ''
      if (message.includes('feedback_preference')) {
        const fallbackInserts = menteeInserts.map(record => {
          if (Object.prototype.hasOwnProperty.call(record, 'feedback_preference')) {
            const { feedback_preference, ...rest } = record as Record<string, unknown> & { feedback_preference?: unknown }
            return {
              ...rest,
              feedback_preferences: feedback_preference
            }
          }
          return record
        })

        const { error: fallbackError } = await supabase
          .from('mentees')
          .insert(fallbackInserts)

        if (fallbackError) {
          console.error('Fallback insert for mentees failed:', {
            error: fallbackError,
            sampleData: fallbackInserts[0],
            totalRecords: fallbackInserts.length
          })
          throw new Error('Failed to insert mentees: ' + fallbackError.message)
        }
      } else {
        throw new Error('Failed to insert mentees: ' + menteeError.message)
      }
    }
    }
  }

  // Insert mentors (filter out ones already in this cohort)
  if (importData.mentors.length > 0) {
    console.log('Starting mentor import for cohort:', cohortId);
    console.log('Mentor IDs to import (with duplicates):', importData.mentors.map(m => m.id));

    // First, deduplicate the import data itself (in case CSV has duplicate rows)
    const uniqueMentorsMap = new Map();
    importData.mentors.forEach(mentor => {
      if (!uniqueMentorsMap.has(mentor.id)) {
        uniqueMentorsMap.set(mentor.id, mentor);
      } else {
        console.log(`Deduplicating: ${mentor.id} appears multiple times in import file`);
      }
    });
    const uniqueImportedMentors = Array.from(uniqueMentorsMap.values());

    console.log(`Deduplicated import: ${importData.mentors.length} rows -> ${uniqueImportedMentors.length} unique mentors`);

    // Get existing mentors for this cohort
    const { data: existingMentors } = await supabase
      .from('mentors')
      .select('mentor_id')
      .eq('cohort_id', cohortId);

    const existingMentorIds = new Set(existingMentors?.map((m: any) => m.mentor_id) || []);

    // Filter out mentors that already exist in this cohort
    const newMentors = uniqueImportedMentors.filter(m => {
      const isDuplicate = existingMentorIds.has(m.id);
      if (isDuplicate) {
        console.log(`Filtering out duplicate mentor: ${m.id} (already in cohort ${cohortId})`);
      }
      return !isDuplicate;
    });

    if (newMentors.length === 0) {
      console.log('No new mentors to add - all already exist in this cohort');
    } else {
      console.log(`Adding ${newMentors.length} new mentors (${importData.mentors.length - newMentors.length} already exist in cohort ${cohortId})`);
    }

    // Check what columns actually exist in the mentors database
    console.log('Checking mentors database schema...');
    const { data: mentorTestData, error: mentorTestError } = await supabase
      .from('mentors')
      .select('*')
      .limit(1);

    if (mentorTestData && mentorTestData.length > 0) {
      console.log('✅ Actual mentors database columns:', Object.keys(mentorTestData[0]));
    } else {
      console.log('⚠️ No existing mentors data to check columns. Error:', mentorTestError);
    }
    const mentorInserts = newMentors.map(mentor => {
      const languages = ensureLanguages(mentor.languages)
      const industry = ensureIndustry((mentor as { industry?: string }).industry)
      const pronouns = sanitizeText(mentor.pronouns)
      const mentoringStyle = sanitizeText(mentor.mentoring_style)
      const meetingStyle = sanitizeText(mentor.meeting_style)
      const mentorEnergy = sanitizeText(mentor.mentor_energy)
      const feedbackStyle = sanitizeText(mentor.feedback_style)
      const motivation = sanitizeText(mentor.motivation)
      const expectations = sanitizeText(mentor.expectations)
      const otherExperiences = sanitizeText(mentor.other_experience)

      const preferredLevels = Array.isArray(mentor.preferred_mentee_levels) && mentor.preferred_mentee_levels.length > 0
        ? mentor.preferred_mentee_levels.join(', ')
        : null

      const topicsNotToMentor = Array.isArray(mentor.topics_not_to_mentor) && mentor.topics_not_to_mentor.length > 0
        ? mentor.topics_not_to_mentor.join(', ')
        : null

      return {
        cohort_id: cohortId,
        mentor_id: mentor.id,
        full_name: mentor.name || mentor.id,
        role: sanitizeText(mentor.role) || 'Pending role',
        experience_years: parseExperienceYears(mentor.experience_years),
        location_timezone: sanitizeText(mentor.location_timezone) || 'Not specified',
        life_experiences: buildMentorLifeExperiences(mentor),
        topics_to_mentor: Array.isArray(mentor.topics_to_mentor) ? mentor.topics_to_mentor : [],
        capacity_remaining: typeof mentor.capacity_remaining === 'number' ? mentor.capacity_remaining : 0,
        meeting_frequency: sanitizeText(mentor.meeting_frequency) || 'Not set',
        languages,
        industry,
        ...(pronouns ? { pronouns } : {}),
        ...(otherExperiences ? { other_experiences: otherExperiences } : {}),
        ...(typeof mentor.has_mentored_before === 'boolean' ? { has_mentored_before: mentor.has_mentored_before } : {}),
        ...(mentoringStyle ? { mentoring_style: mentoringStyle } : {}),
        ...(meetingStyle ? { meeting_style: meetingStyle } : {}),
        ...(mentorEnergy ? { mentor_energy: mentorEnergy } : {}),
        ...(feedbackStyle ? { feedback_style: feedbackStyle } : {}),
        ...(preferredLevels ? { preferred_mentee_level: preferredLevels } : {}),
        ...(topicsNotToMentor ? { topics_not_to_mentor: topicsNotToMentor } : {}),
        ...(motivation ? { motivation } : {}),
        ...(expectations ? { expectations } : {})
      }
    })

    if (mentorInserts.length === 0) {
      console.log('Skipping mentor insert - no new records to add');
    } else {
      console.log('About to insert mentors:', {
        sampleRecord: mentorInserts[0],
        sampleRecordKeys: Object.keys(mentorInserts[0]),
        totalRecords: mentorInserts.length
      });

      const { error: mentorError } = await supabase
        .from('mentors')
        .insert(mentorInserts)

      if (mentorError) {
        console.error('=== MENTOR INSERT ERROR ===');
        console.error('Error code:', mentorError.code);
        console.error('Error message:', mentorError.message);
        console.error('Error details:', mentorError.details);
        console.error('Sample data:', JSON.stringify(mentorInserts[0], null, 2));
        console.error('=== END ERROR ===');
        throw new Error('Failed to insert mentors: ' + mentorError.message)
      }
    }
  }

  // Return updated cohort
  return getCohortById(cohortId)
}


// Add matching results to history without launching
export async function addMatchingToHistory(cohortId: string, matches: MatchingOutput): Promise<Cohort | null> {
  // Get the current cohort to access existing history
  const currentCohort = await getCohortById(cohortId);
  if (!currentCohort) return null;

  // Create a new history entry
  const averageScore = matches.results.length > 0
    ? matches.results
        .filter(r => r.recommendations?.[0])
        .reduce((sum, r) => sum + (r.recommendations[0]?.score?.total_score || 0), 0) /
      Math.max(1, matches.results.filter(r => r.recommendations?.[0]).length)
    : 0;

  const historyEntry: MatchingHistoryEntry = {
    id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: matches.timestamp || new Date().toISOString(),
    mode: matches.mode,
    stats: matches.stats,
    launched: false, // This function is for generated but not yet launched matches
    matches_count: matches.results.length,
    average_score: averageScore
  };

  // Add to existing history
  const updatedHistory = [...(currentCohort.matching_history || []), historyEntry];

  const result = await updateCohort(cohortId, {
    matching_history: updatedHistory
  })

  // If matching_history column doesn't exist, just skip it silently
  if (!result) {
    console.warn('Could not save matching history (column may not exist in database)');
    return getCohortById(cohortId);
  }

  return result;
}

// Save matching results to cohort
export async function saveMatchesToCohort(cohortId: string, matches: MatchingOutput): Promise<Cohort | null> {
  console.log('saveMatchesToCohort called with:', { cohortId, matches });

  // Get the current cohort to access existing history
  const currentCohort = await getCohortById(cohortId);
  console.log('Current cohort retrieved:', currentCohort);

  if (!currentCohort) {
    console.error('Could not retrieve current cohort');
    return null;
  }

  // Create a new history entry
  const validResults = matches.results?.filter(r => r.recommendations?.[0]?.score?.total_score) || [];
  const averageScore = validResults.length > 0
    ? validResults.reduce((sum, r) => sum + r.recommendations[0].score.total_score, 0) / validResults.length
    : 0;

  const historyEntry: MatchingHistoryEntry = {
    id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: matches.timestamp || new Date().toISOString(),
    mode: matches.mode,
    stats: matches.stats,
    launched: true, // This function is called when matches are approved/launched
    matches_count: matches.results?.length || 0,
    average_score: averageScore
  };

  console.log('Created history entry:', historyEntry);

  // Add to existing history
  const updatedHistory = [...(currentCohort.matching_history || []), historyEntry];

  console.log('Updating cohort with:', { matches, matching_history: updatedHistory });

  // Validate data can be serialized and log payload size
  try {
    const payload = JSON.stringify({ matches, matching_history: updatedHistory });
    console.log(`Payload size: ${(payload.length / 1024).toFixed(1)}KB, results: ${matches.results?.length || 0}`);
  } catch (serializationError) {
    console.error('Data serialization error:', serializationError);
    return null;
  }

  try {
    // Count how many mentees are assigned to each mentor
    const mentorAssignmentCounts = new Map<string, number>();

    matches.results.forEach(result => {
      const assignedMentorId = result.proposed_assignment?.mentor_id;
      if (assignedMentorId) {
        const currentCount = mentorAssignmentCounts.get(assignedMentorId) || 0;
        mentorAssignmentCounts.set(assignedMentorId, currentCount + 1);
      }
    });

    console.log('Mentor assignment counts:', Object.fromEntries(mentorAssignmentCounts));

    // Update capacity_remaining for each affected mentor in the database
    for (const [mentorId, assignmentCount] of mentorAssignmentCounts.entries()) {
      console.log(`Updating capacity for mentor ${mentorId}: reducing by ${assignmentCount}`);

      // Get current mentor capacity
      const { data: mentorData, error: fetchError } = await supabase
        .from('mentors')
        .select('capacity_remaining')
        .eq('cohort_id', cohortId)
        .eq('mentor_id', mentorId)
        .single();

      if (fetchError) {
        console.error(`Error fetching mentor ${mentorId}:`, fetchError);
        continue;
      }

      if (mentorData) {
        const currentCapacity = mentorData.capacity_remaining;
        const newCapacity = Math.max(0, currentCapacity - assignmentCount);

        console.log(`Mentor ${mentorId}: current capacity ${currentCapacity} -> new capacity ${newCapacity}`);

        // Update the mentor's capacity
        const { error: updateError } = await supabase
          .from('mentors')
          .update({ capacity_remaining: newCapacity })
          .eq('cohort_id', cohortId)
          .eq('mentor_id', mentorId);

        if (updateError) {
          console.error(`Error updating capacity for mentor ${mentorId}:`, updateError);
        } else {
          console.log(`Successfully updated capacity for mentor ${mentorId}`);
        }
      }
    }

    // Try saving matches and matching_history together first
    let result = await updateCohort(cohortId, {
      matches,
      matching_history: updatedHistory
    });

    // If the combined update failed, try saving just matches
    // (matching_history column may not exist in older database schemas)
    if (!result) {
      console.warn('Combined update failed, trying to save just matches...');
      result = await updateCohort(cohortId, { matches });

      if (result) {
        console.log('Saved matches successfully (matching_history skipped - column may not exist in database)');
      }
    }

    console.log('updateCohort result:', result);
    return result;
  } catch (error) {
    console.error('Error in saveMatchesToCohort:', error);
    return null;
  }
}

// Delete/unassign a mentor-mentee pair
export async function deletePair(cohortId: string, menteeId: string): Promise<Cohort | null> {
  console.log('Deleting pair for mentee:', menteeId, 'in cohort:', cohortId);

  // Get the current cohort
  const currentCohort = await getCohortById(cohortId);
  if (!currentCohort || !currentCohort.matches?.results) {
    console.error('Could not retrieve current cohort or no matches found');
    return null;
  }

  // Create updated matches with the specified pair unassigned
  const updatedResults = currentCohort.matches.results.map(result => {
    if (result.mentee_id === menteeId) {
      return {
        ...result,
        proposed_assignment: {
          mentor_id: null,
          mentor_name: null
        }
      };
    }
    return result;
  });

  const updatedMatches = {
    ...currentCohort.matches,
    results: updatedResults
  };

  console.log('Updated matches after deletion:', updatedMatches);

  try {
    const result = await updateCohort(cohortId, {
      matches: updatedMatches
    });

    console.log('Delete pair result:', result);
    return result;
  } catch (error) {
    console.error('Error deleting pair:', error);
    return null;
  }
}

// Re-assign a mentor to a mentee (for re-matching unassigned pairs)
export async function assignPair(cohortId: string, menteeId: string, mentorId: string, mentorName?: string): Promise<Cohort | null> {
  console.log('Assigning pair:', { menteeId, mentorId, mentorName });

  // Get the current cohort
  const currentCohort = await getCohortById(cohortId);
  if (!currentCohort || !currentCohort.matches?.results) {
    console.error('Could not retrieve current cohort or no matches found');
    return null;
  }

  // Update the specific mentee's assignment
  const updatedResults = currentCohort.matches.results.map(result => {
    if (result.mentee_id === menteeId) {
      return {
        ...result,
        proposed_assignment: {
          mentor_id: mentorId,
          mentor_name: mentorName || mentorId
        }
      };
    }
    return result;
  });

  const updatedMatches = {
    ...currentCohort.matches,
    results: updatedResults
  };

  try {
    const result = await updateCohort(cohortId, {
      matches: updatedMatches
    });

    console.log('Assign pair result:', result);
    return result;
  } catch (error) {
    console.error('Error assigning pair:', error);
    return null;
  }
}

// Generate unique ID for mentees/mentors
function generatePersonId(type: 'mentee' | 'mentor'): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Sign up a new mentee
export async function signupMentee(menteeData: {
  pronouns?: string
  role: string
  experienceYears: string
  locationTimezone: string
  lifeExperiences: string[]
  otherExperience?: string
  hasParticipatedBefore?: boolean
  topicsToLearn: string[]
  otherTopics?: string
  motivation?: string
  mainReason?: string
  preferredStyle?: string
  preferredEnergy?: string
  feedbackPreference?: string
  mentorExperienceImportance?: string
  unwantedQualities?: string
  meetingFrequency: string
  mentorQualities?: string
  expectations?: string
  cohortId?: string
}): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const menteeId = generatePersonId('mentee')

    // Insert into old mentees table (for backward compatibility)
    const insertData = {
      cohort_id: menteeData.cohortId || 'unassigned',
      mentee_id: menteeId,
      pronouns: menteeData.pronouns || null,
      role: menteeData.role,
      experience_years: parseInt(menteeData.experienceYears.split('-')[0]) || 0,
      location_timezone: menteeData.locationTimezone,
      life_experiences: menteeData.lifeExperiences,
      other_experience: menteeData.otherExperience || null,
      topics_to_learn: menteeData.topicsToLearn,
      other_topics: menteeData.otherTopics || null,
      motivation: menteeData.motivation || null,
      main_reason: menteeData.mainReason || null,
      preferred_style: menteeData.preferredStyle || null,
      preferred_energy: menteeData.preferredEnergy || null,
      feedback_preference: menteeData.feedbackPreference || null,
      mentor_experience_importance: menteeData.mentorExperienceImportance || null,
      unwanted_qualities: menteeData.unwantedQualities || null,
      meeting_frequency: menteeData.meetingFrequency,
      mentor_qualities: menteeData.mentorQualities || null,
      expectations: menteeData.expectations || null,
      has_participated_before: menteeData.hasParticipatedBefore || false,
      languages: ['English'], // Default
      industry: 'Technology' // Default
    }

    const { error: menteeError } = await supabase
      .from('mentees')
      .insert(insertData)

    if (menteeError) {
      console.error('Error signing up mentee:', menteeError)
      console.error('Insert data that failed:', insertData)
      return { success: false, error: menteeError.message }
    }

    // Also insert into new user_profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        legacy_user_id: menteeId,
        full_name: '', // To be filled later
        role_title: menteeData.role,
        location_timezone: menteeData.locationTimezone,
        languages: menteeData.lifeExperiences.join(', '),
        experience_years: parseInt(menteeData.experienceYears.split('-')[0]) || 0,
        current_skills: menteeData.topicsToLearn.join(', '),
        target_skills: '',
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Don't fail the signup if profile creation fails
    }

    // If cohortId provided, create program_participant record
    if (menteeData.cohortId && userProfile) {
      const { error: participantError } = await supabase
        .from('program_participants')
        .insert({
          user_id: userProfile.id,
          program_cohort_id: menteeData.cohortId,
          role: 'mentee',
        })

      if (participantError) {
        console.error('Error creating program participant:', participantError)
        // Don't fail the signup
      }
    }

    return { success: true, userId: menteeId }
  } catch (error) {
    console.error('Error in signupMentee:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign up a new mentor
export async function signupMentor(mentorData: {
  pronouns?: string
  role: string
  experienceYears: string
  locationTimezone: string
  lifeExperiences: string[]
  otherExperiences?: string
  topicsToMentor: string[]
  otherTopics?: string
  hasMentoredBefore?: boolean
  mentoringStyle?: string
  meetingStyle?: string
  mentorEnergy?: string
  feedbackStyle?: string
  preferredMenteeLevel?: string
  topicsNotToMentor?: string
  meetingFrequency: string
  motivation?: string
  expectations?: string
  cohortId?: string
}): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const mentorId = generatePersonId('mentor')

    // Insert into old mentors table (for backward compatibility)
    const insertData = {
      cohort_id: mentorData.cohortId || 'unassigned',
      mentor_id: mentorId,
      pronouns: mentorData.pronouns || null,
      role: mentorData.role,
      experience_years: parseInt(mentorData.experienceYears.split('-')[0]) || 0,
      location_timezone: mentorData.locationTimezone,
      life_experiences: mentorData.lifeExperiences,
      other_experiences: mentorData.otherExperiences || null,
      topics_to_mentor: mentorData.topicsToMentor,
      other_topics: mentorData.otherTopics || null,
      has_mentored_before: mentorData.hasMentoredBefore || null,
      mentoring_style: mentorData.mentoringStyle || null,
      meeting_style: mentorData.meetingStyle || null,
      mentor_energy: mentorData.mentorEnergy || null,
      feedback_style: mentorData.feedbackStyle || null,
      preferred_mentee_level: mentorData.preferredMenteeLevel || null,
      topics_not_to_mentor: mentorData.topicsNotToMentor || null,
      meeting_frequency: mentorData.meetingFrequency,
      motivation: mentorData.motivation || null,
      // expectations omitted to match Supabase schema
      capacity_remaining: 3, // Default capacity
      languages: ['English'], // Default
      industry: 'Technology' // Default
    }

    const { error: mentorError } = await supabase
      .from('mentors')
      .insert(insertData)

    if (mentorError) {
      console.error('Error signing up mentor:', mentorError)
      return { success: false, error: mentorError.message }
    }

    // Also insert into new user_profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        legacy_user_id: mentorId,
        full_name: '', // To be filled later
        role_title: mentorData.role,
        location_timezone: mentorData.locationTimezone,
        languages: mentorData.lifeExperiences.join(', '),
        experience_years: parseInt(mentorData.experienceYears.split('-')[0]) || 0,
        current_skills: mentorData.topicsToMentor.join(', '),
        target_skills: '',
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Don't fail the signup if profile creation fails
    }

    // If cohortId provided, create program_participant record
    if (mentorData.cohortId && userProfile) {
      const { error: participantError } = await supabase
        .from('program_participants')
        .insert({
          user_id: userProfile.id,
          program_cohort_id: mentorData.cohortId,
          role: 'mentor',
        })

      if (participantError) {
        console.error('Error creating program participant:', participantError)
        // Don't fail the signup
      }
    }

    return { success: true, userId: mentorId }
  } catch (error) {
    console.error('Error in signupMentor:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export type MenteeMatchStatus = 'unassigned' | 'awaiting_match' | 'match_pending' | 'matched'

export interface MenteeDashboardData {
  menteeId: string
  cohortId: string
  cohortName?: string | null
  cohortStatus?: CohortRow['status']
  matchStatus: MenteeMatchStatus
  assignedMentor?: {
    mentorId: string
    mentorRole?: string | null
    meetingFrequency?: string | null
    locationTimezone?: string | null
    capacityRemaining?: number | null
  }
  recommendations: {
    mentorId: string
    mentorName?: string | null
    score?: number
  }[]
  topicsToLearn: string[]
  meetingFrequency?: string | null
  languages?: string[]
  industry?: string | null
}

export type MentorWorkloadStatus = 'under_capacity' | 'at_capacity' | 'over_capacity'

export interface MentorDashboardData {
  mentorId: string
  cohortId: string
  cohortName?: string | null
  cohortStatus?: CohortRow['status']
  capacityRemaining: number
  status: MentorWorkloadStatus
  meetingFrequency?: string | null
  topicsToMentor: string[]
  assignedMentees: {
    menteeId: string
    menteeRole: string
    meetingFrequency: string
    topicsToLearn: string[]
    matchScore?: number
    cohortId: string
  }[]
  pendingRequests: {
    menteeId: string
    menteeRole: string
    menteeMeetingFrequency: string
    matchScore?: number
    cohortId: string
  }[]
}

export async function getMenteeDashboardData(menteeId: string): Promise<MenteeDashboardData | null> {
  const { data: mentee, error: menteeError } = await supabase
    .from('mentees')
    .select('*')
    .eq('mentee_id', menteeId)
    .single()

  if (menteeError) {
    console.error('Error fetching mentee for dashboard:', menteeError)
    return null
  }

  if (!mentee) {
    return null
  }

  let cohort: CohortRow | null = null
  let matches: MatchingOutput | undefined

  if (mentee.cohort_id && mentee.cohort_id !== 'unassigned') {
    const { data: cohortRow, error: cohortError } = await supabase
      .from('cohorts')
      .select('*')
      .eq('id', mentee.cohort_id)
      .single()

    if (cohortError) {
      console.error('Error fetching cohort for mentee dashboard:', cohortError)
    } else {
      cohort = cohortRow
      matches = cohortRow?.matches as MatchingOutput | undefined
    }
  }

  let matchStatus: MenteeMatchStatus = mentee.cohort_id && mentee.cohort_id !== 'unassigned'
    ? 'awaiting_match'
    : 'unassigned'

  let assignedMentor: MenteeDashboardData['assignedMentor']
  let recommendations: MenteeDashboardData['recommendations'] = []

  if (matches) {
    const match = matches.results?.find(result => result.mentee_id === mentee.mentee_id)

    if (match) {
      if (match.recommendations && match.recommendations.length > 0) {
        recommendations = match.recommendations.map(rec => ({
          mentorId: rec.mentor_id,
          mentorName: rec.mentor_name,
          score: rec.score?.total_score
        }))
      }

      if (match.proposed_assignment?.mentor_id) {
        matchStatus = 'matched'
        const mentorId = match.proposed_assignment.mentor_id

        const { data: mentorRow, error: mentorError } = await supabase
          .from('mentors')
          .select('*')
          .eq('mentor_id', mentorId)
          .single()

        if (mentorError) {
          console.error('Error fetching assigned mentor:', mentorError)
        } else if (mentorRow) {
          assignedMentor = {
            mentorId: mentorRow.mentor_id,
            mentorRole: mentorRow.role,
            meetingFrequency: mentorRow.meeting_frequency,
            locationTimezone: mentorRow.location_timezone,
            capacityRemaining: mentorRow.capacity_remaining
          }
        }
      } else if (match.recommendations && match.recommendations.length > 0) {
        matchStatus = 'match_pending'
      } else {
        matchStatus = 'awaiting_match'
      }
    }
  }

  return {
    menteeId: mentee.mentee_id,
    cohortId: mentee.cohort_id,
    cohortName: cohort?.name,
    cohortStatus: cohort?.status,
    matchStatus,
    assignedMentor,
    recommendations,
    topicsToLearn: mentee.topics_to_learn || [],
    meetingFrequency: mentee.meeting_frequency,
    languages: mentee.languages || [],
    industry: mentee.industry
  }
}

export async function getMentorDashboardData(mentorId: string): Promise<MentorDashboardData | null> {
  const { data: mentor, error: mentorError } = await supabase
    .from('mentors')
    .select('*')
    .eq('mentor_id', mentorId)
    .single()

  if (mentorError) {
    console.error('Error fetching mentor for dashboard:', mentorError)
    return null
  }

  if (!mentor) {
    return null
  }

  let cohort: CohortRow | null = null
  let matches: MatchingOutput | undefined

  if (mentor.cohort_id && mentor.cohort_id !== 'unassigned') {
    const { data: cohortRow, error: cohortError } = await supabase
      .from('cohorts')
      .select('*')
      .eq('id', mentor.cohort_id)
      .single()

    if (cohortError) {
      console.error('Error fetching cohort for mentor dashboard:', cohortError)
    } else {
      cohort = cohortRow
      matches = cohortRow?.matches as MatchingOutput | undefined
    }
  }

  const assignedMatches = matches?.results?.filter(result => result.proposed_assignment?.mentor_id === mentor.mentor_id) || []
  const pendingMatches = matches?.results?.filter(result =>
    result.proposed_assignment?.mentor_id !== mentor.mentor_id &&
    result.recommendations?.some(rec => rec.mentor_id === mentor.mentor_id)
  ) || []

  const relevantMenteeIds = Array.from(new Set([
    ...assignedMatches.map(match => match.mentee_id).filter(Boolean),
    ...pendingMatches.map(match => match.mentee_id).filter(Boolean)
  ]))

  let menteeRows: MenteeRow[] = []

  if (relevantMenteeIds.length > 0) {
    const { data: mentees, error: menteeError } = await supabase
      .from('mentees')
      .select('*')
      .in('mentee_id', relevantMenteeIds)

    if (menteeError) {
      console.error('Error fetching mentees for mentor dashboard:', menteeError)
    } else if (mentees) {
      menteeRows = mentees
    }
  }

  const menteeMap = menteeRows.reduce((acc: Record<string, MenteeRow>, row) => {
    acc[row.mentee_id] = row
    return acc
  }, {} as Record<string, MenteeRow>)

  const assignedMentees: MentorDashboardData['assignedMentees'] = assignedMatches.map(match => {
    const mentee = menteeMap[match.mentee_id]
    return {
      menteeId: match.mentee_id,
      menteeRole: mentee?.role || 'Mentee',
      meetingFrequency: mentee?.meeting_frequency || 'Not set',
      topicsToLearn: mentee?.topics_to_learn || [],
      matchScore: match.recommendations?.find(rec => rec.mentor_id === mentor.mentor_id)?.score?.total_score,
      cohortId: mentee?.cohort_id || mentor.cohort_id
    }
  })

  const pendingRequests: MentorDashboardData['pendingRequests'] = pendingMatches.map(match => {
    const mentee = menteeMap[match.mentee_id]
    return {
      menteeId: match.mentee_id,
      menteeRole: mentee?.role || 'Mentee',
      menteeMeetingFrequency: mentee?.meeting_frequency || 'Not set',
      matchScore: match.recommendations?.find(rec => rec.mentor_id === mentor.mentor_id)?.score?.total_score,
      cohortId: mentee?.cohort_id || mentor.cohort_id
    }
  })

  let status: MentorWorkloadStatus = 'under_capacity'

  if (mentor.capacity_remaining < 0) {
    status = 'over_capacity'
  } else if (mentor.capacity_remaining === 0) {
    status = 'at_capacity'
  }

  return {
    mentorId: mentor.mentor_id,
    cohortId: mentor.cohort_id,
    cohortName: cohort?.name,
    cohortStatus: cohort?.status,
    capacityRemaining: mentor.capacity_remaining,
    status,
    meetingFrequency: mentor.meeting_frequency,
    topicsToMentor: mentor.topics_to_mentor || [],
    assignedMentees,
    pendingRequests
  }
}


// Get unassigned mentees and mentors (holding area)
export async function getUnassignedSignups(): Promise<{
  mentees: MenteeRow[]
  mentors: MentorRow[]
}> {
  const { data: mentees } = await supabase
    .from('mentees')
    .select('*')
    .eq('cohort_id', 'unassigned')
    .order('created_at', { ascending: false })

  const { data: mentors } = await supabase
    .from('mentors')
    .select('*')
    .eq('cohort_id', 'unassigned')
    .order('created_at', { ascending: false })

  return {
    mentees: mentees || [],
    mentors: mentors || []
  }
}

// Move person from holding to a cohort
export async function assignToCohort(
  personId: string,
  personType: 'mentee' | 'mentor',
  cohortId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const table = personType === 'mentee' ? 'mentees' : 'mentors'
    const idField = personType === 'mentee' ? 'mentee_id' : 'mentor_id'

    const { error } = await supabase
      .from(table)
      .update({ cohort_id: cohortId })
      .eq(idField, personId)

    if (error) {
      console.error(`Error assigning ${personType} to cohort:`, error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error(`Error in assign${personType}ToCohort:`, error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Get cohorts for a specific user
export async function getUserCohorts(userId: string, userType: 'mentor' | 'mentee'): Promise<Cohort[]> {
  try {
    const table = userType === 'mentee' ? 'mentees' : 'mentors'
    const idField = userType === 'mentee' ? 'mentee_id' : 'mentor_id'

    // First get the user to find their cohorts
    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('cohort_id')
      .eq(idField, userId)

    if (userError) {
      console.error('Error fetching user data:', userError)
      return []
    }

    if (!userData || userData.length === 0) {
      return []
    }

    // Get unique cohort IDs
    const cohortIds = [...new Set(userData.map(u => u.cohort_id).filter(id => id !== 'unassigned'))]

    if (cohortIds.length === 0) {
      return []
    }

    // Fetch cohort details
    const { data: cohorts, error: cohortsError } = await supabase
      .from('cohorts')
      .select('*')
      .in('id', cohortIds)
      .order('created_at', { ascending: false })

    if (cohortsError) {
      console.error('Error fetching cohorts:', cohortsError)
      return []
    }

    // Fetch mentees and mentors for each cohort
    const cohortsWithData = await Promise.all(
      cohorts.map(async (cohort) => {
        const [menteesResult, mentorsResult] = await Promise.all([
          supabase.from('mentees').select('*').eq('cohort_id', cohort.id),
          supabase.from('mentors').select('*').eq('cohort_id', cohort.id)
        ])

        const mentees = menteesResult.data?.map(dbMenteeToMentee) || []
        const mentors = mentorsResult.data?.map(dbMentorToMentor) || []

        return dbCohortToCohort(cohort, mentees, mentors)
      })
    )

    return cohortsWithData
  } catch (error) {
    console.error('Error in getUserCohorts:', error)
    return []
  }
}

// Update mentee profile
export async function updateMenteeProfile(
  menteeId: string,
  updates: {
    role?: string
    experience_years?: number
    location_timezone?: string
    topics_to_learn?: string[]
    meeting_frequency?: string
    languages?: string[]
    industry?: string
    profile_goals?: any[]
    private_notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('mentees')
      .update(updates)
      .eq('mentee_id', menteeId)

    if (error) {
      console.error('Error updating mentee profile:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateMenteeProfile:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Update mentor profile
export async function updateMentorProfile(
  mentorId: string,
  updates: {
    role?: string
    experience_years?: number
    location_timezone?: string
    topics_to_mentor?: string[]
    capacity_remaining?: number
    meeting_frequency?: string
    languages?: string[]
    industry?: string
    profile_goals?: any[]
    private_notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('mentors')
      .update(updates)
      .eq('mentor_id', mentorId)

    if (error) {
      console.error('Error updating mentor profile:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateMentorProfile:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

