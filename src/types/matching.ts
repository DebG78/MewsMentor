// Matching Model Types for Configurable Matching Criteria

export interface MatchingWeights {
  capability: number;
  semantic: number;
  domain: number;
  seniority: number;
  timezone: number;
  capacity_penalty: number;
  // Advanced weights (opt-in, default 0)
  compatibility: number;
  proficiency_gap: number;
  department_diversity: number;
  // Legacy fields kept for backward compat with saved models
  topics?: number;
  industry?: number;
  language?: number;
}

export interface MatchingFilters {
  max_timezone_difference: number;
  require_available_capacity: boolean;
  // Legacy field kept for backward compat
  min_language_overlap?: number;
}

export interface MatchingModel {
  id: string;
  name: string;
  version: number;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  is_default: boolean;
  weights: MatchingWeights;
  filters: MatchingFilters;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MatchingModelWithCriteria extends MatchingModel {
  criteria: MatchingCriterion[];
  rules: MatchingRule[];
}

export type QuestionType = 'single_select' | 'multi_select' | 'scale' | 'free_text';
export type AppliesTo = 'mentor' | 'mentee' | 'both';

export interface CriterionOption {
  value: string;
  label: string;
  points?: number;
}

export interface MatchingCriterion {
  id: string;
  matching_model_id: string;
  question_text: string;
  question_type: QuestionType;
  applies_to: AppliesTo;
  options?: CriterionOption[];
  scoring_attribute?: string;
  weight: number;
  is_must_have: boolean;
  is_exclusion: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RuleType = 'must_have' | 'exclusion' | 'bonus' | 'penalty';

export interface RuleCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: string | number | string[] | number[];
}

export interface RuleAction {
  type: 'exclude' | 'require' | 'points' | 'flag_approval';
  value?: number;
  reason?: string;
}

export interface MatchingRule {
  id: string;
  matching_model_id: string;
  rule_type: RuleType;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating
export interface CreateMatchingModelInput {
  name: string;
  description?: string;
  weights?: Partial<MatchingWeights>;
  filters?: Partial<MatchingFilters>;
  created_by?: string;
}

export interface UpdateMatchingModelInput {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  is_default?: boolean;
  weights?: Partial<MatchingWeights>;
  filters?: Partial<MatchingFilters>;
}

export interface CreateMatchingCriterionInput {
  matching_model_id: string;
  question_text: string;
  question_type: QuestionType;
  applies_to: AppliesTo;
  options?: CriterionOption[];
  scoring_attribute?: string;
  weight?: number;
  is_must_have?: boolean;
  is_exclusion?: boolean;
  display_order?: number;
}

export interface CreateMatchingRuleInput {
  matching_model_id: string;
  rule_type: RuleType;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  priority?: number;
}

// Enhanced matching score types for the matching engine
export interface ScoreBreakdown {
  criterion: string;
  criterion_name: string;
  raw_score: number;
  max_possible: number;
  weight: number;
  weighted_score: number;
}

export interface ConstraintViolation {
  rule_id: string;
  rule_name: string;
  severity: 'warning' | 'error';
  description: string;
}

export interface AlternativeMentor {
  mentor_id: string;
  mentor_name: string;
  score: number;
  rank: number; // 2 = second best, 3 = third best
}

export interface EnhancedMatchScore {
  total_score: number;
  score_breakdown: ScoreBreakdown[];
  alternative_mentors: AlternativeMentor[];
  constraint_violations: ConstraintViolation[];
  needs_approval: boolean;
  approval_reason?: string;
}

// Default weights constant
export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  capability: 45,
  semantic: 30,
  domain: 5,
  seniority: 10,
  timezone: 5,
  capacity_penalty: 10,
  // Advanced weights (opt-in, default 0 — no effect unless admin enables)
  compatibility: 0,
  proficiency_gap: 0,
  department_diversity: 0,
};

// Default filters constant
export const DEFAULT_MATCHING_FILTERS: MatchingFilters = {
  max_timezone_difference: 6,
  require_available_capacity: true,
};
