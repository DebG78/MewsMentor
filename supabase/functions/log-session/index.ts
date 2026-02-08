import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const VALID_DURATIONS = [15, 30, 45, 60, 90, 120];

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

serve(async (req) => {
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
    const expectedKey = Deno.env.get('LOG_SESSION_API_KEY');
    if (!expectedKey || apiKey !== expectedKey) {
      return errorResponse(401, 'Invalid or missing API key');
    }

    const body = await req.json();
    const { respondent_name, date, duration_minutes, rating } = body;

    // Validate required fields
    if (!respondent_name || !date || !duration_minutes || !rating) {
      return errorResponse(400, 'Missing required fields: respondent_name, date, duration_minutes, rating');
    }

    // Validate rating
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return errorResponse(400, 'Rating must be an integer between 1 and 5');
    }

    // Validate duration
    const durationNum = Number(duration_minutes);
    if (!VALID_DURATIONS.includes(durationNum)) {
      return errorResponse(400, `Duration must be one of: ${VALID_DURATIONS.join(', ')}`);
    }

    // Validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return errorResponse(400, 'Invalid date format');
    }

    // Create admin Supabase client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get all active cohorts with their mentees, mentors, and matches
    const { data: cohorts, error: cohortsError } = await supabaseAdmin
      .from('cohorts')
      .select('*')
      .eq('status', 'active');

    if (cohortsError) {
      console.error('Error fetching cohorts:', cohortsError);
      return errorResponse(500, 'Failed to look up cohorts');
    }

    const normalizedName = respondent_name.trim().toLowerCase();
    const candidates: Array<{
      mentor_id: string;
      mentee_id: string;
      cohort_id: string;
      cohort_name: string;
      mentor_name: string;
      mentee_name: string;
      respondent_role: 'mentor' | 'mentee';
    }> = [];

    for (const cohort of cohorts || []) {
      const matches = cohort.matches as any;
      if (!matches?.results) continue;

      // Fetch mentees and mentors for this cohort
      const [menteesResult, mentorsResult] = await Promise.all([
        supabaseAdmin.from('mentees').select('mentee_id, full_name').eq('cohort_id', cohort.id),
        supabaseAdmin.from('mentors').select('mentor_id, full_name').eq('cohort_id', cohort.id),
      ]);

      const mentees = menteesResult.data || [];
      const mentors = mentorsResult.data || [];

      // Check mentees
      for (const mentee of mentees) {
        if (mentee.full_name?.trim().toLowerCase() === normalizedName) {
          const match = matches.results.find(
            (r: any) => r.mentee_id === mentee.mentee_id && r.proposed_assignment?.mentor_id
          );
          if (match) {
            const mentor = mentors.find((m: any) => m.mentor_id === match.proposed_assignment.mentor_id);
            candidates.push({
              mentor_id: match.proposed_assignment.mentor_id,
              mentee_id: mentee.mentee_id,
              cohort_id: cohort.id,
              cohort_name: cohort.name,
              mentor_name: mentor?.full_name || 'Unknown',
              mentee_name: mentee.full_name || mentee.mentee_id,
              respondent_role: 'mentee',
            });
          }
        }
      }

      // Check mentors
      for (const mentor of mentors) {
        if (mentor.full_name?.trim().toLowerCase() === normalizedName) {
          const mentorMatches = matches.results.filter(
            (r: any) => r.proposed_assignment?.mentor_id === mentor.mentor_id
          );
          for (const match of mentorMatches) {
            const mentee = mentees.find((m: any) => m.mentee_id === match.mentee_id);
            candidates.push({
              mentor_id: mentor.mentor_id,
              mentee_id: match.mentee_id,
              cohort_id: cohort.id,
              cohort_name: cohort.name,
              mentor_name: mentor.full_name || mentor.mentor_id,
              mentee_name: mentee?.full_name || match.mentee_name || 'Unknown',
              respondent_role: 'mentor',
            });
          }
        }
      }
    }

    if (candidates.length === 0) {
      return errorResponse(404, `No active pair found for "${respondent_name}". Ensure the name matches exactly as registered.`);
    }

    if (candidates.length > 1) {
      return errorResponse(
        409,
        `Multiple matches found for "${respondent_name}". Found in: ${candidates.map(c => `${c.cohort_name} (${c.mentee_name} & ${c.mentor_name})`).join(', ')}. Please resolve manually.`
      );
    }

    const pair = candidates[0];

    // Determine which rating field to populate
    const ratingField = pair.respondent_role === 'mentee' ? 'mentee_rating' : 'mentor_rating';

    // Insert session
    const { error: insertError } = await supabaseAdmin
      .from('sessions')
      .insert({
        mentor_id: pair.mentor_id,
        mentee_id: pair.mentee_id,
        cohort_id: pair.cohort_id,
        title: 'Session logged externally',
        scheduled_datetime: parsedDate.toISOString(),
        duration_minutes: durationNum,
        status: 'completed',
        [ratingField]: ratingNum,
      });

    if (insertError) {
      console.error('Session insert error:', insertError);
      return errorResponse(500, 'Failed to log session');
    }

    return new Response(
      JSON.stringify({
        success: true,
        pair: `${pair.mentee_name} & ${pair.mentor_name}`,
        cohort: pair.cohort_name,
        logged_by: pair.respondent_role,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('log-session error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
