
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ============================================================================
// End-of-mentoring survey field mapping (keyword-based MS Forms matching)
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
        if (typeof val === 'number') return String(val);
      }
    }
  }
  return undefined;
}

/**
 * Parse a 1-5 rating value. MS Forms thumbs ratings come through as integers.
 * Also handles string representations and decimal values.
 */
function parseRating(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (num < 1 || num > 5) return null;
  return Math.round(num * 10) / 10; // one decimal precision
}

/**
 * Parse "would join again" into yes/no/maybe.
 */
function parseWouldJoinAgain(value: string | undefined): string | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  if (lower === 'yes' || lower === 'true' || lower === '1') return 'yes';
  if (lower === 'no' || lower === 'false' || lower === '0') return 'no';
  if (lower === 'maybe' || lower.includes('not sure') || lower.includes('unsure')) return 'maybe';
  return null;
}

/**
 * Parse respondent type from form answer.
 */
function parseRespondentType(value: string | undefined): 'mentor' | 'mentee' | 'both' {
  if (!value) return 'mentee';
  const lower = value.toLowerCase();
  if (lower.includes('both')) return 'both';
  if (lower.includes('mentor') && !lower.includes('mentee')) return 'mentor';
  return 'mentee';
}

// Keyword patterns for end survey questions
const END_SURVEY = {
  // Identity
  slack_user_id: [['slack']],
  respondent_name: [['name']],
  respondent_type: [['participated as'], ['i participated']],

  // Mentor questions (Q3-Q7)
  mentor_support_growth: [['support others', 'growth'], ['improve how i support']],
  mentor_used_new_skills: [['skills', "don't regularly"], ['skills', 'not regularly'], ['new skills', 'role']],
  mentor_saw_impact: [['positive impact', 'mentee']],
  mentor_time_worthwhile: [['time', 'invested', 'worthwhile'], ['time i invested', 'mentoring']],
  mentor_behavior_change: [['changed the way', 'support'], ['changed', 'interact', 'work']],

  // Mentee questions (Q8-Q12)
  mentee_skill_clarity: [['clearer understanding', 'practice'], ['practice this skill']],
  mentee_focus_clarity: [['clarify', 'developing next'], ['focus on developing']],
  mentee_perspective_challenged: [['challenged', 'perspective']],
  mentee_prepared_between: [['prepared', 'reflected'], ['actively prepared']],
  mentee_unexpected_development: [["didn't expect", 'start'], ['unexpected', 'developing']],

  // Experience questions (Q13-Q21)
  cross_team_collaboration: [['collaborate', 'communicate', 'outside'], ['collaborate', 'outside']],
  match_satisfaction: [['pairing work for you'], ['mentor-mentee pairing'], ['mentee pairing']],
  comfortable_being_open: [['comfortable', 'open']],
  meeting_frequency: [['how often', 'meet']],
  session_became_useful: [['session', 'genuinely useful'], ['becoming genuinely useful']],
  overall_worth: [['relationship', 'worth the time'], ['overall', 'worth']],
  easy_momentum: [['easy', 'momentum']],
  would_join_again: [['join', 'mentoring again'], ['would you join']],
  open_feedback: [['anything', 'share'], ['highlights', 'lowlights']],
};

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ============================================================================
// Metric computation helpers
// ============================================================================

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * Compute NPS from "would join again" responses.
 * Yes = promoter (score 10), Maybe = passive (score 7), No = detractor (score 2)
 * NPS = % promoters - % detractors
 */
function computeNPS(responses: Array<{ would_join_again: string | null }>): number | null {
  const valid = responses.filter(r => r.would_join_again);
  if (valid.length === 0) return null;

  let promoters = 0;
  let detractors = 0;

  for (const r of valid) {
    if (r.would_join_again === 'yes') promoters++;
    else if (r.would_join_again === 'no') detractors++;
    // 'maybe' = passive, doesn't count for either
  }

  return Math.round(((promoters - detractors) / valid.length) * 100);
}

