import { supabase } from './supabase';
import { getSessionStats, getSessionsByCohort, computePairSessionSummaries } from './sessionService';
import { getEndSurveyResponses } from './supabaseService';
import { upsertMetricSnapshot } from './metricsService';
import { getAllCohortParticipants } from './programCohortService';
import type { CreateMetricSnapshotInput } from '@/types/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface ComputedMetric {
  metric_name: string;
  value: number | null;
  notes: string;
}

export interface ComputeResult {
  stored: number;
  skipped: number;
  errors: string[];
}

// ============================================================================
// INDIVIDUAL METRIC COMPUTATIONS
// ============================================================================

/**
 * 1. Session Completion Rate (%)
 * Completed sessions / (unique pairs × target sessions per pair).
 * Target is 4 sessions per pair.
 */
const TARGET_SESSIONS_PER_PAIR = 4;

export async function computeSessionCompletionRate(cohortId: string): Promise<ComputedMetric> {
  const sessions = await getSessionsByCohort(cohortId);
  const pairSummaries = computePairSessionSummaries(sessions);
  if (pairSummaries.length === 0) {
    return { metric_name: 'session_completion_rate', value: null, notes: 'No pairs found' };
  }
  const completed = sessions.filter(s => s.status === 'completed').length;
  const expected = pairSummaries.length * TARGET_SESSIONS_PER_PAIR;
  const rate = Math.round((completed / expected) * 1000) / 10;
  return {
    metric_name: 'session_completion_rate',
    value: rate,
    notes: `${completed} completed / ${expected} expected (${pairSummaries.length} pairs × ${TARGET_SESSIONS_PER_PAIR} target)`,
  };
}

/**
 * 2. Average Sessions per Pair
 * Counts completed sessions divided by unique pairs.
 */
export async function computeAverageSessionsPerPair(cohortId: string): Promise<ComputedMetric> {
  const sessions = await getSessionsByCohort(cohortId);
  const pairSummaries = computePairSessionSummaries(sessions);
  if (pairSummaries.length === 0) {
    return { metric_name: 'average_sessions_per_pair', value: null, notes: 'No pairs found' };
  }
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const avg = Math.round((completedSessions.length / pairSummaries.length) * 10) / 10;
  return {
    metric_name: 'average_sessions_per_pair',
    value: avg,
    notes: `${completedSessions.length} completed sessions across ${pairSummaries.length} pairs`,
  };
}

/**
 * 3. Check-in Response Rate (%)
 * Direct query on check_ins table.
 */
