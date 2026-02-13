
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// Survey field mapping (mirrors src/lib/surveyFieldMapping.ts for Deno)
// ============================================================================

function findFieldByKeywords(
  body: Record<string, unknown>,
  keywordGroups: string[][],
): string | undefined {
  for (const keywords of keywordGroups) {
    for (const key of Object.keys(body)) {
      const lowerKey = key.toLowerCase();
      if (keywords.every(kw => lowerKey.includes(kw.toLowerCase()))) {
        const val = body[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }
  }
  return undefined;
}

function parseMultiSelect(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(';').map(s => s.trim()).filter(Boolean);
}

const TEXT_NUMBERS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
};

function parseCapacityText(value: string | undefined, defaultValue = 1): number {
  if (!value) return defaultValue;
  const cleaned = value.trim().toLowerCase();
  const num = parseInt(cleaned, 10);
  if (!isNaN(num) && num >= 0) return num;
  if (TEXT_NUMBERS[cleaned] !== undefined) return TEXT_NUMBERS[cleaned];
  const rangeMatch = cleaned.match(/^(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return Math.max(parseInt(rangeMatch[2], 10), 1);
  const plusMatch = cleaned.match(/^(\d+)\s*\+/);
  if (plusMatch) return parseInt(plusMatch[1], 10);
  return defaultValue;
}

const VALID_SENIORITY_BANDS = ['S1', 'S2', 'M1', 'M2', 'D1', 'D2', 'VP', 'SVP', 'LT'];

function parseSeniorityBand(value: string | undefined): string {
  if (!value) return 'S1';
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '');
  if (VALID_SENIORITY_BANDS.includes(cleaned)) return cleaned;
  return 'S1';
}

function parseMentoringExperience(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return lower.includes('mentored before') || lower.includes('helped informally');
}

function parseProficiency(val: string | undefined): number | null {
  if (!val) return null;
  const num = parseInt(val, 10);
  return !isNaN(num) ? num : null;
}

// ============================================================================
// Keyword patterns (same as surveyFieldMapping.ts)
// ============================================================================

const SHARED = {
  seniority_band: [['current level']],
  role: [['role title'], ['current role']],
  industry: [['select your function'], ['your function']],
  location_timezone: [['time-zone'], ['time zone'], ['preferred time']],
  bio: [['context about your role'], ['provide a little context'], ['role and focus']],
  role_selection: [['participate as'], ['want to participate']],
  email: [['email']],
  name: [['name']],
};

const MENTEE = {
  primary_capability: [['primary capability', 'build']],
  primary_capability_detail: [['domain expertise', 'more info']],
  secondary_capability: [['secondary capability', 'build']],
  primary_proficiency: [['proficiency', 'primary']],
  secondary_proficiency: [['proficiency', 'secondary']],
  mentoring_goal: [['mentoring goal'], ['using the format']],
  practice_scenarios: [['practice scenarios', 'choose'], ['practice arena']],
  mentor_help_wanted: [['mentor help'], ['kind of mentor help']],
  mentor_experience_importance: [['open to being mentored'], ['first-time mentor']],
  preferred_style: [['session style']],
  feedback_preference: [['feedback style']],
};

const MENTOR = {
  mentor_motivation: [['want to mentor'], ['hope to get out']],
  capacity: [['how many mentees']],
  mentoring_experience: [['first time mentoring'], ['first time mentor']],
  first_time_support: [['support would help you feel confident'], ['what support']],
  primary_capability: [['primary capability', 'strongest'], ['primary capability', 'mentoring on']],
  primary_capability_detail: [['domain expertise', 'more info']],
  secondary_capabilities: [['secondary capability']],
  primary_proficiency: [['proficiency', 'primary']],
  practice_scenarios: [['practice scenarios', 'strongest'], ['scenarios you\'re strongest']],
  hard_earned_lesson: [['hard-earned lesson'], ['hard earned lesson']],
  natural_strengths: [['naturally bring'], ['natural strengths']],
  meeting_style: [['session style']],
  topics_not_to_mentor: [['do not want to mentor'], ['prefer not to mentor']],
  excluded_scenarios: [['prefer not to support'], ['scenarios you prefer not']],
  match_exclusions: [['make a match not work'], ['anything else']],
};

// ============================================================================
// Edge Function
// ============================================================================

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('SURVEY_IMPORT_API_KEY');
    if (!expectedKey || apiKey !== expectedKey) {
      return errorResponse(401, 'Invalid or missing API key');
    }

    // Get cohort_id from query parameter (optional — defaults to 'unassigned')
    const url = new URL(req.url);
    const cohortIdParam = url.searchParams.get('cohort_id');
    const cohortId = cohortIdParam || 'unassigned';

    const body = await req.json();
    const f = (patterns: string[][]) => findFieldByKeywords(body, patterns);

    // Create admin Supabase client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify cohort exists and is in valid status (skip for 'unassigned')
    let cohortName = 'Unassigned';
    if (cohortId !== 'unassigned') {
      const { data: cohort, error: cohortError } = await supabaseAdmin
        .from('cohorts')
        .select('id, name, status')
        .eq('id', cohortId)
        .single();

      if (cohortError || !cohort) {
        return errorResponse(404, `Cohort not found: ${cohortId}`);
      }
      if (!['draft', 'active'].includes(cohort.status)) {
        return errorResponse(400, `Cohort "${cohort.name}" is in "${cohort.status}" status. Only draft/active cohorts accept survey imports.`);
      }
      cohortName = cohort.name;
    }

    // Extract shared fields
    const email = f(SHARED.email) || (body.email as string) || '';
    const name = f(SHARED.name) || (body.name as string) || '';
    if (!email && !name) {
      return errorResponse(400, 'At least one of email or name is required');
    }

    const seniorityBand = parseSeniorityBand(f(SHARED.seniority_band));
    const role = f(SHARED.role) || '';
    const industry = f(SHARED.industry) || '';
    const locationTimezone = f(SHARED.location_timezone) || '';
    const bio = f(SHARED.bio);

    // Determine role selection
    const roleRaw = f(SHARED.role_selection) || (body.role_selection as string) || 'mentee';
    const roleLower = roleRaw.toLowerCase();
    let roleSelection: 'mentee' | 'mentor' | 'both' = 'mentee';
    if (roleLower.includes('both') || (roleLower.includes('mentee') && roleLower.includes('mentor'))) {
      roleSelection = 'both';
    } else if (roleLower.includes('mentor')) {
      roleSelection = 'mentor';
    }

    // Split name
    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const results: string[] = [];

    // ---- MENTEE RECORD ----
    if (roleSelection === 'mentee' || roleSelection === 'both') {
      const primaryCapability = f(MENTEE.primary_capability);
      const mentoringGoal = f(MENTEE.mentoring_goal);

      const menteeRecord: Record<string, unknown> = {
        cohort_id: cohortId,
        first_name: firstName,
        last_name: lastName,
        full_name: name,
        email: email || null,
        role: role,
        seniority_band: seniorityBand,
        industry: industry,
        location_timezone: locationTimezone,
        bio: bio || null,
        primary_capability: primaryCapability || null,
        primary_capability_detail: f(MENTEE.primary_capability_detail) || null,
        secondary_capability: f(MENTEE.secondary_capability) || null,
        primary_proficiency: parseProficiency(f(MENTEE.primary_proficiency)),
        secondary_proficiency: parseProficiency(f(MENTEE.secondary_proficiency)),
        mentoring_goal: mentoringGoal || null,
        practice_scenarios: parseMultiSelect(f(MENTEE.practice_scenarios)),
        preferred_style: f(MENTEE.preferred_style) || null,
        feedback_preference: f(MENTEE.feedback_preference) || null,
        mentor_experience_importance: f(MENTEE.mentor_experience_importance) || null,
        // Populate legacy array for backward compat
        topics_to_learn: [primaryCapability, f(MENTEE.secondary_capability)].filter(Boolean),
      };

      const { data: menteeData, error: menteeError } = await supabaseAdmin
        .from('mentees')
        .upsert(menteeRecord, { onConflict: 'cohort_id,email' })
        .select('mentee_id')
        .single();

      if (menteeError) {
        console.error('Mentee upsert error:', menteeError);
        return errorResponse(500, `Failed to import mentee: ${menteeError.message}`);
      }

      results.push(`mentee:${menteeData.mentee_id}`);
    }

    // ---- MENTOR RECORD ----
    if (roleSelection === 'mentor' || roleSelection === 'both') {
      const primaryCapability = f(MENTOR.primary_capability);
      const mentorMotivation = f(MENTOR.mentor_motivation);
      const experienceText = f(MENTOR.mentoring_experience);

      const mentorRecord: Record<string, unknown> = {
        cohort_id: cohortId,
        first_name: firstName,
        last_name: lastName,
        full_name: name,
        email: email || null,
        role: role,
        seniority_band: seniorityBand,
        industry: industry,
        location_timezone: locationTimezone,
        bio: bio || null,
        mentor_motivation: mentorMotivation || null,
        capacity_remaining: parseCapacityText(f(MENTOR.capacity)),
        mentoring_experience: experienceText || null,
        has_mentored_before: parseMentoringExperience(experienceText),
        first_time_support: parseMultiSelect(f(MENTOR.first_time_support)),
        primary_capability: primaryCapability || null,
        primary_capability_detail: f(MENTOR.primary_capability_detail) || null,
        secondary_capabilities: parseMultiSelect(f(MENTOR.secondary_capabilities)),
        primary_proficiency: parseProficiency(f(MENTOR.primary_proficiency)),
        practice_scenarios: parseMultiSelect(f(MENTOR.practice_scenarios)),
        hard_earned_lesson: f(MENTOR.hard_earned_lesson) || null,
        natural_strengths: parseMultiSelect(f(MENTOR.natural_strengths)),
        meeting_style: f(MENTOR.meeting_style) || null,
        topics_not_to_mentor: parseMultiSelect(f(MENTOR.topics_not_to_mentor)),
        excluded_scenarios: parseMultiSelect(f(MENTOR.excluded_scenarios)),
        match_exclusions: f(MENTOR.match_exclusions) || null,
        // Populate legacy array for backward compat
        topics_to_mentor: [
          primaryCapability,
          ...parseMultiSelect(f(MENTOR.secondary_capabilities)),
        ].filter(Boolean),
      };

      const { data: mentorData, error: mentorError } = await supabaseAdmin
        .from('mentors')
        .upsert(mentorRecord, { onConflict: 'cohort_id,email' })
        .select('mentor_id')
        .single();

      if (mentorError) {
        console.error('Mentor upsert error:', mentorError);
        return errorResponse(500, `Failed to import mentor: ${mentorError.message}`);
      }

      results.push(`mentor:${mentorData.mentor_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohort: cohortName,
        role: roleSelection,
        records: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('import-survey-response error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
