import { supabase } from './supabase';

// ============================================================================
// MESSAGE TEMPLATE MANAGEMENT
// ============================================================================

export interface MessageTemplate {
  id: string;
  cohort_id: string | null;
  template_type: string;
  journey_phase: string | null;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageLogEntry {
  id: string;
  cohort_id: string;
  template_type: string;
  journey_phase: string | null;
  recipient_email: string;
  message_text: string;
  delivery_status: 'pending' | 'sent' | 'failed';
  error_detail: string | null;
  created_at: string;
}

/**
 * Get all message templates, optionally filtered by cohort.
 */
export async function getMessageTemplates(cohortId?: string): Promise<MessageTemplate[]> {
  let query = supabase
    .from('message_templates')
    .select('*')
    .order('template_type')
    .order('journey_phase');

  if (cohortId) {
    query = query.or(`cohort_id.eq.${cohortId},cohort_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching message templates:', error);
    throw error;
  }
  return data || [];
}

/**
 * Create or update a message template.
 */
export async function upsertMessageTemplate(
  template: Partial<MessageTemplate> & { template_type: string; body: string }
): Promise<MessageTemplate> {
  if (template.id) {
    const { data, error } = await supabase
      .from('message_templates')
      .update({
        body: template.body,
        template_type: template.template_type,
        journey_phase: template.journey_phase || null,
        cohort_id: template.cohort_id || null,
        is_active: template.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      body: template.body,
      template_type: template.template_type,
      journey_phase: template.journey_phase || null,
      cohort_id: template.cohort_id || null,
      is_active: template.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a message template.
 */
export async function deleteMessageTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get message log entries for a cohort.
 */
export async function getMessageLog(cohortId: string): Promise<MessageLogEntry[]> {
  const { data, error } = await supabase
    .from('message_log')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching message log:', error);
    throw error;
  }
  return data || [];
}

/**
 * Get a delivery summary for specific template types within a cohort.
 */
export interface MessageLogSummary {
  sent: number;
  failed: number;
  total: number;
  lastSentAt: string | null;
}

export async function getMessageLogSummary(
  cohortId: string,
  templateTypes: string[]
): Promise<MessageLogSummary> {
  const { data, error } = await supabase
    .from('message_log')
    .select('delivery_status, created_at')
    .eq('cohort_id', cohortId)
    .in('template_type', templateTypes)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching message log summary:', error);
    return { sent: 0, failed: 0, total: 0, lastSentAt: null };
  }

  const entries = data || [];
  const sent = entries.filter(e => e.delivery_status === 'sent').length;
  const failed = entries.filter(e => e.delivery_status === 'failed').length;
  const lastSentEntry = entries.find(e => e.delivery_status === 'sent');

  return {
    sent,
    failed,
    total: entries.length,
    lastSentAt: lastSentEntry?.created_at || null,
  };
}

// ============================================================================
// SEND WELCOME MESSAGES (calls edge function)
// ============================================================================

export interface SendWelcomeResult {
  success: boolean;
  pairs: number;
  sent: number;
  failed: number;
  errors?: string[];
}

export interface SendStageMessagesResult {
  success: boolean;
  pairs: number;
  sent: number;
  failed: number;
  skipped: number;
  errors?: string[];
}

/**
 * Trigger welcome messages for a cohort via the edge function.
 */
export async function sendWelcomeMessages(cohortId: string): Promise<SendWelcomeResult> {
  console.log('[sendWelcomeMessages] invoking edge function with cohort_id:', cohortId);

  const { data: result, error: fnError } = await supabase.functions.invoke(
    'send-welcome-messages',
    { body: { cohort_id: cohortId } }
  );

  console.log('[sendWelcomeMessages] response:', { data: result, error: fnError });

  if (fnError) {
    console.error('[sendWelcomeMessages] error details:', JSON.stringify(fnError, null, 2));
    const detail = (fnError as any)?.context?.message
      || (fnError as any)?.context?.error
      || fnError.message
      || 'Failed to send welcome messages';
    throw new Error(detail);
  }

  return result as SendWelcomeResult;
}

/**
 * Trigger stage messages (next-steps) for a cohort via the edge function.
 * Sends to all participants, deduplicating against previously sent messages.
 */
export async function sendStageMessages(
  cohortId: string,
  journeyPhase: string
): Promise<SendStageMessagesResult> {
  const { data: result, error: fnError } = await supabase.functions.invoke(
    'send-stage-messages',
    { body: { cohort_id: cohortId, journey_phase: journeyPhase } }
  );

  if (fnError) {
    const detail = (fnError as any)?.context?.message
      || (fnError as any)?.context?.error
      || fnError.message
      || 'Failed to send stage messages';
    throw new Error(detail);
  }

  return result as SendStageMessagesResult;
}

// ============================================================================
// TEMPLATE TYPES AND AVAILABLE PLACEHOLDERS
// ============================================================================

export const TEMPLATE_TYPES = [
  { value: 'welcome_mentee', label: 'Welcome - Mentee' },
  { value: 'welcome_mentor', label: 'Welcome - Mentor' },
  { value: 'channel_announcement', label: 'Channel Announcement' },
  { value: 'next_steps', label: 'Next Steps (generic)' },
  { value: 'next_steps_mentee', label: 'Next Steps - Mentee' },
  { value: 'next_steps_mentor', label: 'Next Steps - Mentor' },
] as const;

export const JOURNEY_PHASES = [
  { value: 'getting_started', label: 'Getting Started' },
  { value: 'building', label: 'Building' },
  { value: 'midpoint', label: 'Midpoint Check-in' },
  { value: 'wrapping_up', label: 'Wrapping Up' },
] as const;

export const AVAILABLE_PLACEHOLDERS = [
  // Person
  '{FIRST_NAME}', '{FULL_NAME}', '{ROLE_TITLE}', '{FUNCTION}',
  '{PRIMARY_CAPABILITY}', '{SECONDARY_CAPABILITY}',
  '{MENTORING_GOAL}', '{BIO}', '{SESSION_STYLE}', '{FEEDBACK_STYLE}',
  // Mentor-specific
  '{NATURAL_STRENGTHS}', '{HARD_EARNED_LESSON}', '{MENTOR_MOTIVATION}', '{MENTORING_EXPERIENCE}',
  // Pair
  '{MENTEE_FIRST_NAME}', '{MENTOR_FIRST_NAME}',
  '{MENTEE_EMAIL}', '{MENTOR_EMAIL}', '{SHARED_CAPABILITY}',
  // Cohort
  '{COHORT_NAME}', '{RESOURCE_LINK}', '{SURVEY_LINK}', '{ADMIN_EMAIL}',
] as const;
