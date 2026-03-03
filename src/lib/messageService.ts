import { supabase } from './supabase';

// ============================================================================
// MESSAGE TEMPLATE MANAGEMENT
// ============================================================================

export interface MessageTemplate {
  id: string;
  cohort_id: string | null;
  template_type: string;
  journey_phase: string | null;
  stage_type: string | null;
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
        stage_type: template.stage_type || null,
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
      stage_type: template.stage_type || null,
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
  diagnostics?: string[];
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
 * Optionally pass template bodies so the edge function doesn't need to query the DB.
 */
export async function sendWelcomeMessages(
  cohortId: string,
  templates?: Record<string, string>,
): Promise<SendWelcomeResult> {
  console.log('[sendWelcomeMessages] invoking edge function with cohort_id:', cohortId, 'templates passed:', !!templates);

  const { data: result, error: fnError } = await supabase.functions.invoke(
    'send-welcome-messages',
    { body: { cohort_id: cohortId, ...(templates ? { templates } : {}) } }
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
  { value: '_custom', label: 'Custom...' },
] as const;

export const STAGE_TYPES = [
  { value: 'launch', label: 'Launch' },
  { value: 'midpoint', label: 'Midpoint' },
  { value: 'closure', label: 'Closure' },
  { value: 'setup', label: 'Setup' },
  { value: 'reporting', label: 'Reporting' },
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
  '{MENTEE_FIRST_NAME}', '{MENTEE_FULL_NAME}',
  '{MENTOR_FIRST_NAME}', '{MENTOR_FULL_NAME}',
  '{SHARED_CAPABILITY}',
  // Cohort
  '{COHORT_NAME}', '{RESOURCE_LINK}', '{SURVEY_LINK}', '{ADMIN_EMAIL}',
] as const;

// ============================================================================
// PARTICIPANT HELPERS (for bulk messaging)
// ============================================================================

export interface Participant {
  id: string;
  type: 'mentee' | 'mentor';
  full_name: string;
  first_name: string;
  slack_user_id: string | null;
  primary_capability: string | null;
  secondary_capability: string | null;
  bio: string | null;
  mentoring_goal: string | null;
  role: string | null;
  cohort_id: string;
}

function menteeToParticipant(m: any): Participant {
  return {
    id: m.mentee_id,
    type: 'mentee',
    full_name: m.full_name || '',
    first_name: m.first_name || m.full_name?.split(' ')[0] || '',
    slack_user_id: m.slack_user_id || null,
    primary_capability: m.primary_capability || null,
    secondary_capability: m.secondary_capability || null,
    bio: m.bio || null,
    mentoring_goal: m.mentoring_goal || null,
    role: m.role || null,
    cohort_id: m.cohort_id,
  };
}

function mentorToParticipant(m: any): Participant {
  return {
    id: m.mentor_id,
    type: 'mentor',
    full_name: m.full_name || '',
    first_name: m.first_name || m.full_name?.split(' ')[0] || '',
    slack_user_id: m.slack_user_id || null,
    primary_capability: m.primary_capability || null,
    secondary_capability: m.secondary_capability || null,
    bio: m.bio || null,
    mentoring_goal: m.mentor_motivation || null,
    role: m.role || null,
    cohort_id: m.cohort_id,
  };
}

/**
 * Get all mentees + mentors in a cohort.
 */
export async function getCohortParticipants(cohortId: string): Promise<Participant[]> {
  const [menteesRes, mentorsRes] = await Promise.all([
    supabase.from('mentees').select('*').eq('cohort_id', cohortId),
    supabase.from('mentors').select('*').eq('cohort_id', cohortId),
  ]);

  const mentees = (menteesRes.data || []).map(menteeToParticipant);
  const mentors = (mentorsRes.data || []).map(mentorToParticipant);
  return [...mentees, ...mentors];
}

/**
 * Get unmatched mentees in a cohort (those without a proposed_assignment in matching results).
 */
export async function getUnmatchedInCohort(cohortId: string): Promise<Participant[]> {
  // Get the cohort to read matching results
  const { data: cohort, error } = await supabase
    .from('cohorts')
    .select('matches, manual_matches')
    .eq('id', cohortId)
    .single();

  if (error || !cohort) return [];

  // Collect all matched mentee IDs from both algo and manual matches
  const matchedMenteeIds = new Set<string>();
  const algoResults = (cohort.matches as any)?.results || [];
  for (const r of algoResults) {
    if (r.proposed_assignment?.mentor_id) {
      matchedMenteeIds.add(r.mentee_id);
    }
  }
  const manualMatches = (cohort.manual_matches as any)?.matches || [];
  for (const m of manualMatches) {
    matchedMenteeIds.add(m.mentee_id);
  }

  // Get all mentees in cohort and filter to unmatched
  const { data: mentees } = await supabase
    .from('mentees')
    .select('*')
    .eq('cohort_id', cohortId);

  return (mentees || [])
    .filter(m => !matchedMenteeIds.has(m.mentee_id))
    .map(menteeToParticipant);
}

/**
 * Get everyone in the holding area (cohort_id = 'unassigned').
 */
export async function getHoldingAreaParticipants(): Promise<Participant[]> {
  const [menteesRes, mentorsRes] = await Promise.all([
    supabase.from('mentees').select('*').eq('cohort_id', 'unassigned'),
    supabase.from('mentors').select('*').eq('cohort_id', 'unassigned'),
  ]);

  const mentees = (menteesRes.data || []).map(menteeToParticipant);
  const mentors = (mentorsRes.data || []).map(mentorToParticipant);
  return [...mentees, ...mentors];
}

// ============================================================================
// SEND BULK MESSAGES (calls edge function)
// ============================================================================

export interface BulkRecipient {
  slack_user_id: string;
  context: Record<string, string>;
}

export interface SendBulkResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

/**
 * Build the template context for a participant.
 */
export function buildParticipantContext(
  participant: Participant,
  cohortName?: string,
): Record<string, string> {
  return {
    FIRST_NAME: participant.first_name,
    FULL_NAME: participant.full_name,
    ROLE_TITLE: participant.role || '',
    PRIMARY_CAPABILITY: participant.primary_capability || '',
    SECONDARY_CAPABILITY: participant.secondary_capability || '',
    MENTORING_GOAL: participant.mentoring_goal || '',
    BIO: participant.bio || '',
    COHORT_NAME: cohortName || '',
    ADMIN_EMAIL: 'mentoring@mews.com',
  };
}

// ============================================================================
// DEFAULT STARTER TEMPLATES
// ============================================================================

/** Stage-type → template-type mapping (shared with CohortRunbook) */
export const STAGE_DEFAULT_TEMPLATE_TYPES: Record<string, { types: string[]; phase?: string }> = {
  launch: { types: ['welcome_mentee', 'welcome_mentor', 'channel_announcement'] },
  midpoint: { types: ['next_steps', 'next_steps_mentee', 'next_steps_mentor'], phase: 'midpoint' },
  closure: { types: ['next_steps', 'next_steps_mentee', 'next_steps_mentor'], phase: 'wrapping_up' },
};

export const DEFAULT_TEMPLATES: Array<{ template_type: string; journey_phase: string | null; body: string }> = [
  {
    template_type: 'welcome_mentee',
    journey_phase: null,
    body: `Hi {FIRST_NAME}! 👋

Welcome to the {COHORT_NAME} mentoring program! You've been matched with {MENTOR_FIRST_NAME} as your mentor.

Here's what we know about your match:
• Your focus area: {PRIMARY_CAPABILITY}
• Shared capability: {SHARED_CAPABILITY}

**Next steps:**
1. Reach out to {MENTOR_FIRST_NAME} to introduce yourself and schedule your first session
2. Before your first meeting, think about what you'd like to get out of this mentoring relationship
3. Your mentoring goal: {MENTORING_GOAL} — share this with your mentor so they can tailor their support

We recommend meeting every 2-3 weeks for 30-60 minutes. You'll receive a session log form after each meeting to help us track how things are going.

If you have any questions, reach out to {ADMIN_EMAIL}.

Happy mentoring! 🚀`,
  },
  {
    template_type: 'welcome_mentor',
    journey_phase: null,
    body: `Hi {FIRST_NAME}! 👋

Thank you for volunteering as a mentor in the {COHORT_NAME} program! You've been matched with {MENTEE_FIRST_NAME}.

Here's your match overview:
• Shared capability: {SHARED_CAPABILITY}
• Your mentee's focus: {PRIMARY_CAPABILITY}

**About your mentee:**
They want to develop: {PRIMARY_CAPABILITY}
Their goal: Your mentee will share more details in your first session.

**Getting started:**
1. Your mentee will reach out to schedule your first meeting — feel free to initiate if you haven't heard from them within a few days
2. In your first session, focus on getting to know each other and setting expectations
3. We recommend meeting every 2-3 weeks for 30-60 minutes

After each session, you'll receive a short log form. This helps us understand engagement across the program.

Your motivation for mentoring: {MENTOR_MOTIVATION} — hold onto that, it matters!

Questions? Reach out to {ADMIN_EMAIL}.

Thank you for investing in someone's growth! 🙏`,
  },
  {
    template_type: 'channel_announcement',
    journey_phase: null,
    body: `🎉 **{COHORT_NAME} Mentoring Program has launched!**

All mentee-mentor pairs have been matched and notified. Mentees and mentors — check your DMs for your match details and next steps.

📋 **Quick reminders:**
• Mentees: reach out to your mentor to schedule your first session
• Mentors: expect to hear from your mentee soon
• Both: log your sessions using the form we'll share — it helps us support you better

Let's make this cohort a great one! 🚀`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'getting_started',
    body: `Great job on completing a session, {FIRST_NAME}! 🎯

Since you're in the **Getting Started** phase, here are some tips for your next meeting:

• Reflect on what went well and what you'd like to explore more deeply
• Start thinking about 1-2 specific skills or challenges you want to work on together
• Consider sharing relevant resources or context before your next session

Keep the momentum going — regular sessions make the biggest difference.

Questions or need support? Contact {ADMIN_EMAIL}.`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'building',
    body: `Another session in the books, {FIRST_NAME}! 💪

You're in the **Building** phase — this is where the real growth happens. For your next session:

• Review any action items from today's meeting
• Think about what's challenging you at work right now — bring a real problem to discuss
• Consider if there's anyone in your mentor's/mentee's network who could help with your goals

Remember: the best mentoring conversations are the honest ones.

Need anything? Reach out to {ADMIN_EMAIL}.`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'midpoint',
    body: `You've reached the midpoint of {COHORT_NAME}, {FIRST_NAME}! 🏁

Time for a quick check-in:

• How is the mentoring relationship going? Are you getting what you need?
• Revisit your original goal: {MENTORING_GOAL} — are you on track?
• Is there anything you'd like to adjust about how you work together?

This is a great time to have an honest conversation with your mentor/mentee about what's working and what could be better.

You'll receive a brief midpoint survey soon — your feedback helps us improve the program.

Questions? {ADMIN_EMAIL} is here to help.`,
  },
  {
    template_type: 'next_steps',
    journey_phase: 'wrapping_up',
    body: `You're approaching the end of {COHORT_NAME}, {FIRST_NAME}! 🎓

As you wrap up your mentoring journey:

• Reflect on what you've learned and how you've grown
• Discuss with your mentor/mentee whether you'd like to stay in touch informally
• Think about what advice you'd give to future participants

You'll receive a final survey soon — we'd love to hear about your experience.

Thank you for being part of this program. Whether you were a mentor or mentee, you've contributed to someone else's growth, and that matters.

Reach out to {ADMIN_EMAIL} if there's anything you need. 🙏`,
  },
];

/**
 * Seed default templates for a specific stage type.
 * Creates any missing templates and tags them with the stage_type.
 * Returns the number of templates created.
 */
export async function seedDefaultTemplatesForStage(stageType: string): Promise<number> {
  const stageConfig = STAGE_DEFAULT_TEMPLATE_TYPES[stageType];
  if (!stageConfig) return 0;

  // Get existing templates to check for duplicates
  const existing = await getMessageTemplates();

  // Filter DEFAULT_TEMPLATES to those relevant for this stage
  const relevantDefaults = DEFAULT_TEMPLATES.filter(tpl => {
    if (!stageConfig.types.includes(tpl.template_type)) return false;
    // For next_steps templates, also match by phase
    if (stageConfig.phase && tpl.template_type === 'next_steps' && tpl.journey_phase !== stageConfig.phase) return false;
    return true;
  });

  let created = 0;
  for (const tpl of relevantDefaults) {
    // Check if template already exists (global scope, same type + phase)
    const exists = existing.some(
      t => t.template_type === tpl.template_type
        && t.journey_phase === tpl.journey_phase
        && !t.cohort_id
    );

    if (exists) {
      // Template exists but may not have stage_type set — update it
      const existingTpl = existing.find(
        t => t.template_type === tpl.template_type
          && t.journey_phase === tpl.journey_phase
          && !t.cohort_id
      );
      if (existingTpl && !existingTpl.stage_type) {
        await upsertMessageTemplate({
          ...existingTpl,
          stage_type: stageType,
        });
      }
      continue;
    }

    await upsertMessageTemplate({
      template_type: tpl.template_type,
      journey_phase: tpl.journey_phase,
      cohort_id: null, // Global scope
      stage_type: stageType,
      body: tpl.body,
      is_active: true,
    });
    created++;
  }

  return created;
}

/**
 * Seed ALL default templates (for the Settings page "Add Default Templates" button).
 * Returns the number of templates created.
 */
export async function seedAllDefaultTemplates(): Promise<number> {
  const existing = await getMessageTemplates();

  let created = 0;
  for (const tpl of DEFAULT_TEMPLATES) {
    const exists = existing.some(
      t => t.template_type === tpl.template_type
        && t.journey_phase === tpl.journey_phase
        && !t.cohort_id
    );
    if (exists) continue;

    await upsertMessageTemplate({
      template_type: tpl.template_type,
      journey_phase: tpl.journey_phase,
      cohort_id: null,
      body: tpl.body,
      is_active: true,
    });
    created++;
  }

  return created;
}

/**
 * Send bulk messages via the send-bulk-messages edge function.
 */
export async function sendBulkMessages(params: {
  cohortId: string;
  templateType: string;
  templateBody: string;
  recipients: BulkRecipient[];
}): Promise<SendBulkResult> {
  const { data: result, error: fnError } = await supabase.functions.invoke(
    'send-bulk-messages',
    {
      body: {
        cohort_id: params.cohortId,
        template_type: params.templateType,
        template_body: params.templateBody,
        recipients: params.recipients,
      },
    }
  );

  if (fnError) {
    const detail = (fnError as any)?.context?.message
      || (fnError as any)?.context?.error
      || fnError.message
      || 'Failed to send bulk messages';
    throw new Error(detail);
  }

  return result as SendBulkResult;
}