export async function computeCheckInResponseRate(cohortId: string): Promise<ComputedMetric> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, status')
    .eq('cohort_id', cohortId);

  if (error) {
    console.error('Error fetching check-ins:', error);
    return { metric_name: 'check_in_response_rate', value: null, notes: `Error: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { metric_name: 'check_in_response_rate', value: null, notes: 'No check-ins found' };
  }

  const completed = data.filter(c => c.status === 'completed').length;
  const rate = Math.round((completed / data.length) * 1000) / 10;
  return {
    metric_name: 'check_in_response_rate',
    value: rate,
    notes: `${completed} completed / ${data.length} total check-ins`,
  };
}

/**
 * 4. Mentee Satisfaction Score (1-5 rating)
 * Blends session mentee_rating with end survey mentee satisfaction.
 */
export async function computeMenteeSatisfactionScore(cohortId: string): Promise<ComputedMetric> {
  const stats = await getSessionStats(cohortId);
  const surveyResponses = await getEndSurveyResponses(cohortId);

  const sessionRating = stats.avgMenteeRating;
  const sessionCount = stats.completed; // approximate number of ratings

  // Survey mentee satisfaction: avg of Q8 (mentee_skill_clarity), Q9 (mentee_focus_clarity), Q18 (overall_worth)
  const menteeResponses = surveyResponses.filter(r => r.respondent_type === 'mentee' || r.respondent_type === 'both');
  let surveyRating: number | null = null;
  let surveyCount = 0;
  if (menteeResponses.length > 0) {
    const satValues = menteeResponses
      .map(r => {
        const scores = [r.mentee_skill_clarity, r.mentee_focus_clarity, r.overall_worth].filter((v): v is number => v != null);
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      })
      .filter((v): v is number => v !== null);
    if (satValues.length > 0) {
      surveyRating = satValues.reduce((a, b) => a + b, 0) / satValues.length;
      surveyCount = satValues.length;
    }
  }

  const blended = blendRatings(sessionRating, sessionCount, surveyRating, surveyCount);
  if (blended === null) {
    return { metric_name: 'mentee_satisfaction_score', value: null, notes: 'No mentee ratings or survey data' };
  }

  const parts: string[] = [];
  if (sessionRating !== null) parts.push(`session avg: ${sessionRating.toFixed(1)}`);
  if (surveyRating !== null) parts.push(`survey avg: ${surveyRating.toFixed(1)}`);

  return {
    metric_name: 'mentee_satisfaction_score',
    value: Math.round(blended * 10) / 10,
    notes: `Blended from ${parts.join(', ')}`,
  };
}

/**
 * 5. Mentor Satisfaction Score (1-5 rating)
 * Blends session mentor_rating with end survey mentor satisfaction.
 */
export async function computeMentorSatisfactionScore(cohortId: string): Promise<ComputedMetric> {
  const stats = await getSessionStats(cohortId);
  const surveyResponses = await getEndSurveyResponses(cohortId);

  const sessionRating = stats.avgMentorRating;
  const sessionCount = stats.completed;

  // Survey mentor satisfaction: avg of Q3 (mentor_support_growth), Q5 (mentor_saw_impact), Q6 (mentor_time_worthwhile)
  const mentorResponses = surveyResponses.filter(r => r.respondent_type === 'mentor' || r.respondent_type === 'both');
  let surveyRating: number | null = null;
  let surveyCount = 0;
  if (mentorResponses.length > 0) {
    const satValues = mentorResponses
      .map(r => {
        const scores = [r.mentor_support_growth, r.mentor_saw_impact, r.mentor_time_worthwhile].filter((v): v is number => v != null);
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      })
      .filter((v): v is number => v !== null);
    if (satValues.length > 0) {
      surveyRating = satValues.reduce((a, b) => a + b, 0) / satValues.length;
      surveyCount = satValues.length;
    }
  }

  const blended = blendRatings(sessionRating, sessionCount, surveyRating, surveyCount);
  if (blended === null) {
    return { metric_name: 'mentor_satisfaction_score', value: null, notes: 'No mentor ratings or survey data' };
  }

  const parts: string[] = [];
  if (sessionRating !== null) parts.push(`session avg: ${sessionRating.toFixed(1)}`);
  if (surveyRating !== null) parts.push(`survey avg: ${surveyRating.toFixed(1)}`);

  return {
    metric_name: 'mentor_satisfaction_score',
    value: Math.round(blended * 10) / 10,
    notes: `Blended from ${parts.join(', ')}`,
  };
}

/**
 * 6. NPS Score (-100 to 100)
 * Calculated from end survey would_join_again responses.
 */
export async function computeNpsScore(cohortId: string): Promise<ComputedMetric> {
  const surveyResponses = await getEndSurveyResponses(cohortId);
  const validResponses = surveyResponses.filter(r => r.would_join_again);

  if (validResponses.length === 0) {
    return { metric_name: 'nps_score', value: null, notes: 'No survey responses with would_join_again' };
  }

  const promoters = validResponses.filter(r => r.would_join_again === 'yes').length;
  const detractors = validResponses.filter(r => r.would_join_again === 'no').length;
  const nps = Math.round(((promoters - detractors) / validResponses.length) * 100);

  return {
    metric_name: 'nps_score',
    value: nps,
    notes: `${promoters} promoters, ${detractors} detractors, ${validResponses.length - promoters - detractors} passive out of ${validResponses.length} responses`,
  };
}

/**
 * 7. Program Completion Rate (%)
 * Based on program_participants status.
 */
export async function computeProgramCompletionRate(cohortId: string): Promise<ComputedMetric> {
  const participants = await getAllCohortParticipants(cohortId);

  if (participants.length === 0) {
    return { metric_name: 'program_completion_rate', value: null, notes: 'No participants found' };
  }

  const completed = participants.filter(p => p.status === 'completed').length;
  const rate = Math.round((completed / participants.length) * 1000) / 10;

  return {
    metric_name: 'program_completion_rate',
    value: rate,
    notes: `${completed} completed / ${participants.length} total participants`,
  };
}

/**
 * 8. Goal Achievement Rate (%)
 * Based on end survey mentee_skill_clarity scores >= 4.
 */
export async function computeGoalAchievementRate(cohortId: string): Promise<ComputedMetric> {
  const surveyResponses = await getEndSurveyResponses(cohortId);
  const menteeResponses = surveyResponses.filter(r => r.respondent_type === 'mentee' || r.respondent_type === 'both');

  const skillScores = menteeResponses
    .map(r => r.mentee_skill_clarity)
    .filter((v): v is number => v != null);

  if (skillScores.length === 0) {
    return { metric_name: 'goal_achievement_rate', value: null, notes: 'No end survey responses with skill clarity scores' };
  }

  const achieved = skillScores.filter(v => v >= 4).length;
  const rate = Math.round((achieved / skillScores.length) * 1000) / 10;

  return {
    metric_name: 'goal_achievement_rate',
    value: rate,
    notes: `${achieved} / ${skillScores.length} mentees rated skill clarity >= 4`,
  };
}

/**
 * 9. Mentor Retention Rate (%)
 * Cross-cohort: mentors in current cohort who were also in a previous cohort.
 */
export async function computeMentorRetentionRate(cohortId: string): Promise<ComputedMetric> {
  // Get current cohort details
  const { data: currentCohort, error: cohortError } = await supabase
    .from('program_cohorts')
    .select('program_id, start_date')
    .eq('id', cohortId)
    .single();

  if (cohortError || !currentCohort?.start_date) {
    return { metric_name: 'mentor_retention_rate', value: null, notes: 'Could not find cohort details' };
  }

  // Find the immediately preceding cohort in the same program
  const { data: prevCohort, error: prevError } = await supabase
    .from('program_cohorts')
    .select('id')
    .eq('program_id', currentCohort.program_id)
    .lt('start_date', currentCohort.start_date)
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (prevError || !prevCohort) {
    return { metric_name: 'mentor_retention_rate', value: null, notes: 'No previous cohort found for comparison' };
  }

  // Get mentors in both cohorts
  const prevMentors = await getAllCohortParticipants(prevCohort.id, 'mentor');
  const currentMentors = await getAllCohortParticipants(cohortId, 'mentor');

  if (prevMentors.length === 0) {
    return { metric_name: 'mentor_retention_rate', value: null, notes: 'No mentors in previous cohort' };
  }

  const prevMentorIds = new Set(prevMentors.map(m => m.user_id));
  const returning = currentMentors.filter(m => prevMentorIds.has(m.user_id)).length;
  const rate = Math.round((returning / prevMentors.length) * 1000) / 10;

  return {
    metric_name: 'mentor_retention_rate',
    value: rate,
    notes: `${returning} returning / ${prevMentors.length} previous mentors`,
  };
}

/**
 * 10. Early Dropout Rate (%)
 * Participants who dropped within 30 days of joining.
 * Uses updated_at as drop date since completed_at isn't set on drop.
 */
export async function computeEarlyDropoutRate(cohortId: string): Promise<ComputedMetric> {
  const participants = await getAllCohortParticipants(cohortId);

  if (participants.length === 0) {
    return { metric_name: 'early_dropout_rate', value: null, notes: 'No participants found' };
  }

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const earlyDropouts = participants.filter(p => {
    if (p.status !== 'dropped') return false;
    const joinDate = new Date(p.joined_at).getTime();
    const dropDate = new Date(p.completed_at || p.updated_at).getTime();
    return (dropDate - joinDate) < THIRTY_DAYS_MS;
  });

  const rate = Math.round((earlyDropouts.length / participants.length) * 1000) / 10;

  return {
    metric_name: 'early_dropout_rate',
    value: rate,
    notes: `${earlyDropouts.length} early dropouts / ${participants.length} total participants`,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Weighted blend of two rating sources.
 * Returns null if both sources are null.
 */
function blendRatings(
  rating1: number | null,
  count1: number,
  rating2: number | null,
  count2: number
): number | null {
  if (rating1 !== null && rating2 !== null) {
    const totalWeight = count1 + count2;
    if (totalWeight === 0) return null;
    return (rating1 * count1 + rating2 * count2) / totalWeight;
  }
  if (rating1 !== null) return rating1;
  if (rating2 !== null) return rating2;
  return null;
}

// ============================================================================
// ORCHESTRATORS
// ============================================================================

const ALL_METRIC_COMPUTERS = [
  computeSessionCompletionRate,
  computeAverageSessionsPerPair,
  computeCheckInResponseRate,
  computeMenteeSatisfactionScore,
  computeMentorSatisfactionScore,
  computeNpsScore,
  computeProgramCompletionRate,
  computeGoalAchievementRate,
  computeMentorRetentionRate,
  computeEarlyDropoutRate,
];

/**
 * Compute all 10 metrics for a cohort. Each metric catches its own errors.
 */
export async function computeAllMetrics(cohortId: string): Promise<ComputedMetric[]> {
  const results = await Promise.allSettled(
    ALL_METRIC_COMPUTERS.map(fn => fn(cohortId))
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    console.error(`Metric computation failed for ${ALL_METRIC_COMPUTERS[i].name}:`, result.reason);
    return {
      metric_name: ALL_METRIC_COMPUTERS[i].name.replace('compute', '').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
      value: null,
      notes: `Error: ${result.reason?.message || 'Unknown error'}`,
    };
  });
}

/**
 * Compute all metrics and store non-null results as snapshots.
 */
export async function computeAndStoreMetrics(cohortId: string): Promise<ComputeResult> {
  const metrics = await computeAllMetrics(cohortId);
  const today = new Date().toISOString().split('T')[0];

  let stored = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const metric of metrics) {
    if (metric.value === null) {
      skipped++;
      continue;
    }

    try {
      const input: CreateMetricSnapshotInput = {
        cohort_id: cohortId,
        metric_name: metric.metric_name,
        actual_value: metric.value,
        snapshot_date: today,
        notes: metric.notes,
      };
      await upsertMetricSnapshot(input);
      stored++;
    } catch (err: any) {
      errors.push(`${metric.metric_name}: ${err.message || 'Unknown error'}`);
    }
  }

  return { stored, skipped, errors };
}
