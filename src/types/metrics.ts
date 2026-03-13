// ============================================================================
// SUCCESS METRICS TYPES
// ============================================================================

export type MetricCategory = 'engagement' | 'satisfaction' | 'completion' | 'retention';

export type ComparisonDirection = 'higher_is_better' | 'lower_is_better';

export type MetricStatus = 'on_track' | 'warning' | 'critical' | 'no_data';

export interface SuccessTarget {
  id: string;
  cohort_id?: string;
  metric_name: string;
  metric_category: MetricCategory;
  target_value: number;
  target_unit?: string;
  warning_threshold?: number;
  critical_threshold?: number;
  comparison_direction: ComparisonDirection;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricSnapshot {
  id: string;
  cohort_id: string;
  metric_name: string;
  actual_value: number;
  snapshot_date: string;
  notes?: string;
  created_at: string;
}

export interface CreateSuccessTargetInput {
  cohort_id?: string;
  metric_name: string;
  metric_category: MetricCategory;
  target_value: number;
  target_unit?: string;
  warning_threshold?: number;
  critical_threshold?: number;
  comparison_direction?: ComparisonDirection;
  description?: string;
}

export interface UpdateSuccessTargetInput {
  metric_name?: string;
  metric_category?: MetricCategory;
  target_value?: number;
  target_unit?: string;
  warning_threshold?: number;
  critical_threshold?: number;
  comparison_direction?: ComparisonDirection;
  description?: string;
  is_active?: boolean;
}

export interface CreateMetricSnapshotInput {
  cohort_id: string;
  metric_name: string;
  actual_value: number;
  snapshot_date?: string;
  notes?: string;
}

// ============================================================================
// END-OF-MENTORING SURVEY TYPES
// ============================================================================

export interface EndSurveyResponse {
  id: string;
  cohort_id: string;
  slack_user_id?: string;
  respondent_name?: string;
  respondent_type: 'mentor' | 'mentee' | 'both';
  survey_date: string;

  // Mentor questions (Q3-Q7)
  mentor_support_growth?: number;
  mentor_used_new_skills?: number;
  mentor_saw_impact?: number;
  mentor_time_worthwhile?: number;
  mentor_behavior_change?: string;

  // Mentee questions (Q8-Q12)
  mentee_skill_clarity?: number;
  mentee_focus_clarity?: number;
  mentee_perspective_challenged?: number;
  mentee_prepared_between?: number;
  mentee_unexpected_development?: string;

  // Experience questions (Q13-Q21)
  cross_team_collaboration?: number;
  match_satisfaction?: number;
  comfortable_being_open?: number;
  meeting_frequency?: string;
  session_became_useful?: string;
  overall_worth?: number;
  easy_momentum?: number;
  would_join_again?: 'yes' | 'no' | 'maybe';
  open_feedback?: string;

  created_at: string;
}

export interface EndSurveySummary {
  totalResponses: number;
  mentorCount: number;
  menteeCount: number;
  avgMentorSatisfaction: number | null;
  avgMenteeSatisfaction: number | null;
  avgMatchSatisfaction: number | null;
  avgOverallWorth: number | null;
  npsScore: number | null;
  mentorRetentionRate: number | null;
  goalAchievementRate: number | null;
}

// Calculated metric with target comparison
export interface MetricWithStatus {
  target: SuccessTarget;
  latestValue?: number;
  latestDate?: string;
  status: MetricStatus;
  percentOfTarget: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
}

// Category summary for dashboard
export interface CategorySummary {
  category: MetricCategory;
  totalMetrics: number;
  onTrack: number;
  warning: number;
  critical: number;
  noData: number;
  averagePerformance: number;
}

// Time series data point for charts
export interface TrendDataPoint {
  date: string;
  value: number;
  target?: number;
}

// Cohort comparison data
export interface CohortComparison {
  cohort_id: string;
  cohort_name: string;
  metric_name: string;
  actual_value: number;
  target_value: number;
  status: MetricStatus;
}

// Dashboard summary
export interface MetricsDashboardSummary {
  totalMetrics: number;
  onTrack: number;
  warning: number;
  critical: number;
  noData: number;
  categorySummaries: CategorySummary[];
  topPerformers: MetricWithStatus[];
  needsAttention: MetricWithStatus[];
}

// Metric display metadata
export const METRIC_CATEGORY_METADATA: Record<MetricCategory, { label: string; icon: string; color: string }> = {
  engagement: {
    label: 'Engagement',
    icon: 'Activity',
    color: 'bg-blue-500',
  },
  satisfaction: {
    label: 'Satisfaction',
    icon: 'Heart',
    color: 'bg-pink-500',
  },
  completion: {
    label: 'Completion',
    icon: 'CheckCircle',
    color: 'bg-green-500',
  },
  retention: {
    label: 'Retention',
    icon: 'Users',
    color: 'bg-purple-500',
  },
};

// Common metric names and their display labels
export const METRIC_LABELS: Record<string, string> = {
  session_completion_rate: 'Session Completion Rate',
  average_sessions_per_pair: 'Avg Sessions per Pair',
  check_in_response_rate: 'Check-in Response Rate',

  mentee_satisfaction_score: 'Mentee Satisfaction',
  mentor_satisfaction_score: 'Mentor Satisfaction',
  nps_score: 'NPS Score',
  program_completion_rate: 'Program Completion Rate',
  goal_achievement_rate: 'Goal Achievement Rate',
  mentor_retention_rate: 'Mentor Retention Rate',
  early_dropout_rate: 'Early Dropout Rate',
  match_satisfaction_score: 'Match Satisfaction',
};

// Unit formatters
export function formatMetricValue(value: number, unit?: string): string {
  if (!unit) return value.toFixed(1);

  switch (unit) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'rating':
      return `${value.toFixed(1)}/5`;
    case 'count':
      return value.toFixed(0);
    case 'days':
      return `${value.toFixed(0)} days`;
    default:
      return value.toFixed(1);
  }
}
