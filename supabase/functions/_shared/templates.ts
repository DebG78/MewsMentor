// ============================================================================
// Shared template utilities for edge functions
// ============================================================================

export interface TemplateContext {
  // Person fields
  FIRST_NAME?: string;
  FULL_NAME?: string;
  ROLE_TITLE?: string;
  FUNCTION?: string;
  PRIMARY_CAPABILITY?: string;
  SECONDARY_CAPABILITY?: string;
  MENTORING_GOAL?: string;
  BIO?: string;
  SESSION_STYLE?: string;
  FEEDBACK_STYLE?: string;
  // Mentor-specific
  NATURAL_STRENGTHS?: string;
  HARD_EARNED_LESSON?: string;
  MENTOR_MOTIVATION?: string;
  MENTORING_EXPERIENCE?: string;
  // Pair fields
  MENTEE_FIRST_NAME?: string;
  MENTEE_FULL_NAME?: string;
  MENTOR_FIRST_NAME?: string;
  MENTOR_FULL_NAME?: string;
  MENTEE_EMAIL?: string;
  MENTOR_EMAIL?: string;
  SHARED_CAPABILITY?: string;
  // Cohort
  COHORT_NAME?: string;
  RESOURCE_LINK?: string;
  SURVEY_LINK?: string;
  ADMIN_EMAIL?: string;
  // Allow additional keys
  [key: string]: string | undefined;
}

export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return context[key] || match;
  });
}

