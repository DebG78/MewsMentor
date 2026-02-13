import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { renderTemplate, type TemplateContext } from '../_shared/templates.ts';

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req) => {
  console.log('[send-welcome-messages] request received:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('[send-welcome-messages] rejected: not POST');
    return errorResponse(405, 'Method not allowed');
  }

  try {
    // Auth: require service role or API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('SURVEY_IMPORT_API_KEY'); // Reuse same key
    const authHeader = req.headers.get('authorization');
    console.log('[send-welcome-messages] auth check:', { hasApiKey: !!apiKey, hasAuth: !!authHeader, hasExpectedKey: !!expectedKey });

    // Accept either API key or Supabase auth
    if (!authHeader && (!expectedKey || apiKey !== expectedKey)) {
      console.log('[send-welcome-messages] AUTH FAILED');
      return errorResponse(401, 'Invalid or missing authentication');
    }

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const cohortId = url.searchParams.get('cohort_id') || body.cohort_id;
    console.log('[send-welcome-messages] cohortId:', cohortId, 'from query:', url.searchParams.get('cohort_id'), 'from body:', body.cohort_id);
    if (!cohortId) {
      return errorResponse(400, 'Missing cohort_id (pass in query string or request body)');
    }

    const zapierWebhookUrl = Deno.env.get('ZAPIER_SLACK_WEBHOOK_URL');
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'mentoring@mews.com';
    console.log('[send-welcome-messages] webhook configured:', !!zapierWebhookUrl);
    if (!zapierWebhookUrl) {
      return errorResponse(500, 'ZAPIER_SLACK_WEBHOOK_URL is not configured');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load cohort
    const { data: cohort, error: cohortError } = await supabaseAdmin
      .from('cohorts')
      .select('*')
      .eq('id', cohortId)
      .single();

    if (cohortError || !cohort) {
      return errorResponse(404, `Cohort not found: ${cohortId}`);
    }

    // Load mentees and mentors
    const [menteesRes, mentorsRes] = await Promise.all([
      supabaseAdmin.from('mentees').select('*').eq('cohort_id', cohortId),
      supabaseAdmin.from('mentors').select('*').eq('cohort_id', cohortId),
    ]);

    const mentees = menteesRes.data || [];
    const mentors = mentorsRes.data || [];

    // Build match pairs from manual_matches or algorithm matches
    const manualMatches = (cohort.manual_matches as any)?.matches || [];
    const algoResults = (cohort.matches as any)?.results || [];

    const pairs: Array<{ mentee_id: string; mentor_id: string }> = [];

    // Prefer manual matches
    if (manualMatches.length > 0) {
      for (const m of manualMatches) {
        pairs.push({ mentee_id: m.mentee_id, mentor_id: m.mentor_id });
      }
    } else {
      for (const r of algoResults) {
        if (r.proposed_assignment?.mentor_id) {
          pairs.push({ mentee_id: r.mentee_id, mentor_id: r.proposed_assignment.mentor_id });
        }
      }
    }

    if (pairs.length === 0) {
      return errorResponse(400, 'No matched pairs found in cohort. Run matching first.');
    }

    // Load message templates (cohort-specific first, then global)
    const { data: templates } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .or(`cohort_id.eq.${cohortId},cohort_id.is.null`)
      .eq('is_active', true)
      .in('template_type', ['welcome_mentee', 'welcome_mentor', 'channel_announcement']);

    const getTemplate = (type: string): string | null => {
      // Cohort-specific first
      const cohortTemplate = templates?.find(t => t.template_type === type && t.cohort_id === cohortId);
      if (cohortTemplate) return cohortTemplate.body;
      // Global fallback
      const globalTemplate = templates?.find(t => t.template_type === type && !t.cohort_id);
      return globalTemplate?.body || null;
    };

    const menteeTemplate = getTemplate('welcome_mentee');
    const mentorTemplate = getTemplate('welcome_mentor');
    const channelTemplate = getTemplate('channel_announcement');

    // Build lookup maps
    const menteeMap = new Map(mentees.map(m => [m.mentee_id, m]));
    const mentorMap = new Map(mentors.map(m => [m.mentor_id, m]));

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send welcome DMs for each pair
    for (const pair of pairs) {
      const mentee = menteeMap.get(pair.mentee_id);
      const mentor = mentorMap.get(pair.mentor_id);
      if (!mentee || !mentor) continue;

      // Find shared capability
      const menteeCapabilities = [mentee.primary_capability, mentee.secondary_capability].filter(Boolean).map((c: string) => c.toLowerCase());
      const mentorCapabilities = [mentor.primary_capability, ...(mentor.secondary_capabilities || [])].filter(Boolean).map((c: string) => c.toLowerCase());
      const sharedCap = menteeCapabilities.find((c: string) => mentorCapabilities.includes(c)) || mentee.primary_capability || '';

      const baseContext: TemplateContext = {
        COHORT_NAME: cohort.name,
        MENTEE_FIRST_NAME: mentee.first_name || mentee.full_name?.split(' ')[0] || '',
        MENTOR_FIRST_NAME: mentor.first_name || mentor.full_name?.split(' ')[0] || '',
        MENTEE_EMAIL: mentee.email || '',
        MENTOR_EMAIL: mentor.email || '',
        SHARED_CAPABILITY: sharedCap,
        ADMIN_EMAIL: adminEmail,
      };

      // ---- Mentee welcome DM ----
      if (menteeTemplate && mentee.email) {
        const menteeContext: TemplateContext = {
          ...baseContext,
          FIRST_NAME: mentee.first_name || mentee.full_name?.split(' ')[0] || '',
          FULL_NAME: mentee.full_name || '',
          ROLE_TITLE: mentee.role || '',
          PRIMARY_CAPABILITY: mentee.primary_capability || '',
          SECONDARY_CAPABILITY: mentee.secondary_capability || '',
          MENTORING_GOAL: mentee.mentoring_goal || '',
          BIO: mentee.bio || '',
          SESSION_STYLE: mentee.preferred_style || '',
          FEEDBACK_STYLE: mentee.feedback_preference || '',
        };

        const messageText = renderTemplate(menteeTemplate, menteeContext);

        try {
          const zapRes = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'dm',
              recipient_email: mentee.email,
              message_text: messageText,
              cohort_name: cohort.name,
            }),
          });

          // Log the message
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentee',
            recipient_email: mentee.email,
            message_text: messageText,
            delivery_status: zapRes.ok ? 'sent' : 'failed',
            error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
          });

          if (zapRes.ok) sentCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
          errors.push(`Mentee ${mentee.email}: ${err.message}`);
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentee',
            recipient_email: mentee.email,
            message_text: renderTemplate(menteeTemplate, menteeContext),
            delivery_status: 'failed',
            error_detail: err.message,
          });
        }
      }

      // ---- Mentor welcome DM ----
      if (mentorTemplate && mentor.email) {
        const mentorContext: TemplateContext = {
          ...baseContext,
          FIRST_NAME: mentor.first_name || mentor.full_name?.split(' ')[0] || '',
          FULL_NAME: mentor.full_name || '',
          ROLE_TITLE: mentor.role || '',
          PRIMARY_CAPABILITY: mentor.primary_capability || '',
          MENTOR_MOTIVATION: mentor.mentor_motivation || '',
          HARD_EARNED_LESSON: mentor.hard_earned_lesson || '',
          NATURAL_STRENGTHS: (mentor.natural_strengths || []).join(', '),
          BIO: mentor.bio || '',
          SESSION_STYLE: mentor.meeting_style || '',
        };

        const messageText = renderTemplate(mentorTemplate, mentorContext);

        try {
          const zapRes = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'dm',
              recipient_email: mentor.email,
              message_text: messageText,
              cohort_name: cohort.name,
            }),
          });

          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentor',
            recipient_email: mentor.email,
            message_text: messageText,
            delivery_status: zapRes.ok ? 'sent' : 'failed',
            error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
          });

          if (zapRes.ok) sentCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
          errors.push(`Mentor ${mentor.email}: ${err.message}`);
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentor',
            recipient_email: mentor.email,
            message_text: renderTemplate(mentorTemplate, mentorContext),
            delivery_status: 'failed',
            error_detail: err.message,
          });
        }
      }
    }

    // ---- Channel announcement (G2) ----
    if (channelTemplate) {
      const slackChannel = Deno.env.get('SLACK_MENTORING_CHANNEL') || '#mentoring';
      const channelContext: TemplateContext = {
        COHORT_NAME: cohort.name,
      };
      const channelMessage = renderTemplate(channelTemplate, channelContext);

      try {
        const zapRes = await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'channel',
            channel: slackChannel,
            message_text: channelMessage,
            cohort_name: cohort.name,
          }),
        });

        await supabaseAdmin.from('message_log').insert({
          cohort_id: cohortId,
          template_type: 'channel_announcement',
          recipient_email: slackChannel,
          message_text: channelMessage,
          delivery_status: zapRes.ok ? 'sent' : 'failed',
          error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
        });

        if (zapRes.ok) sentCount++;
        else failedCount++;
      } catch (err) {
        failedCount++;
        errors.push(`Channel: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohort: cohort.name,
        pairs: pairs.length,
        sent: sentCount,
        failed: failedCount,
        ...(errors.length > 0 ? { errors } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-welcome-messages error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
