
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  renderTemplate,
  type TemplateContext,
} from '../_shared/templates.ts';

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
    console.log('[log-session] Body keys:', Object.keys(body));
    const { respondent_name, slack_user_id, date, duration_minutes, rating, journey_phase, feedback, comments } = body;

    // Validate required fields — at least one of name or slack_user_id is needed
    if (!respondent_name && !slack_user_id) {
      return errorResponse(400, 'At least one of respondent_name or slack_user_id is required');
    }
    if (!rating) {
      return errorResponse(400, 'Missing required field: rating');
    }

    // Validate rating
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return errorResponse(400, 'Rating must be an integer between 1 and 5');
    }

    // Duration defaults to 60 if not provided; snap to nearest valid value
    const rawDuration = duration_minutes ? Number(duration_minutes) : 60;
    const durationNum = VALID_DURATIONS.includes(rawDuration)
      ? rawDuration
      : VALID_DURATIONS.reduce((prev, curr) =>
          Math.abs(curr - rawDuration) < Math.abs(prev - rawDuration) ? curr : prev
        );

    // Date defaults to now if not provided
    const parsedDate = date ? new Date(date) : new Date();
    if (isNaN(parsedDate.getTime())) {
      return errorResponse(400, 'Invalid date format');
    }

    // Capture feedback/comments from the form
    const sessionNotes = (feedback || comments || '').toString().trim() || null;

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

    const effectiveName = respondent_name?.trim() || '';
    const effectiveSlackUserId = slack_user_id?.trim() || '';

    const normalizedName = effectiveName.toLowerCase();
    const candidates: Array<{
      mentor_id: string;
      mentee_id: string;
      cohort_id: string;
      cohort_name: string;
      cohort_created_at: string;
      mentor_name: string;
      mentee_name: string;
      respondent_role: 'mentor' | 'mentee';
    }> = [];

    console.log(`[debug] Found ${cohorts?.length || 0} cohorts, searching for slack_user_id="${effectiveSlackUserId}" name="${normalizedName}"`);

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
        supabaseAdmin.from('mentees').select('mentee_id, full_name, slack_user_id').eq('cohort_id', cohort.id),
        supabaseAdmin.from('mentors').select('mentor_id, full_name, slack_user_id').eq('cohort_id', cohort.id),
      ]);

      const mentees = menteesResult.data || [];
      const mentors = mentorsResult.data || [];

      console.log(`[debug] Mentees:`, mentees.map(m => ({ id: m.mentee_id, name: m.full_name, slack_user_id: m.slack_user_id })));
      console.log(`[debug] Mentors:`, mentors.map(m => ({ id: m.mentor_id, name: m.full_name, slack_user_id: m.slack_user_id })));

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

      // Check mentees — slack_user_id match takes priority over name match
      for (const mentee of mentees) {
        const slackMatch = effectiveSlackUserId && mentee.slack_user_id === effectiveSlackUserId;
        const nameMatch = normalizedName && mentee.full_name?.trim().toLowerCase() === normalizedName;
        if (slackMatch || nameMatch) {
          const pairedEntries = allPairs.filter(p => p.mentee_id === mentee.mentee_id);
          for (const pair of pairedEntries) {
            const mentor = mentors.find((m: any) => m.mentor_id === pair.mentor_id);
            candidates.push({
              mentor_id: pair.mentor_id,
              mentee_id: mentee.mentee_id,
              cohort_id: cohort.id,
              cohort_name: cohort.name,
              cohort_created_at: cohort.created_at || '',
              mentor_name: mentor?.full_name || 'Unknown',
              mentee_name: mentee.full_name || mentee.mentee_id,
              respondent_role: 'mentee',
            });
          }
        }
      }

      // Check mentors — slack_user_id match takes priority over name match
      for (const mentor of mentors) {
        const slackMatch = effectiveSlackUserId && mentor.slack_user_id === effectiveSlackUserId;
        const nameMatch = normalizedName && mentor.full_name?.trim().toLowerCase() === normalizedName;
        if (slackMatch || nameMatch) {
          const pairedEntries = allPairs.filter(p => p.mentor_id === mentor.mentor_id);
          for (const pair of pairedEntries) {
            const mentee = mentees.find((m: any) => m.mentee_id === pair.mentee_id);
            candidates.push({
              mentor_id: mentor.mentor_id,
              mentee_id: pair.mentee_id,
              cohort_id: cohort.id,
              cohort_name: cohort.name,
              cohort_created_at: cohort.created_at || '',
              mentor_name: mentor.full_name || mentor.mentor_id,
              mentee_name: mentee?.full_name || 'Unknown',
              respondent_role: 'mentor',
            });
          }
        }
      }
    }

    if (candidates.length === 0) {
      const identifier = effectiveSlackUserId || respondent_name;
      return errorResponse(404, `No active pair found for "${identifier}". Ensure the name or slack_user_id matches exactly as registered.`);
    }

    // If multiple matches, auto-pick the most recently created cohort
    if (candidates.length > 1) {
      candidates.sort((a, b) => b.cohort_created_at.localeCompare(a.cohort_created_at));
      console.log(`[log-session] Multiple matches (${candidates.length}), auto-selected most recent cohort: "${candidates[0].cohort_name}" (${candidates[0].cohort_id})`);
    }

    const pair = candidates[0];

    // Determine which rating field to populate
    const ratingField = pair.respondent_role === 'mentee' ? 'mentee_rating' : 'mentor_rating';

    // Normalize journey_phase — accept internal keys, short labels, or full MS Forms
    // option text like "Getting Started - (Typical signals: introductions...)"
    const PHASE_PREFIX_MAP: Array<{ prefix: string; key: string }> = [
      { prefix: 'getting started', key: 'getting_started' },
      { prefix: 'building', key: 'building' },
      { prefix: 'midpoint', key: 'midpoint' },
      { prefix: 'wrapping up', key: 'wrapping_up' },
    ];
    const rawPhase = (journey_phase || '').toString().trim().toLowerCase();
    let sessionJourneyPhase: string | null = null;
    // Check exact match first (internal keys like 'getting_started')
    const validJourneyPhases = ['getting_started', 'building', 'midpoint', 'wrapping_up'];
    if (validJourneyPhases.includes(rawPhase)) {
      sessionJourneyPhase = rawPhase;
    } else {
      // Prefix match for MS Forms values like "Getting Started - (Typical signals...)"
      const match = PHASE_PREFIX_MAP.find(p => rawPhase.startsWith(p.prefix));
      if (match) sessionJourneyPhase = match.key;
    }
    console.log(`[log-session] Journey phase: raw="${rawPhase}" → resolved="${sessionJourneyPhase}"`);

    // Insert session
    const { error: insertError } = await supabaseAdmin
      .from('sessions')
      .insert({
        mentor_id: pair.mentor_id,
        mentee_id: pair.mentee_id,
        cohort_id: pair.cohort_id,
        title: 'Session logged via form',
        scheduled_datetime: parsedDate.toISOString(),
        duration_minutes: durationNum,
        status: 'completed',
        logged_by: pair.respondent_role,
        [ratingField]: ratingNum,
        ...(sessionNotes ? { notes: sessionNotes } : {}),
        ...(sessionJourneyPhase ? { journey_phase: sessionJourneyPhase } : {}),
      });

    if (insertError) {
      console.error('Session insert error:', insertError);
      return errorResponse(500, 'Failed to log session');
    }

    // ================================================================
    // Send next-steps message if respondent self-reported a stage
    // ================================================================
    let autoSentPhase: string | null = null;
    if (sessionJourneyPhase) {
      try {
        // Find respondent's Slack ID — prefer the one we matched on, fall back to DB lookup
        let respondentSlackId = effectiveSlackUserId;
        if (!respondentSlackId) {
          const table = pair.respondent_role === 'mentee' ? 'mentees' : 'mentors';
          const idCol = pair.respondent_role === 'mentee' ? 'mentee_id' : 'mentor_id';
          const idVal = pair.respondent_role === 'mentee' ? pair.mentee_id : pair.mentor_id;
          const { data: person } = await supabaseAdmin
            .from(table)
            .select('slack_user_id')
            .eq(idCol, idVal)
            .eq('cohort_id', pair.cohort_id)
            .single();
          respondentSlackId = person?.slack_user_id || '';
        }

        if (respondentSlackId) {
          // Dedup: only send if they haven't already received a message for this phase
          const { data: existing } = await supabaseAdmin
            .from('message_log')
            .select('id')
            .eq('cohort_id', pair.cohort_id)
            .in('template_type', ['next_steps', 'next_steps_mentee', 'next_steps_mentor'])
            .eq('journey_phase', sessionJourneyPhase)
            .eq('slack_user_id', respondentSlackId)
            .eq('delivery_status', 'sent')
            .limit(1);

          if (!existing || existing.length === 0) {
            // Load next_steps template for this phase — prefer role-specific, fall back to generic
            const roleType = pair.respondent_role === 'mentee' ? 'next_steps_mentee' : 'next_steps_mentor';
            const { data: templates } = await supabaseAdmin
              .from('message_templates')
              .select('*')
              .or(`cohort_id.eq.${pair.cohort_id},cohort_id.is.null`)
              .eq('is_active', true)
              .in('template_type', [roleType, 'next_steps'])
              .eq('journey_phase', sessionJourneyPhase);

            // Priority: cohort-specific role → cohort-specific generic → global role → global generic
            const template = templates?.find((t: any) => t.cohort_id === pair.cohort_id && t.template_type === roleType)
              || templates?.find((t: any) => t.cohort_id === pair.cohort_id && t.template_type === 'next_steps')
              || templates?.find((t: any) => !t.cohort_id && t.template_type === roleType)
              || templates?.find((t: any) => !t.cohort_id && t.template_type === 'next_steps');

            if (template) {
              const zapierWebhookUrl = Deno.env.get('ZAPIER_SLACK_WEBHOOK_URL');
              if (zapierWebhookUrl) {
                const context: TemplateContext = {
                  FIRST_NAME: pair.respondent_role === 'mentee'
                    ? pair.mentee_name.split(' ')[0]
                    : pair.mentor_name.split(' ')[0],
                  MENTEE_FIRST_NAME: pair.mentee_name.split(' ')[0],
                  MENTOR_FIRST_NAME: pair.mentor_name.split(' ')[0],
                  COHORT_NAME: pair.cohort_name,
                };

                const messageText = renderTemplate(template.body, context);

                const zapRes = await fetch(zapierWebhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'dm',
                    slack_user_id: respondentSlackId,
                    message_text: messageText,
                    cohort_name: pair.cohort_name,
                  }),
                });

                await supabaseAdmin.from('message_log').insert({
                  cohort_id: pair.cohort_id,
                  template_type: template.template_type,
                  journey_phase: sessionJourneyPhase,
                  slack_user_id: respondentSlackId,
                  recipient_email: respondentSlackId,
                  message_text: messageText,
                  delivery_status: zapRes.ok ? 'sent' : 'failed',
                  error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
                });

                autoSentPhase = sessionJourneyPhase;
                console.log(`[log-session] Sent next_steps (${sessionJourneyPhase}) to ${respondentSlackId}: ${zapRes.ok ? 'OK' : 'FAILED'}`);
              }
            }
          } else {
            console.log(`[log-session] Skipping: ${respondentSlackId} already received next_steps for ${sessionJourneyPhase}`);
          }
        }
      } catch (msgError) {
        // Never fail the session insert due to messaging errors
        console.error('[log-session] Send next-steps error (non-fatal):', msgError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pair: `${pair.mentee_name} & ${pair.mentor_name}`,
        cohort: pair.cohort_name,
        logged_by: pair.respondent_role,
        ...(autoSentPhase ? { auto_sent_phase: autoSentPhase } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('log-session error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
