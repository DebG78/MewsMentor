import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { renderTemplate, type TemplateContext } from '../_shared/templates.ts';

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/**
 * Send monthly session-logging reminders to all mentees and mentors in active cohorts.
 *
 * Logic:
 * - Finds all cohorts with status = 'active' and a non-null start_date
 * - Calculates the number of complete months since start_date
 * - For each month boundary, checks message_log to see if a reminder was already sent
 * - Sends a reminder DM to every matched mentee and mentor who hasn't received one this month
 *
 * Can be called:
 *   POST with no body  → processes ALL active cohorts (for cron)
 *   POST { cohort_id } → processes a single cohort (for manual trigger)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    // Auth: require service role or API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('SURVEY_IMPORT_API_KEY');
    const authHeader = req.headers.get('authorization');

    if (!authHeader && (!expectedKey || apiKey !== expectedKey)) {
      return errorResponse(401, 'Invalid or missing authentication');
    }

    const zapierWebhookUrl = Deno.env.get('ZAPIER_SLACK_WEBHOOK_URL');
    if (!zapierWebhookUrl) {
      return errorResponse(500, 'ZAPIER_SLACK_WEBHOOK_URL is not configured');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const requestedCohortId = body.cohort_id;

    // Load active cohorts with reminders enabled
    let cohortsQuery = supabaseAdmin
      .from('cohorts')
      .select('*')
      .eq('status', 'active')
      .not('start_date', 'is', null);

    if (requestedCohortId) {
      cohortsQuery = cohortsQuery.eq('id', requestedCohortId);
    }

    const { data: cohorts, error: cohortsError } = await cohortsQuery;

    if (cohortsError) {
      return errorResponse(500, `Failed to load cohorts: ${cohortsError.message}`);
    }

    // Filter to only cohorts with reminders enabled (default true if column not set)
    const enabledCohorts = (cohorts || []).filter(
      (c: any) => c.session_reminders_enabled !== false
    );

    if (enabledCohorts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active cohorts with reminders enabled found', cohorts_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const now = new Date();
    const results: Array<{
      cohort_id: string;
      cohort_name: string;
      month_number: number;
      sent: number;
      failed: number;
      skipped: number;
    }> = [];

    for (const cohort of enabledCohorts) {
      const startDate = new Date(cohort.start_date);

      // Calculate complete months elapsed since start_date
      const monthsElapsed =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth());

      // Skip if less than 1 month has passed
      if (monthsElapsed < 1) {
        console.log(`[send-session-reminders] Skipping ${cohort.id}: only ${monthsElapsed} months since start`);
        continue;
      }

      // The current reminder month number (1 = first month after start, 2 = second, etc.)
      const monthNumber = monthsElapsed;

      // Load the session_reminder template (cohort-specific first, then global)
      const { data: templates } = await supabaseAdmin
        .from('message_templates')
        .select('*')
        .or(`cohort_id.eq.${cohort.id},cohort_id.is.null`)
        .eq('template_type', 'session_reminder')
        .eq('is_active', true);

      const template =
        templates?.find((t: any) => t.cohort_id === cohort.id) ||
        templates?.find((t: any) => !t.cohort_id);

      if (!template) {
        console.log(`[send-session-reminders] Skipping ${cohort.id}: no session_reminder template found`);
        continue;
      }

      // Load mentees and mentors
      const [menteesRes, mentorsRes] = await Promise.all([
        supabaseAdmin.from('mentees').select('*').eq('cohort_id', cohort.id),
        supabaseAdmin.from('mentors').select('*').eq('cohort_id', cohort.id),
      ]);

      const mentees = menteesRes.data || [];
      const mentors = mentorsRes.data || [];

      // Build match pairs
      const manualMatches = (cohort.manual_matches as any)?.matches || [];
      const algoResults = (cohort.matches as any)?.results || [];
      const matchedSlackIds = new Set<string>();

      if (manualMatches.length > 0) {
        for (const m of manualMatches) {
          const mentee = mentees.find((me: any) => me.mentee_id === m.mentee_id);
          const mentor = mentors.find((mo: any) => mo.mentor_id === m.mentor_id);
          if (mentee?.slack_user_id) matchedSlackIds.add(mentee.slack_user_id);
          if (mentor?.slack_user_id) matchedSlackIds.add(mentor.slack_user_id);
        }
      } else {
        for (const r of algoResults) {
          if (r.proposed_assignment?.mentor_id) {
            const mentee = mentees.find((me: any) => me.mentee_id === r.mentee_id);
            const mentor = mentors.find((mo: any) => mo.mentor_id === r.proposed_assignment.mentor_id);
            if (mentee?.slack_user_id) matchedSlackIds.add(mentee.slack_user_id);
            if (mentor?.slack_user_id) matchedSlackIds.add(mentor.slack_user_id);
          }
        }
      }

      if (matchedSlackIds.size === 0) {
        console.log(`[send-session-reminders] Skipping ${cohort.id}: no matched participants with Slack IDs`);
        continue;
      }

      // Build lookup by slack_user_id for context
      const participantBySlack = new Map<string, any>();
      for (const m of mentees) {
        if (m.slack_user_id) participantBySlack.set(m.slack_user_id, { ...m, _role: 'mentee' });
      }
      for (const m of mentors) {
        if (m.slack_user_id) participantBySlack.set(m.slack_user_id, { ...m, _role: 'mentor' });
      }

      // We use a dedup key: template_type=session_reminder + a journey_phase of "month_N"
      // This lets us track which month's reminder each person received
      const monthPhase = `month_${monthNumber}`;

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const slackUserId of matchedSlackIds) {
        // Dedup: check if already sent for this month
        const { data: existing } = await supabaseAdmin
          .from('message_log')
          .select('id')
          .eq('cohort_id', cohort.id)
          .eq('template_type', 'session_reminder')
          .eq('journey_phase', monthPhase)
          .eq('slack_user_id', slackUserId)
          .eq('delivery_status', 'sent')
          .limit(1);

        if (existing && existing.length > 0) {
          skippedCount++;
          continue;
        }

        const participant = participantBySlack.get(slackUserId);
        const context: TemplateContext = {
          FIRST_NAME: participant?.first_name || participant?.full_name?.split(' ')[0] || '',
          FULL_NAME: participant?.full_name || '',
          COHORT_NAME: cohort.name,
          MONTH_NUMBER: String(monthNumber),
          ADMIN_EMAIL: Deno.env.get('ADMIN_EMAIL') || 'mentoring@mews.com',
        };

        const messageText = renderTemplate(template.body, context);

        try {
          const zapRes = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'dm',
              slack_user_id: slackUserId,
              message_text: messageText,
              cohort_name: cohort.name,
            }),
          });

          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohort.id,
            template_type: 'session_reminder',
            journey_phase: monthPhase,
            slack_user_id: slackUserId,
            recipient_email: slackUserId,
            message_text: messageText,
            delivery_status: zapRes.ok ? 'sent' : 'failed',
            error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
          });

          if (zapRes.ok) sentCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohort.id,
            template_type: 'session_reminder',
            journey_phase: monthPhase,
            slack_user_id: slackUserId,
            recipient_email: slackUserId,
            message_text: messageText,
            delivery_status: 'failed',
            error_detail: err.message,
          });
        }
      }

      results.push({
        cohort_id: cohort.id,
        cohort_name: cohort.name,
        month_number: monthNumber,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohorts_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-session-reminders error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
