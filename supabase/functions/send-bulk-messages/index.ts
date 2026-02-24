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
    const { cohort_id, template_type, template_body, recipients } = body;

    if (!cohort_id || !template_type || !template_body) {
      return errorResponse(400, 'Missing required fields: cohort_id, template_type, template_body');
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return errorResponse(400, 'recipients must be a non-empty array');
    }

    const zapierWebhookUrl = Deno.env.get('ZAPIER_SLACK_WEBHOOK_URL');
    if (!zapierWebhookUrl) {
      return errorResponse(500, 'ZAPIER_SLACK_WEBHOOK_URL is not configured');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify cohort exists
    const { data: cohort, error: cohortError } = await supabaseAdmin
      .from('cohorts')
      .select('name')
      .eq('id', cohort_id)
      .single();

    if (cohortError || !cohort) {
      return errorResponse(404, `Cohort not found: ${cohort_id}`);
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const { slack_user_id, context } = recipient;

      if (!slack_user_id) {
        failedCount++;
        errors.push(`Skipped recipient with no slack_user_id`);
        continue;
      }

      const templateContext: TemplateContext = {
        COHORT_NAME: cohort.name,
        ...(context || {}),
      };

      const messageText = renderTemplate(template_body, templateContext);

      try {
        const zapRes = await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dm',
            slack_user_id,
            message_text: messageText,
            cohort_name: cohort.name,
          }),
        });

        await supabaseAdmin.from('message_log').insert({
          cohort_id,
          template_type,
          slack_user_id,
          recipient_email: slack_user_id,
          message_text: messageText,
          delivery_status: zapRes.ok ? 'sent' : 'failed',
          error_detail: zapRes.ok ? null : `HTTP ${zapRes.status}`,
        });

        if (zapRes.ok) sentCount++;
        else failedCount++;
      } catch (err) {
        failedCount++;
        errors.push(`${slack_user_id}: ${err.message}`);
        await supabaseAdmin.from('message_log').insert({
          cohort_id,
          template_type,
          slack_user_id,
          recipient_email: slack_user_id,
          message_text: messageText,
          delivery_status: 'failed',
          error_detail: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        ...(errors.length > 0 ? { errors } : {}),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-bulk-messages error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
});
