// ============================================================================
// VIP ENGAGEMENT TYPES
// ============================================================================

export type PersonType = 'mentor' | 'mentee';

export type VIPConditionType = 'score_threshold' | 'component_threshold' | 'percentile';

export interface VIPScore {
  id: string;
  person_id: string;
  person_type: PersonType;
  cohort_id?: string;
  engagement_score: number;
  session_score: number;
  response_score: number;
  feedback_score: number;
  total_score: number;
  is_vip: boolean;
  vip_reason?: string;
  manual_vip_override: boolean;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export interface VIPRule {
  id: string;
  rule_name: string;
  description?: string;
  condition_type: VIPConditionType;
  condition_config: VIPConditionConfig;
  applies_to: 'mentor' | 'mentee' | 'both';
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VIPConditionConfig {
  threshold?: number;
  score_type?: 'total' | 'engagement' | 'session' | 'response' | 'feedback';
  component?: 'engagement_score' | 'session_score' | 'response_score' | 'feedback_score';
  percentile?: number;
}

export interface CreateVIPScoreInput {
  person_id: string;
  person_type: PersonType;
  cohort_id?: string;
  engagement_score?: number;
  session_score?: number;
  response_score?: number;
  feedback_score?: number;
  is_vip?: boolean;
  vip_reason?: string;
  manual_vip_override?: boolean;
}

export interface UpdateVIPScoreInput {
  engagement_score?: number;
  session_score?: number;
  response_score?: number;
  feedback_score?: number;
  is_vip?: boolean;
  vip_reason?: string;
  manual_vip_override?: boolean;
}

export interface CreateVIPRuleInput {
  rule_name: string;
  description?: string;
  condition_type: VIPConditionType;
  condition_config: VIPConditionConfig;
  applies_to?: 'mentor' | 'mentee' | 'both';
  priority?: number;
}

export interface UpdateVIPRuleInput {
  rule_name?: string;
  description?: string;
  condition_type?: VIPConditionType;
  condition_config?: VIPConditionConfig;
  applies_to?: 'mentor' | 'mentee' | 'both';
  priority?: number;
  is_active?: boolean;
}

// VIP summary for a cohort
export interface VIPSummary {
  total_participants: number;
  total_vips: number;
  vip_mentors: number;
  vip_mentees: number;
  avg_vip_score: number;
  avg_non_vip_score: number;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  person_id: string;
  person_name?: string;
  person_type: PersonType;
  total_score: number;
  engagement_score: number;
  session_score: number;
  response_score: number;
  feedback_score: number;
  is_vip: boolean;
}

// Score breakdown for visualization
export interface ScoreBreakdown {
  engagement: { score: number; max: number; label: string };
  session: { score: number; max: number; label: string };
  response: { score: number; max: number; label: string };
  feedback: { score: number; max: number; label: string };
}

// VIP status change event
export interface VIPStatusChange {
  person_id: string;
  person_type: PersonType;
  previous_status: boolean;
  new_status: boolean;
  reason: string;
  changed_at: string;
}

// Score component metadata
export const SCORE_COMPONENTS = {
  engagement: {
    label: 'Engagement',
    description: 'Check-in responses, survey participation',
    max: 25,
    color: 'bg-blue-500',
  },
  session: {
    label: 'Sessions',
    description: 'Session completion and quality',
    max: 25,
    color: 'bg-green-500',
  },
  response: {
    label: 'Responsiveness',
    description: 'Communication timeliness',
    max: 25,
    color: 'bg-purple-500',
  },
  feedback: {
    label: 'Feedback',
    description: 'Survey scores and ratings received',
    max: 25,
    color: 'bg-orange-500',
  },
};

// Get VIP tier based on score
export function getVIPTier(totalScore: number): {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'none';
  label: string;
  color: string;
} {
  if (totalScore >= 90) {
    return { tier: 'platinum', label: 'Platinum VIP', color: 'bg-gradient-to-r from-slate-400 to-slate-600' };
  }
  if (totalScore >= 80) {
    return { tier: 'gold', label: 'Gold VIP', color: 'bg-gradient-to-r from-yellow-400 to-yellow-600' };
  }
  if (totalScore >= 70) {
    return { tier: 'silver', label: 'Silver VIP', color: 'bg-gradient-to-r from-gray-300 to-gray-500' };
  }
  if (totalScore >= 60) {
    return { tier: 'bronze', label: 'Bronze VIP', color: 'bg-gradient-to-r from-amber-600 to-amber-800' };
  }
  return { tier: 'none', label: 'Standard', color: 'bg-gray-400' };
}
