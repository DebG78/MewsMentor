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

    const body = await req.json().catch(() => ({}));
    const cohortId = body.cohort_id;
    const journeyPhase = body.journey_phase;

    if (!cohortId) {
      return errorResponse(400, 'Missing cohort_id');
    }
    if (!journeyPhase) {
      return errorResponse(400, 'Missing journey_phase');
    }

    const validPhases = ['getting_started', 'building', 'midpoint', 'wrapping_up'];
    if (!validPhases.includes(journeyPhase)) {
      return errorResponse(400, `Invalid journey_phase. Must be one of: ${validPhases.join(', ')}`);
    }

    const zapierWebhookUrl = Deno.env.get('ZAPIER_SLACK_WEBHOOK_URL');
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

    // Load next_steps templates for the given phase — generic + role-specific
    const { data: templates } = await supabaseAdmin
      .from('message_templates')
      .select('*')
      .or(`cohort_id.eq.${cohortId},cohort_id.is.null`)
      .eq('is_active', true)
      .in('template_type', ['next_steps', 'next_steps_mentee', 'next_steps_mentor'])
      .eq('journey_phase', journeyPhase);

    // Helper: find best template for a given role
    const findTemplate = (role: 'mentee' | 'mentor') => {
      const roleType = role === 'mentee' ? 'next_steps_mentee' : 'next_steps_mentor';
      return templates?.find((t: any) => t.cohort_id === cohortId && t.template_type === roleType)
        || templates?.find((t: any) => t.cohort_id === cohortId && t.template_type === 'next_steps')
        || templates?.find((t: any) => !t.cohort_id && t.template_type === roleType)
        || templates?.find((t: any) => !t.cohort_id && t.template_type === 'next_steps');
    };

    // Ensure at least one template exists
    if (!findTemplate('mentee') && !findTemplate('mentor')) {
      return errorResponse(404, `No active next_steps template found for phase "${journeyPhase}"`);
    }

    // Build lookup maps
    const menteeMap = new Map(mentees.map(m => [m.mentee_id, m]));
    const mentorMap = new Map(mentors.map(m => [m.mentor_id, m]));

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Send next-steps messages for each pair — to BOTH mentee and mentor
    for (const pair of pairs) {
      const mentee = menteeMap.get(pair.mentee_id);
      const mentor = mentorMap.get(pair.mentor_id);
      if (!mentee || !mentor) continue;

      const baseContext: TemplateContext = {
        COHORT_NAME: cohort.name,
        MENTEE_FIRST_NAME: mentee.first_name || mentee.full_name?.split(' ')[0] || '',
        MENTOR_FIRST_NAME: mentor.first_name || mentor.full_name?.split(' ')[0] || '',
        MENTEE_EMAIL: mentee.email || '',
        MENTOR_EMAIL: mentor.email || '',
      };

      // Send to both participants in the pair
      const recipients = [
        {
          email: mentee.email,
          role: 'mentee' as const,
          context: {
            ...baseContext,
            FIRST_NAME: mentee.first_name || mentee.full_name?.split(' ')[0] || '',
            FULL_NAME: mentee.full_name || '',
            ROLE_TITLE: mentee.role || '',
            PRIMARY_CAPABILITY: mentee.primary_capability || '',
            SECONDARY_CAPABILITY: mentee.secondary_capability || '',
            MENTORING_GOAL: mentee.mentoring_goal || '',
            BIO: mentee.bio || '',
          },
        },
        {
          email: mentor.email,
          role: 'mentor' as const,
          context: {
            ...baseContext,
            FIRST_NAME: mentor.first_name || mentor.full_name?.split(' ')[0] || '',
            FULL_NAME: mentor.full_name || '',
            ROLE_TITLE: mentor.role || '',
            PRIMARY_CAPABILITY: mentor.primary_capability || '',
            MENTOR_MOTIVATION: mentor.mentor_motivation || '',
            HARD_EARNED_LESSON: mentor.hard_earned_lesson || '',
            NATURAL_STRENGTHS: (mentor.natural_strengths || []).join(', '),
            BIO: mentor.bio || '',
          },
        },
      ];

      for (const recipient of recipients) {
        if (!recipient.email) {
          skippedCount++;
          continue;
        }

        // Find the best template for this recipient's role
        const recipientTemplate = findTemplate(recipient.role);
        if (!recipientTemplate) {
          skippedCount++;
          console.log(`[send-stage-messages] Skipping ${recipient.email}: no template for ${recipient.role}`);
          continue;
        }

        // Dedup check: has this person already received ANY next_steps message for this phase?
        const { data: existing } = await supabaseAdmin
          .from('message_log')
          .select('id')
          .eq('cohort_id', cohortId)
          .in('template_type', ['next_steps', 'next_steps_mentee', 'next_steps_mentor'])
          .eq('journey_phase', journeyPhase)
          .eq('recipient_email', recipient.email)
          .eq('delivery_status', 'sent')
          .limit(1);

        if (existing && existing.length > 0) {
          skippedCount++;
          console.log(`[send-stage-messages] Skipping ${recipient.email}: already received next_steps for ${journeyPhase}`);
          continue;
        }

        const messageText = renderTemplate(recipientTemplate.body, recipient.context);

        try {
          const zapRes = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'dm',
              recipient_email: recipient.email,
              message_text: messageText,
              cohort_name: cohort.name,
            }),
          });

          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: recipientTemplate.template_type,
            journey_phase: journeyPhase,
            recipient_email: recipient.email,
            message_text: messageText,
            delivery_status: zapRes.ok ? 'sent' : 'failed',
            error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
          });

          if (zapRes.ok) sentCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
          errors.push(`${recipient.role} ${recipient.email}: ${err.message}`);
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: recipientTemplate.template_type,
            journey_phase: journeyPhase,
            recipient_email: recipient.email,
            message_text: messageText,
            delivery_status: 'failed',
            error_detail: err.message,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohort: cohort.name,
        journey_phase: journeyPhase,
        pairs: pairs.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        ...(errors.length > 0 ? { errors } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-stage-messages error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
