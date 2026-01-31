import { supabase } from './supabase';
import type {
  VIPScore,
  VIPRule,
  CreateVIPScoreInput,
  UpdateVIPScoreInput,
  CreateVIPRuleInput,
  UpdateVIPRuleInput,
  VIPSummary,
  LeaderboardEntry,
  PersonType,
} from '@/types/vip';

// ============================================================================
// VIP SCORES CRUD
// ============================================================================

/**
 * Get all VIP scores for a cohort
 */
export async function getVIPScores(cohortId?: string): Promise<VIPScore[]> {
  let query = supabase
    .from('vip_scores')
    .select('*')
    .order('total_score', { ascending: false });

  if (cohortId) {
    query = query.eq('cohort_id', cohortId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching VIP scores:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get VIP score for a specific person
 */
export async function getVIPScoreByPerson(
  personId: string,
  cohortId?: string
): Promise<VIPScore | null> {
  let query = supabase
    .from('vip_scores')
    .select('*')
    .eq('person_id', personId);

  if (cohortId) {
    query = query.eq('cohort_id', cohortId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching VIP score:', error);
    throw error;
  }

  return data;
}

/**
 * Get all VIPs for a cohort
 */
export async function getVIPs(cohortId?: string): Promise<VIPScore[]> {
  let query = supabase
    .from('vip_scores')
    .select('*')
    .eq('is_vip', true)
    .order('total_score', { ascending: false });

  if (cohortId) {
    query = query.eq('cohort_id', cohortId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching VIPs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create or update a VIP score
 */
export async function upsertVIPScore(input: CreateVIPScoreInput): Promise<VIPScore> {
  const { data, error } = await supabase
    .from('vip_scores')
    .upsert({
      person_id: input.person_id,
      person_type: input.person_type,
      cohort_id: input.cohort_id,
      engagement_score: input.engagement_score ?? 0,
      session_score: input.session_score ?? 0,
      response_score: input.response_score ?? 0,
      feedback_score: input.feedback_score ?? 0,
      is_vip: input.is_vip ?? false,
      vip_reason: input.vip_reason,
      manual_vip_override: input.manual_vip_override ?? false,
      last_calculated_at: new Date().toISOString(),
    }, {
      onConflict: 'person_id,cohort_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting VIP score:', error);
    throw error;
  }

  return data;
}

/**
 * Update a VIP score
 */
export async function updateVIPScore(
  id: string,
  updates: UpdateVIPScoreInput
): Promise<VIPScore> {
  const { data, error } = await supabase
    .from('vip_scores')
    .update({
      ...updates,
      last_calculated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating VIP score:', error);
    throw error;
  }

  return data;
}

/**
 * Toggle VIP status manually
 */
export async function toggleVIPStatus(
  id: string,
  isVip: boolean,
  reason?: string
): Promise<VIPScore> {
  return updateVIPScore(id, {
    is_vip: isVip,
    vip_reason: reason,
    manual_vip_override: true,
  });
}

/**
 * Delete a VIP score
 */
export async function deleteVIPScore(id: string): Promise<void> {
  const { error } = await supabase
    .from('vip_scores')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting VIP score:', error);
    throw error;
  }
}

// ============================================================================
// VIP RULES CRUD
// ============================================================================

/**
 * Get all VIP rules
 */
export async function getVIPRules(): Promise<VIPRule[]> {
  const { data, error } = await supabase
    .from('vip_rules')
    .select('*')
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching VIP rules:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active VIP rules
 */
export async function getActiveVIPRules(): Promise<VIPRule[]> {
  const { data, error } = await supabase
    .from('vip_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching active VIP rules:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a VIP rule
 */
export async function createVIPRule(input: CreateVIPRuleInput): Promise<VIPRule> {
  const { data, error } = await supabase
    .from('vip_rules')
    .insert({
      rule_name: input.rule_name,
      description: input.description,
      condition_type: input.condition_type,
      condition_config: input.condition_config,
      applies_to: input.applies_to ?? 'both',
      priority: input.priority ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating VIP rule:', error);
    throw error;
  }

  return data;
}

/**
 * Update a VIP rule
 */
export async function updateVIPRule(
  id: string,
  updates: UpdateVIPRuleInput
): Promise<VIPRule> {
  const { data, error } = await supabase
    .from('vip_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating VIP rule:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a VIP rule
 */
export async function deleteVIPRule(id: string): Promise<void> {
  const { error } = await supabase
    .from('vip_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting VIP rule:', error);
    throw error;
  }
}

// ============================================================================
// VIP EVALUATION
// ============================================================================

/**
 * Evaluate if a score matches a VIP rule
 */
export function evaluateVIPRule(score: VIPScore, rule: VIPRule): boolean {
  // Check if rule applies to this person type
  if (rule.applies_to !== 'both' && rule.applies_to !== score.person_type) {
    return false;
  }

  const config = rule.condition_config;

  switch (rule.condition_type) {
    case 'score_threshold':
      if (config.score_type === 'total') {
        return score.total_score >= (config.threshold ?? 0);
      }
      // Handle specific score types
      const scoreMap: Record<string, number> = {
        engagement: score.engagement_score,
        session: score.session_score,
        response: score.response_score,
        feedback: score.feedback_score,
      };
      return (scoreMap[config.score_type ?? 'total'] ?? 0) >= (config.threshold ?? 0);

    case 'component_threshold':
      const componentMap: Record<string, number> = {
        engagement_score: score.engagement_score,
        session_score: score.session_score,
        response_score: score.response_score,
        feedback_score: score.feedback_score,
      };
      return (componentMap[config.component ?? ''] ?? 0) >= (config.threshold ?? 0);

    case 'percentile':
      // Percentile evaluation requires context of all scores
      // This should be handled at a higher level
      return false;

    default:
      return false;
  }
}

/**
 * Apply VIP rules to all scores in a cohort
 */
export async function applyVIPRules(cohortId: string): Promise<VIPScore[]> {
  const [scores, rules] = await Promise.all([
    getVIPScores(cohortId),
    getActiveVIPRules(),
  ]);

  // Calculate percentiles for percentile-based rules
  const sortedScores = [...scores].sort((a, b) => b.total_score - a.total_score);
  const percentileMap = new Map<string, number>();
  sortedScores.forEach((score, index) => {
    const percentile = ((sortedScores.length - index) / sortedScores.length) * 100;
    percentileMap.set(score.id, percentile);
  });

  const updatedScores: VIPScore[] = [];

  for (const score of scores) {
    // Skip manually overridden scores
    if (score.manual_vip_override) {
      updatedScores.push(score);
      continue;
    }

    let isVip = false;
    let vipReason = '';

    for (const rule of rules) {
      // Handle percentile rules specially
      if (rule.condition_type === 'percentile') {
        const percentile = percentileMap.get(score.id) ?? 0;
        if (percentile >= (rule.condition_config.percentile ?? 100)) {
          isVip = true;
          vipReason = rule.rule_name;
          break;
        }
      } else if (evaluateVIPRule(score, rule)) {
        isVip = true;
        vipReason = rule.rule_name;
        break;
      }
    }

    // Update if status changed
    if (score.is_vip !== isVip || score.vip_reason !== vipReason) {
      const updated = await updateVIPScore(score.id, {
        is_vip: isVip,
        vip_reason: isVip ? vipReason : undefined,
      });
      updatedScores.push(updated);
    } else {
      updatedScores.push(score);
    }
  }

  return updatedScores;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get VIP summary for a cohort
 */
export async function getVIPSummary(cohortId?: string): Promise<VIPSummary> {
  const scores = await getVIPScores(cohortId);

  const vips = scores.filter(s => s.is_vip);
  const nonVips = scores.filter(s => !s.is_vip);

  return {
    total_participants: scores.length,
    total_vips: vips.length,
    vip_mentors: vips.filter(s => s.person_type === 'mentor').length,
    vip_mentees: vips.filter(s => s.person_type === 'mentee').length,
    avg_vip_score: vips.length > 0
      ? vips.reduce((sum, s) => sum + s.total_score, 0) / vips.length
      : 0,
    avg_non_vip_score: nonVips.length > 0
      ? nonVips.reduce((sum, s) => sum + s.total_score, 0) / nonVips.length
      : 0,
  };
}

/**
 * Get leaderboard for a cohort
 */
export async function getLeaderboard(
  cohortId?: string,
  limit: number = 10,
  personType?: PersonType
): Promise<LeaderboardEntry[]> {
  let scores = await getVIPScores(cohortId);

  if (personType) {
    scores = scores.filter(s => s.person_type === personType);
  }

  // Sort by total score descending
  scores.sort((a, b) => b.total_score - a.total_score);

  // Take top entries
  const topScores = scores.slice(0, limit);

  return topScores.map((score, index) => ({
    rank: index + 1,
    person_id: score.person_id,
    person_type: score.person_type,
    total_score: score.total_score,
    engagement_score: score.engagement_score,
    session_score: score.session_score,
    response_score: score.response_score,
    feedback_score: score.feedback_score,
    is_vip: score.is_vip,
  }));
}

/**
 * Check if a person is a VIP
 */
export async function isPersonVIP(
  personId: string,
  cohortId?: string
): Promise<boolean> {
  const score = await getVIPScoreByPerson(personId, cohortId);
  return score?.is_vip ?? false;
}
