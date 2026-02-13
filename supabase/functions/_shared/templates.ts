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
  MENTOR_FIRST_NAME?: string;
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

// ============================================================================
// Session threshold defaults and phase detection
// ============================================================================

export interface SessionThresholdRange {
  min: number;
  max: number | null;
}

export type SessionThresholds = Record<string, SessionThresholdRange>;

export const DEFAULT_SESSION_THRESHOLDS: SessionThresholds = {
  getting_started: { min: 1, max: 2 },
  building: { min: 3, max: 5 },
  midpoint: { min: 6, max: 7 },
  wrapping_up: { min: 8, max: null },
};

export function detectJourneyPhase(
  sessionCount: number,
  thresholds: SessionThresholds
): string | null {
  const phases = ['getting_started', 'building', 'midpoint', 'wrapping_up'];
  for (const phase of phases) {
    const range = thresholds[phase];
    if (!range) continue;
    if (sessionCount >= range.min && (range.max === null || sessionCount <= range.max)) {
      return phase;
    }
  }
  return null;
}