// ============================================================================
// Edge Function
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    console.log('import-end-survey v1 invoked');

    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('END_SURVEY_API_KEY');
    if (!expectedKey || apiKey !== expectedKey) {
      return errorResponse(401, 'Invalid or missing API key');
    }

    const body = await req.json();
    console.log('Body keys:', Object.keys(body));

    const f = (patterns: string[][]) => findFieldByKeywords(body, patterns);

    // Create admin Supabase client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ================================================================
    // Extract identity fields
    // ================================================================
    const slackUserId = f(END_SURVEY.slack_user_id) || (body.slack_user_id as string) || '';
    const respondentName = f(END_SURVEY.respondent_name) || (body.respondent_name as string) || '';
    const respondentType = parseRespondentType(f(END_SURVEY.respondent_type) || (body.respondent_type as string));

    if (!slackUserId && !respondentName) {
      return errorResponse(400, 'At least one of slack_user_id or respondent name is required');
    }

    console.log('Resolved:', { slackUserId, respondentName, respondentType });

    // ================================================================
    // Cohort resolution: query param wins, fallback to auto-detect
    // ================================================================
    const url = new URL(req.url);
    const cohortIdParam = url.searchParams.get('cohort_id');
    let cohortId: string | null = null;
    let cohortName = '';

    if (cohortIdParam) {
      // Explicit cohort from query param
      const { data: cohort, error: cohortError } = await supabaseAdmin
        .from('cohorts')
        .select('id, name, status')
        .eq('id', cohortIdParam)
        .single();

      if (cohortError || !cohort) {
        return errorResponse(404, `Cohort not found: ${cohortIdParam}`);
      }
      cohortId = cohort.id;
      cohortName = cohort.name;
    } else {
      // Auto-detect from Slack ID / name: find matching person across active cohorts
      const { data: cohorts } = await supabaseAdmin
        .from('cohorts')
        .select('id, name, status, created_at')
        .in('status', ['active']);

      if (!cohorts || cohorts.length === 0) {
        return errorResponse(404, 'No active cohorts found. Provide ?cohort_id= or ensure at least one cohort is active.');
      }

      // Search across cohorts for this person
      const matchedCohorts: Array<{ id: string; name: string; created_at: string; sessionCount: number }> = [];

      for (const cohort of cohorts) {
        let found = false;

        // Check mentees
        if (slackUserId) {
          const { data: mentee } = await supabaseAdmin
            .from('mentees').select('mentee_id')
            .eq('cohort_id', cohort.id).eq('slack_user_id', slackUserId).limit(1);
          if (mentee && mentee.length > 0) found = true;
        }
        if (!found && respondentName) {
          const { data: mentee } = await supabaseAdmin
            .from('mentees').select('mentee_id')
            .eq('cohort_id', cohort.id).eq('full_name', respondentName).limit(1);
          if (mentee && mentee.length > 0) found = true;
        }

        // Check mentors
        if (!found && slackUserId) {
          const { data: mentor } = await supabaseAdmin
            .from('mentors').select('mentor_id')
            .eq('cohort_id', cohort.id).eq('slack_user_id', slackUserId).limit(1);
          if (mentor && mentor.length > 0) found = true;
        }
        if (!found && respondentName) {
          const { data: mentor } = await supabaseAdmin
            .from('mentors').select('mentor_id')
            .eq('cohort_id', cohort.id).eq('full_name', respondentName).limit(1);
          if (mentor && mentor.length > 0) found = true;
        }

        if (found) {
          // Count completed sessions to determine which cohort is furthest along
          const { count } = await supabaseAdmin
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('cohort_id', cohort.id)
            .eq('status', 'completed');

          matchedCohorts.push({
            id: cohort.id,
            name: cohort.name,
            created_at: cohort.created_at || '',
            sessionCount: count || 0,
          });
        }
      }

      if (matchedCohorts.length === 0) {
        const identifier = slackUserId || respondentName;
        return errorResponse(404, `No active cohort found for "${identifier}". Provide ?cohort_id= or ensure person is enrolled in an active cohort.`);
      }

      // Prefer cohort with most completed sessions (most likely to be wrapping up)
      // Tiebreak: most recently created
      matchedCohorts.sort((a, b) => {
        if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount;
        return b.created_at.localeCompare(a.created_at);
      });

      cohortId = matchedCohorts[0].id;
      cohortName = matchedCohorts[0].name;

      if (matchedCohorts.length > 1) {
        console.log(`[import-end-survey] Multiple cohorts matched (${matchedCohorts.length}), selected "${cohortName}" with ${matchedCohorts[0].sessionCount} sessions`);
      }
    }

    console.log('Resolved cohort:', cohortId, cohortName);

    // ================================================================
    // Extract all survey fields
    // ================================================================
    const responseFields: Record<string, unknown> = {
      cohort_id: cohortId,
      slack_user_id: slackUserId || null,
      respondent_name: respondentName || null,
      respondent_type: respondentType,
      survey_date: new Date().toISOString().split('T')[0],

      // Mentor questions (Q3-Q7)
      mentor_support_growth: parseRating(f(END_SURVEY.mentor_support_growth)),
      mentor_used_new_skills: parseRating(f(END_SURVEY.mentor_used_new_skills)),
      mentor_saw_impact: parseRating(f(END_SURVEY.mentor_saw_impact)),
      mentor_time_worthwhile: parseRating(f(END_SURVEY.mentor_time_worthwhile)),
      mentor_behavior_change: f(END_SURVEY.mentor_behavior_change) || null,

      // Mentee questions (Q8-Q12)
      mentee_skill_clarity: parseRating(f(END_SURVEY.mentee_skill_clarity)),
      mentee_focus_clarity: parseRating(f(END_SURVEY.mentee_focus_clarity)),
      mentee_perspective_challenged: parseRating(f(END_SURVEY.mentee_perspective_challenged)),
      mentee_prepared_between: parseRating(f(END_SURVEY.mentee_prepared_between)),
      mentee_unexpected_development: f(END_SURVEY.mentee_unexpected_development) || null,

      // Experience questions (Q13-Q21)
      cross_team_collaboration: parseRating(f(END_SURVEY.cross_team_collaboration)),
      match_satisfaction: parseRating(f(END_SURVEY.match_satisfaction)),
      comfortable_being_open: parseRating(f(END_SURVEY.comfortable_being_open)),
      meeting_frequency: f(END_SURVEY.meeting_frequency) || null,
      session_became_useful: f(END_SURVEY.session_became_useful) || null,
      overall_worth: parseRating(f(END_SURVEY.overall_worth)),
      easy_momentum: parseRating(f(END_SURVEY.easy_momentum)),
      would_join_again: parseWouldJoinAgain(f(END_SURVEY.would_join_again)),
      open_feedback: f(END_SURVEY.open_feedback) || null,
    };

    console.log('Parsed ratings:', {
      mentor_support_growth: responseFields.mentor_support_growth,
      mentee_skill_clarity: responseFields.mentee_skill_clarity,
      match_satisfaction: responseFields.match_satisfaction,
      would_join_again: responseFields.would_join_again,
    });

    // ================================================================
    // Upsert response: check by slack_user_id, fallback to name
    // ================================================================
    let existingId: string | null = null;

    if (slackUserId) {
      const { data: existing } = await supabaseAdmin
        .from('end_survey_responses')
        .select('id')
        .eq('cohort_id', cohortId)
        .eq('slack_user_id', slackUserId)
        .single();
      if (existing) existingId = existing.id;
    }
    if (!existingId && respondentName) {
      const { data: existing } = await supabaseAdmin
        .from('end_survey_responses')
        .select('id')
        .eq('cohort_id', cohortId)
        .eq('respondent_name', respondentName)
        .single();
      if (existing) existingId = existing.id;
    }

    if (existingId) {
      console.log('Updating existing end survey response:', existingId);
      const { error: updateError } = await supabaseAdmin
        .from('end_survey_responses')
        .update(responseFields)
        .eq('id', existingId);

      if (updateError) {
        console.error('End survey update error:', JSON.stringify(updateError));
        return errorResponse(500, `Failed to update response: ${updateError.message}`);
      }
    } else {
      console.log('Inserting new end survey response');
      const { error: insertError } = await supabaseAdmin
        .from('end_survey_responses')
        .insert(responseFields);

      if (insertError) {
        console.error('End survey insert error:', JSON.stringify(insertError));
        return errorResponse(500, `Failed to save response: ${insertError.message}`);
      }
    }

    // ================================================================
    // Auto-compute and upsert metric snapshots for this cohort
    // ================================================================
    try {
      const { data: allResponses } = await supabaseAdmin
        .from('end_survey_responses')
        .select('*')
        .eq('cohort_id', cohortId);

      if (allResponses && allResponses.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const responseCount = allResponses.length;

        // Separate by respondent type
        const mentorResponses = allResponses.filter(
          (r: any) => r.respondent_type === 'mentor' || r.respondent_type === 'both'
        );
        const menteeResponses = allResponses.filter(
          (r: any) => r.respondent_type === 'mentee' || r.respondent_type === 'both'
        );

        const snapshots: Array<{ metric_name: string; actual_value: number; notes: string }> = [];

        // Mentee satisfaction: avg of (Q8 + Q9 + Q18) / 3 per mentee
        const menteeSatValues = menteeResponses
          .map((r: any) => {
            const scores = [r.mentee_skill_clarity, r.mentee_focus_clarity, r.overall_worth].filter((v: any) => v != null);
            return scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null;
          })
          .filter((v: any): v is number => v !== null);

        const menteeSat = avg(menteeSatValues);
        if (menteeSat !== null) {
          snapshots.push({
            metric_name: 'mentee_satisfaction_score',
            actual_value: menteeSat,
            notes: `End survey avg (${menteeSatValues.length} mentee responses)`,
          });
        }

        // Mentor satisfaction: avg of (Q3 + Q5 + Q6) / 3 per mentor
        const mentorSatValues = mentorResponses
          .map((r: any) => {
            const scores = [r.mentor_support_growth, r.mentor_saw_impact, r.mentor_time_worthwhile].filter((v: any) => v != null);
            return scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null;
          })
          .filter((v: any): v is number => v !== null);

        const mentorSat = avg(mentorSatValues);
        if (mentorSat !== null) {
          snapshots.push({
            metric_name: 'mentor_satisfaction_score',
            actual_value: mentorSat,
            notes: `End survey avg (${mentorSatValues.length} mentor responses)`,
          });
        }

        // NPS from "would join again"
        const nps = computeNPS(allResponses);
        if (nps !== null) {
          snapshots.push({
            metric_name: 'nps_score',
            actual_value: nps,
            notes: `End survey NPS (${allResponses.filter((r: any) => r.would_join_again).length} responses)`,
          });
        }

        // Goal achievement rate: % of mentees scoring Q8 >= 4
        const menteeSkillScores = menteeResponses
          .map((r: any) => r.mentee_skill_clarity)
          .filter((v: any): v is number => v != null);
        if (menteeSkillScores.length > 0) {
          const achievedCount = menteeSkillScores.filter((v: number) => v >= 4).length;
          const goalRate = Math.round((achievedCount / menteeSkillScores.length) * 100);
          snapshots.push({
            metric_name: 'goal_achievement_rate',
            actual_value: goalRate,
            notes: `End survey: ${achievedCount}/${menteeSkillScores.length} mentees rated skill clarity >= 4`,
          });
        }

        // Mentor retention rate: % of mentors answering Q20 = "yes"
        const mentorJoinAgain = mentorResponses
          .map((r: any) => r.would_join_again)
          .filter((v: any): v is string => v != null);
        if (mentorJoinAgain.length > 0) {
          const yesCount = mentorJoinAgain.filter((v: string) => v === 'yes').length;
          const retentionRate = Math.round((yesCount / mentorJoinAgain.length) * 100);
          snapshots.push({
            metric_name: 'mentor_retention_rate',
            actual_value: retentionRate,
            notes: `End survey: ${yesCount}/${mentorJoinAgain.length} mentors would join again`,
          });
        }

        // Match satisfaction: avg of Q14 for all respondents
        const matchSatValues = allResponses
          .map((r: any) => r.match_satisfaction)
          .filter((v: any): v is number => v != null);
        const matchSat = avg(matchSatValues);
        if (matchSat !== null) {
          snapshots.push({
            metric_name: 'match_satisfaction_score',
            actual_value: matchSat,
            notes: `End survey avg (${matchSatValues.length} responses)`,
          });
        }

        // Upsert all metric snapshots
        for (const snap of snapshots) {
          const { error: snapError } = await supabaseAdmin
            .from('metric_snapshots')
            .upsert(
              {
                cohort_id: cohortId,
                metric_name: snap.metric_name,
                actual_value: snap.actual_value,
                snapshot_date: today,
                notes: snap.notes,
              },
              { onConflict: 'cohort_id,metric_name,snapshot_date' }
            );

          if (snapError) {
            console.error(`Failed to upsert metric ${snap.metric_name}:`, snapError);
          } else {
            console.log(`[metrics] ${snap.metric_name} = ${snap.actual_value}`);
          }
        }

        console.log(`[import-end-survey] Upserted ${snapshots.length} metric snapshots from ${responseCount} responses`);
      }
    } catch (metricsError) {
      // Metric computation is non-blocking — never fail the response insert
      console.error('[import-end-survey] Metric computation error (non-fatal):', metricsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohort: cohortName,
        respondent_type: respondentType,
        action: existingId ? 'updated' : 'created',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('import-end-survey error:', message, error);
    return errorResponse(500, message || 'Internal server error');
  }
});
