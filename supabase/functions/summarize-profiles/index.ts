import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  summarizeProfileFields,
  MENTEE_SUMMARY_FIELDS,
  MENTOR_SUMMARY_FIELDS,
} from '../_shared/summarize.ts';

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    // Auth
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('SURVEY_IMPORT_API_KEY');
    const authHeader = req.headers.get('authorization');

    if (!authHeader && (!expectedKey || apiKey !== expectedKey)) {
      return errorResponse(401, 'Invalid or missing authentication');
    }

    const body = await req.json().catch(() => ({}));
    const cohortId = body.cohort_id;
    const force = body.force === true;

    if (!cohortId) {
      return errorResponse(400, 'Missing cohort_id');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load mentees and mentors
    const [menteesRes, mentorsRes] = await Promise.all([
      supabaseAdmin.from('mentees').select('*').eq('cohort_id', cohortId),
      supabaseAdmin.from('mentors').select('*').eq('cohort_id', cohortId),
    ]);

    const mentees = menteesRes.data || [];
    const mentors = mentorsRes.data || [];
    console.log(`[summarize-profiles] cohort=${cohortId} mentees=${mentees.length} mentors=${mentors.length} force=${force}`);

    if (menteesRes.error) console.error('[summarize-profiles] mentees query error:', menteesRes.error);
    if (mentorsRes.error) console.error('[summarize-profiles] mentors query error:', mentorsRes.error);

    // Debug: log first mentee's summarizable field lengths
    if (mentees.length > 0) {
      const m = mentees[0];
      console.log(`[summarize-profiles] sample mentee ${m.full_name}: mentoring_goal=${m.mentoring_goal?.length || 0}, bio=${m.bio?.length || 0}, mentoring_goal_summary=${m.mentoring_goal_summary ? 'exists' : 'null'}`);
    }

    let profilesUpdated = 0;
    let fieldsUpdated = 0;
    const errors: string[] = [];

    // Process in batches of 5
    const BATCH_SIZE = 5;

    // Summarize mentees
    for (let i = 0; i < mentees.length; i += BATCH_SIZE) {
      const batch = mentees.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (mentee) => {
        try {
          const summaries = await summarizeProfileFields(mentee, MENTEE_SUMMARY_FIELDS, force);
          if (Object.keys(summaries).length > 0) {
            const { error } = await supabaseAdmin
              .from('mentees')
              .update(summaries)
              .eq('mentee_id', mentee.mentee_id)
              .eq('cohort_id', cohortId);
            if (error) {
              errors.push(`Mentee ${mentee.mentee_id}: ${error.message}`);
            } else {
              profilesUpdated++;
              fieldsUpdated += Object.keys(summaries).length;
            }
          }
        } catch (err) {
          errors.push(`Mentee ${mentee.mentee_id}: ${err.message}`);
        }
      }));
    }

    // Summarize mentors
    for (let i = 0; i < mentors.length; i += BATCH_SIZE) {
      const batch = mentors.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (mentor) => {
        try {
          // Map meaningful_impact → hard_earned_lesson for summarization
          const profile = {
            ...mentor,
            hard_earned_lesson: mentor.hard_earned_lesson || mentor.meaningful_impact,
          };
          const summaries = await summarizeProfileFields(profile, MENTOR_SUMMARY_FIELDS, force);
          if (Object.keys(summaries).length > 0) {
            const { error } = await supabaseAdmin
              .from('mentors')
              .update(summaries)
              .eq('mentor_id', mentor.mentor_id)
              .eq('cohort_id', cohortId);
            if (error) {
              errors.push(`Mentor ${mentor.mentor_id}: ${error.message}`);
            } else {
              profilesUpdated++;
              fieldsUpdated += Object.keys(summaries).length;
            }
          }
        } catch (err) {
          errors.push(`Mentor ${mentor.mentor_id}: ${err.message}`);
        }
      }));
    }

    console.log(`[summarize-profiles] done: profiles=${profilesUpdated} fields=${fieldsUpdated} errors=${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        profiles_updated: profilesUpdated,
        fields_updated: fieldsUpdated,
        total_participants: mentees.length + mentors.length,
        debug: {
          mentees_found: mentees.length,
          mentors_found: mentors.length,
          cohort_id_received: cohortId,
          mentees_query_error: menteesRes.error?.message || null,
          mentors_query_error: mentorsRes.error?.message || null,
        },
        ...(errors.length > 0 ? { errors } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[summarize-profiles] error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
