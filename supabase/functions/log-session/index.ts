
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const VALID_DURATIONS = [15, 30, 45, 60, 90, 120];

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
    const expectedKey = Deno.env.get('LOG_SESSION_API_KEY');
    if (!expectedKey || apiKey !== expectedKey) {
      return errorResponse(401, 'Invalid or missing API key');
    }

    const body = await req.json();
    const { respondent_name, respondent_email, date, duration_minutes, rating } = body;

    // Validate required fields — at least one of name or email is needed
    if (!respondent_name && !respondent_email) {
      return errorResponse(400, 'At least one of respondent_name or respondent_email is required');
    }
    if (!date || !duration_minutes || !rating) {
      return errorResponse(400, 'Missing required fields: date, duration_minutes, rating');
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

    // Get all non-completed cohorts with their mentees, mentors, and matches
    const { data: cohorts, error: cohortsError } = await supabaseAdmin
      .from('cohorts')
      .select('*')
      .in('status', ['active', 'draft']);

    if (cohortsError) {
      console.error('Error fetching cohorts:', cohortsError);
      return errorResponse(500, 'Failed to look up cohorts');
    }

    // Auto-detect: if respondent_name looks like an email, treat it as one
    let effectiveName = respondent_name?.trim() || '';
    let effectiveEmail = respondent_email?.trim() || '';
    if (effectiveName.includes('@') && !effectiveEmail) {
      effectiveEmail = effectiveName;
      effectiveName = '';
    }

    const normalizedName = effectiveName.toLowerCase();
    const normalizedEmail = effectiveEmail.toLowerCase();
    const candidates: Array<{
      mentor_id: string;
      mentee_id: string;
      cohort_id: string;
      cohort_name: string;
      mentor_name: string;
      mentee_name: string;
      respondent_role: 'mentor' | 'mentee';
    }> = [];

    console.log(`[debug] Found ${cohorts?.length || 0} cohorts, searching for email="${normalizedEmail}" name="${normalizedName}"`);

    for (const cohort of cohorts || []) {
      const matches = cohort.matches as any;
      const manualMatches = cohort.manual_matches as any;
      const hasAlgoMatches = matches?.results?.length > 0;
      const hasManualMatches = manualMatches?.matches?.length > 0;

      console.log(`[debug] Cohort "${cohort.name}" (${cohort.id}) status=${cohort.status} algoMatches=${hasAlgoMatches} manualMatches=${hasManualMatches}`);
      if (hasManualMatches) {
        console.log(`[debug] Manual matches:`, JSON.stringify(manualMatches.matches.map((m: any) => ({ mentee_id: m.mentee_id, mentor_id: m.mentor_id }))));
      }

      if (!hasAlgoMatches && !hasManualMatches) continue;

      // Fetch mentees and mentors for this cohort
      const [menteesResult, mentorsResult] = await Promise.all([
        supabaseAdmin.from('mentees').select('mentee_id, full_name, email').eq('cohort_id', cohort.id),
        supabaseAdmin.from('mentors').select('mentor_id, full_name, email').eq('cohort_id', cohort.id),
      ]);

      const mentees = menteesResult.data || [];
      const mentors = mentorsResult.data || [];

      console.log(`[debug] Mentees:`, mentees.map(m => ({ id: m.mentee_id, name: m.full_name, email: m.email })));
      console.log(`[debug] Mentors:`, mentors.map(m => ({ id: m.mentor_id, name: m.full_name, email: m.email })));

      // Build a unified list of pairs from both algorithm and manual matches
      const allPairs: Array<{ mentee_id: string; mentor_id: string }> = [];

      if (hasAlgoMatches) {
        for (const r of matches.results) {
          if (r.proposed_assignment?.mentor_id) {
            allPairs.push({ mentee_id: r.mentee_id, mentor_id: r.proposed_assignment.mentor_id });
          }
        }
      }
      if (hasManualMatches) {
        for (const m of manualMatches.matches) {
          allPairs.push({ mentee_id: m.mentee_id, mentor_id: m.mentor_id });
        }
      }

      console.log(`[debug] All pairs:`, JSON.stringify(allPairs));

      // Check mentees — email match takes priority over name match
      for (const mentee of mentees) {
        const emailMatch = normalizedEmail && mentee.email?.trim().toLowerCase() === normalizedEmail;
        const nameMatch = normalizedName && mentee.full_name?.trim().toLowerCase() === normalizedName;
        if (emailMatch || nameMatch) {
          const pairedEntries = allPairs.filter(p => p.mentee_id === mentee.mentee_id);
          for (const pair of pairedEntries) {
            const mentor = mentors.find((m: any) => m.mentor_id === pair.mentor_id);
            candidates.push({
              mentor_id: pair.mentor_id,
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

      // Check mentors — email match takes priority over name match
      for (const mentor of mentors) {
        const emailMatch = normalizedEmail && mentor.email?.trim().toLowerCase() === normalizedEmail;
        const nameMatch = normalizedName && mentor.full_name?.trim().toLowerCase() === normalizedName;
        if (emailMatch || nameMatch) {
          const pairedEntries = allPairs.filter(p => p.mentor_id === mentor.mentor_id);
          for (const pair of pairedEntries) {
            const mentee = mentees.find((m: any) => m.mentee_id === pair.mentee_id);
            candidates.push({
              mentor_id: mentor.mentor_id,
              mentee_id: pair.mentee_id,
              cohort_id: cohort.id,
              cohort_name: cohort.name,
              mentor_name: mentor.full_name || mentor.mentor_id,
              mentee_name: mentee?.full_name || 'Unknown',
              respondent_role: 'mentor',
            });
          }
        }
      }
    }

    if (candidates.length === 0) {
      const identifier = normalizedEmail || respondent_name;
      return errorResponse(404, `No active pair found for "${identifier}". Ensure the name or email matches exactly as registered.`);
    }

    if (candidates.length > 1) {
      const identifier = normalizedEmail || respondent_name;
      return errorResponse(
        409,
        `Multiple matches found for "${identifier}". Found in: ${candidates.map(c => `${c.cohort_name} (${c.mentee_name} & ${c.mentor_name})`).join(', ')}. Please resolve manually.`
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
