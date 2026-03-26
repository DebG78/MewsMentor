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
    console.log('[send-welcome-messages] loaded mentees:', mentees.length, 'mentors:', mentors.length);

    // Build match pairs from manual_matches or algorithm matches
    const manualMatches = (cohort.manual_matches as any)?.matches || [];
    const algoResults = (cohort.matches as any)?.results || [];
    console.log('[send-welcome-messages] manualMatches:', manualMatches.length, 'algoResults:', algoResults.length);
    if (manualMatches.length === 0 && algoResults.length === 0) {
      console.log('[send-welcome-messages] raw manual_matches:', JSON.stringify(cohort.manual_matches));
      console.log('[send-welcome-messages] raw matches:', JSON.stringify(cohort.matches));
    }

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

    console.log('[send-welcome-messages] pairs:', pairs.length, pairs.length > 0 ? JSON.stringify(pairs[0]) : '(none)');

    if (pairs.length === 0) {
      return errorResponse(400, 'No matched pairs found in cohort. Run matching first.');
    }

    // Templates can be passed in the request body (from frontend) or loaded from DB
    const bodyTemplates = body.templates as Record<string, string> | undefined;

    let menteeTemplate: string | null = null;
    let mentorTemplate: string | null = null;
    let channelTemplate: string | null = null;

    // Check for templates passed from frontend — support both standard keys
    // (welcome_mentee) and custom template_type names (e.g. "Mentee - Intro Message")
    if (bodyTemplates && Object.keys(bodyTemplates).length > 0) {
      // First try standard keys
      menteeTemplate = bodyTemplates.welcome_mentee || null;
      mentorTemplate = bodyTemplates.welcome_mentor || null;
      channelTemplate = bodyTemplates.channel_announcement || null;

      // If standard keys didn't match, classify by name
      if (!menteeTemplate || !mentorTemplate) {
        for (const [key, value] of Object.entries(bodyTemplates)) {
          const keyLower = key.toLowerCase();
          if (!menteeTemplate && keyLower.includes('mentee')) {
            menteeTemplate = value;
          } else if (!mentorTemplate && keyLower.includes('mentor')) {
            mentorTemplate = value;
          } else if (!channelTemplate && (keyLower.includes('channel') || keyLower.includes('announcement'))) {
            channelTemplate = value;
          }
        }
      }

      console.log('[send-welcome-messages] using templates from request body, keys:', Object.keys(bodyTemplates), 'matched: mentee=', !!menteeTemplate, 'mentor=', !!mentorTemplate, 'channel=', !!channelTemplate);
    } else {
      // Load from database
      const { data: templates, error: tplError } = await supabaseAdmin
        .from('message_templates')
        .select('*')
        .or(`cohort_id.eq.${cohortId},cohort_id.is.null`)
        .eq('is_active', true)
        .in('template_type', ['welcome_mentee', 'welcome_mentor', 'channel_announcement']);

      console.log('[send-welcome-messages] DB templates found:', templates?.length || 0, templates?.map(t => t.template_type), 'error:', tplError);

      const getTemplate = (type: string): string | null => {
        const cohortTemplate = templates?.find(t => t.template_type === type && t.cohort_id === cohortId);
        if (cohortTemplate) return cohortTemplate.body;
        const globalTemplate = templates?.find(t => t.template_type === type && !t.cohort_id);
        return globalTemplate?.body || null;
      };

      menteeTemplate = getTemplate('welcome_mentee');
      mentorTemplate = getTemplate('welcome_mentor');
      channelTemplate = getTemplate('channel_announcement');
    }

    console.log('[send-welcome-messages] templates: mentee=', !!menteeTemplate, 'mentor=', !!mentorTemplate, 'channel=', !!channelTemplate);

    // Build lookup maps
    const menteeMap = new Map(mentees.map(m => [m.mentee_id, m]));
    const mentorMap = new Map(mentors.map(m => [m.mentor_id, m]));

    // Detect dual-role participants: same slack_user_id appears as both mentee and mentor
    const menteeSlackIds = new Set(mentees.map(m => m.slack_user_id).filter(Boolean));
    const mentorSlackIds = new Set(mentors.map(m => m.slack_user_id).filter(Boolean));
    const dualRoleSlackIds = new Set([...menteeSlackIds].filter(id => mentorSlackIds.has(id)));

    // For dual-role users, build cross-role pair lookups so templates can reference both pairings
    // e.g. mentee welcome can say "You'll also be mentoring [name]"
    const dualRoleMentorPairName = new Map<string, string>(); // slack_user_id -> their mentee's name (when acting as mentor)
    const dualRoleMenteePairName = new Map<string, string>(); // slack_user_id -> their mentor's name (when acting as mentee)
    if (dualRoleSlackIds.size > 0) {
      for (const pair of pairs) {
        const mentee = menteeMap.get(pair.mentee_id);
        const mentor = mentorMap.get(pair.mentor_id);
        if (!mentee || !mentor) continue;
        if (mentee.slack_user_id && dualRoleSlackIds.has(mentee.slack_user_id)) {
          dualRoleMenteePairName.set(mentee.slack_user_id, mentor.full_name || mentor.first_name || '');
        }
        if (mentor.slack_user_id && dualRoleSlackIds.has(mentor.slack_user_id)) {
          dualRoleMentorPairName.set(mentor.slack_user_id, mentee.full_name || mentee.first_name || '');
        }
      }
    }

    // Load already-sent welcome messages for deduplication
    const { data: alreadySent } = await supabaseAdmin
      .from('message_log')
      .select('slack_user_id, template_type')
      .eq('cohort_id', cohortId)
      .in('template_type', ['welcome_mentee', 'welcome_mentor'])
      .eq('delivery_status', 'sent');

    const sentWelcomeSet = new Set(
      (alreadySent || []).map(e => `${e.slack_user_id}:${e.template_type}`)
    );

    let sentCount = 0;
    let failedCount = 0;
    let skippedNoLookup = 0;
    let skippedNoSlack = 0;
    let skippedAlreadySent = 0;
    const errors: string[] = [];

    // Send welcome DMs for each pair
    for (const pair of pairs) {
      const mentee = menteeMap.get(pair.mentee_id);
      const mentor = mentorMap.get(pair.mentor_id);
      if (!mentee || !mentor) {
        skippedNoLookup++;
        console.log('[send-welcome-messages] pair skipped: mentee_id=', pair.mentee_id, 'found=', !!mentee, 'mentor_id=', pair.mentor_id, 'found=', !!mentor);
        console.log('[send-welcome-messages] menteeMap keys:', [...menteeMap.keys()]);
        console.log('[send-welcome-messages] mentorMap keys:', [...mentorMap.keys()]);
        continue;
      }
      if (!mentee.slack_user_id && !mentor.slack_user_id) {
        skippedNoSlack++;
      }

      // Find shared capability (fall back to V3 columns if V2 are null)
      const menteePrimary = mentee.primary_capability || mentee.capabilities_wanted;
      const menteeSecondary = mentee.secondary_capability || mentee.role_specific_area;
      const mentorPrimary = mentor.primary_capability || mentor.capabilities_offered;
      const menteeCapabilities = [menteePrimary, menteeSecondary].filter(Boolean).map((c: string) => c.toLowerCase());
      const mentorCapabilities = [mentorPrimary, ...(mentor.secondary_capabilities || [])].filter(Boolean).map((c: string) => c.toLowerCase());
      const sharedCap = menteeCapabilities.find((c: string) => mentorCapabilities.includes(c)) || menteePrimary || '';

      const baseContext: TemplateContext = {
        COHORT_NAME: cohort.name,
        MENTEE_FIRST_NAME: mentee.first_name || mentee.full_name?.split(' ')[0] || '',
        MENTEE_FULL_NAME: mentee.full_name || mentee.first_name || '',
        MENTOR_FIRST_NAME: mentor.first_name || mentor.full_name?.split(' ')[0] || '',
        MENTOR_FULL_NAME: mentor.full_name || mentor.first_name || '',
        SHARED_CAPABILITY: sharedCap,
        ADMIN_EMAIL: adminEmail,
      };

      // ---- Mentee welcome DM ----
      if (menteeTemplate && mentee.slack_user_id && !sentWelcomeSet.has(`${mentee.slack_user_id}:welcome_mentee`)) {
        const menteeContext: TemplateContext = {
          ...baseContext,
          FIRST_NAME: mentee.first_name || mentee.full_name?.split(' ')[0] || '',
          FULL_NAME: mentee.full_name || '',
          ROLE_TITLE: mentee.role || '',
          PRIMARY_CAPABILITY: mentee.primary_capability || mentee.capabilities_wanted || '',
          SECONDARY_CAPABILITY: mentee.secondary_capability || mentee.role_specific_area || '',
          MENTORING_GOAL: mentee.mentoring_goal_summary || mentee.mentoring_goal || '',
          BIO: mentee.bio_summary || mentee.bio || '',
          SESSION_STYLE: mentee.preferred_style || '',
          FEEDBACK_STYLE: mentee.feedback_preference || '',
          // Include mentor fields so templates can cross-reference
          NATURAL_STRENGTHS: (mentor.natural_strengths || []).join(', '),
          HARD_EARNED_LESSON: mentor.hard_earned_lesson_summary || mentor.hard_earned_lesson || mentor.meaningful_impact || '',
          MENTOR_MOTIVATION: mentor.mentor_motivation_summary || mentor.mentor_motivation || '',
          MENTORING_EXPERIENCE: mentor.mentoring_experience_summary || mentor.mentoring_experience || '',
          // Dual-role context: available for templates to acknowledge both roles
          IS_DUAL_ROLE: mentee.slack_user_id && dualRoleSlackIds.has(mentee.slack_user_id) ? 'true' : '',
          OTHER_ROLE_PAIR_NAME: mentee.slack_user_id ? (dualRoleMentorPairName.get(mentee.slack_user_id) || '') : '',
        };

        const messageText = renderTemplate(menteeTemplate, menteeContext);

        try {
          const zapRes = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'dm',
              slack_user_id: mentee.slack_user_id,
              message_text: messageText,
              cohort_name: cohort.name,
            }),
          });

          // Log the message
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentee',
            slack_user_id: mentee.slack_user_id,
            recipient_email: mentee.slack_user_id || '',
            message_text: messageText,
            delivery_status: zapRes.ok ? 'sent' : 'failed',
            error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
          });

          if (zapRes.ok) sentCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
          errors.push(`Mentee ${mentee.slack_user_id}: ${err.message}`);
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentee',
            slack_user_id: mentee.slack_user_id,
            recipient_email: mentee.slack_user_id || '',
            message_text: renderTemplate(menteeTemplate, menteeContext),
            delivery_status: 'failed',
            error_detail: err.message,
          });
        }
      } else if (menteeTemplate && mentee.slack_user_id && sentWelcomeSet.has(`${mentee.slack_user_id}:welcome_mentee`)) {
        skippedAlreadySent++;
      }

      // ---- Mentor welcome DM ----
      if (mentorTemplate && mentor.slack_user_id && !sentWelcomeSet.has(`${mentor.slack_user_id}:welcome_mentor`)) {
        const mentorContext: TemplateContext = {
          ...baseContext,
          FIRST_NAME: mentor.first_name || mentor.full_name?.split(' ')[0] || '',
          FULL_NAME: mentor.full_name || '',
          ROLE_TITLE: mentor.role || '',
          PRIMARY_CAPABILITY: mentor.primary_capability || mentor.capabilities_offered || '',
          MENTOR_MOTIVATION: mentor.mentor_motivation_summary || mentor.mentor_motivation || '',
          HARD_EARNED_LESSON: mentor.hard_earned_lesson_summary || mentor.hard_earned_lesson || mentor.meaningful_impact || '',
          NATURAL_STRENGTHS: (mentor.natural_strengths || []).join(', '),
          BIO: mentor.bio_summary || mentor.bio || '',
          SESSION_STYLE: mentor.meeting_style || mentor.mentor_session_style || '',
          // Include mentee fields so templates can cross-reference
          MENTORING_GOAL: mentee.mentoring_goal_summary || mentee.mentoring_goal || '',
          SECONDARY_CAPABILITY: mentee.secondary_capability || mentee.role_specific_area || '',
          // Dual-role context: available for templates to acknowledge both roles
          IS_DUAL_ROLE: mentor.slack_user_id && dualRoleSlackIds.has(mentor.slack_user_id) ? 'true' : '',
          OTHER_ROLE_PAIR_NAME: mentor.slack_user_id ? (dualRoleMenteePairName.get(mentor.slack_user_id) || '') : '',
        };

        const messageText = renderTemplate(mentorTemplate, mentorContext);

        try {
          const zapRes = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'dm',
              slack_user_id: mentor.slack_user_id,
              message_text: messageText,
              cohort_name: cohort.name,
            }),
          });

          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentor',
            slack_user_id: mentor.slack_user_id,
            recipient_email: mentor.slack_user_id || '',
            message_text: messageText,
            delivery_status: zapRes.ok ? 'sent' : 'failed',
            error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
          });

          if (zapRes.ok) sentCount++;
          else failedCount++;
        } catch (err) {
          failedCount++;
          errors.push(`Mentor ${mentor.slack_user_id}: ${err.message}`);
          await supabaseAdmin.from('message_log').insert({
            cohort_id: cohortId,
            template_type: 'welcome_mentor',
            slack_user_id: mentor.slack_user_id,
            recipient_email: mentor.slack_user_id || '',
            message_text: renderTemplate(mentorTemplate, mentorContext),
            delivery_status: 'failed',
            error_detail: err.message,
          });
        }
      } else if (mentorTemplate && mentor.slack_user_id && sentWelcomeSet.has(`${mentor.slack_user_id}:welcome_mentor`)) {
        skippedAlreadySent++;
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

    console.log('[send-welcome-messages] done: pairs=', pairs.length, 'sent=', sentCount, 'failed=', failedCount, 'skippedNoLookup=', skippedNoLookup, 'skippedNoSlack=', skippedNoSlack, 'skippedAlreadySent=', skippedAlreadySent);

    // Build diagnostic hints when nothing was sent
    const diagnostics: string[] = [];
    if (skippedAlreadySent > 0) diagnostics.push(`${skippedAlreadySent} message(s) skipped: already sent to those recipients`);
    if (sentCount === 0 && failedCount === 0) {
      if (skippedNoLookup > 0) diagnostics.push(`${skippedNoLookup} pair(s) skipped: mentee/mentor ID not found in database`);
      if (skippedNoSlack > 0) diagnostics.push(`${skippedNoSlack} pair(s) have no Slack user IDs`);
      if (!menteeTemplate && !mentorTemplate) diagnostics.push('No welcome_mentee or welcome_mentor templates found');
    }

    return new Response(
      JSON.stringify({
        success: true,
        cohort: cohort.name,
        pairs: pairs.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedAlreadySent,
        ...(errors.length > 0 ? { errors } : {}),
        ...(diagnostics.length > 0 ? { diagnostics } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-welcome-messages error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
