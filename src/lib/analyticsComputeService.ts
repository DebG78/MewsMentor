import type { Cohort } from '@/types/mentoring';
import type { SessionRow } from './sessionService';

// ============================================================================
// COMPUTED METRICS
// ============================================================================

export interface PairHealthScore {
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  sessionScore: number;    // 0-100, from session frequency/completion
  recencyScore: number;    // 0-100, how recent the last session is
  totalScore: number;      // 0-100, weighted composite
  status: 'healthy' | 'at_risk' | 'critical';
}

export interface MentorLoadBalance {
  cohort_id: string;
  cohort_name: string;
  avgMenteesPerMentor: number;
  stdDev: number;
  minLoad: number;
  maxLoad: number;
  balance: 'balanced' | 'moderate' | 'unbalanced';
}

export interface TopicCoverageRate {
  cohort_id: string;
  cohort_name: string;
  totalTopics: number;
  coveredTopics: number;
  coverageRate: number;
}

export interface PairSurvivalRate {
  cohort_id: string;
  cohort_name: string;
  totalPairs: number;
  survivingPairs: number;
  survivalRate: number;
}

// ============================================================================
// PAIR HEALTH SCORE
// ============================================================================

export function computePairHealthScores(
  sessions: SessionRow[],
  cohortId: string
): PairHealthScore[] {
  const pairKeys = new Set<string>();
  for (const s of sessions) {
    if (s.cohort_id === cohortId) {
      pairKeys.add(`${s.mentor_id}:${s.mentee_id}`);
    }
  }

  const results: PairHealthScore[] = [];
  const now = Date.now();

  for (const key of pairKeys) {
    const [mentor_id, mentee_id] = key.split(':');

    // Session score (50% weight)
    const pairSessions = sessions.filter(
      s => s.cohort_id === cohortId && s.mentor_id === mentor_id && s.mentee_id === mentee_id
    );
    const completedSessions = pairSessions.filter(s => s.status === 'completed').length;
    const sessionScore = pairSessions.length > 0
      ? Math.min(100, (completedSessions / Math.max(pairSessions.length, 1)) * 100)
      : 0;

    // Recency score (50% weight) - how recent is the last session
    const sessionDates = pairSessions.map(s => new Date(s.scheduled_datetime).getTime());
    let recencyScore = 0;
    if (sessionDates.length > 0) {
      const mostRecent = Math.max(...sessionDates);
      const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);
      recencyScore = daysSince <= 7 ? 100
        : daysSince <= 14 ? 80
        : daysSince <= 30 ? 60
        : daysSince <= 60 ? 30
        : 10;
    }

    const totalScore = Math.round(sessionScore * 0.5 + recencyScore * 0.5);
    const status = totalScore >= 70 ? 'healthy' : totalScore >= 40 ? 'at_risk' : 'critical';

    results.push({
      mentor_id,
      mentee_id,
      cohort_id: cohortId,
      sessionScore,
      recencyScore,
      totalScore,
      status,
    });
  }

  return results.sort((a, b) => a.totalScore - b.totalScore);
}

// ============================================================================
// MENTOR LOAD BALANCE
// ============================================================================

export function computeMentorLoadBalance(cohorts: Cohort[]): MentorLoadBalance[] {
  return cohorts
    .filter(c => c.matches?.results && c.matches.results.length > 0)
    .map(cohort => {
      const mentorLoads = new Map<string, number>();

      for (const result of cohort.matches!.results) {
        if (result.proposed_assignment?.mentor_id) {
          const mid = result.proposed_assignment.mentor_id;
          mentorLoads.set(mid, (mentorLoads.get(mid) || 0) + 1);
        }
      }

      const loads = Array.from(mentorLoads.values());
      if (loads.length === 0) {
        return null;
      }

      const avg = loads.reduce((s, l) => s + l, 0) / loads.length;
      const variance = loads.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / loads.length;
      const stdDev = Math.sqrt(variance);

      return {
        cohort_id: cohort.id,
        cohort_name: cohort.name,
        avgMenteesPerMentor: Math.round(avg * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        minLoad: Math.min(...loads),
        maxLoad: Math.max(...loads),
        balance: stdDev < 0.5 ? 'balanced' as const
          : stdDev < 1.5 ? 'moderate' as const
          : 'unbalanced' as const,
      };
    })
    .filter((r): r is MentorLoadBalance => r !== null);
}

// ============================================================================
// TOPIC COVERAGE RATE
// ============================================================================

export function computeTopicCoverage(cohorts: Cohort[]): TopicCoverageRate[] {
  return cohorts
    .filter(c => c.matches?.results && c.matches.results.length > 0)
    .map(cohort => {
      let totalTopics = 0;
      let coveredTopics = 0;

      for (const result of cohort.matches!.results) {
        const mentee = cohort.mentees.find(m => m.id === result.mentee_id);
        if (!mentee) continue;

        const menteeTopics = mentee.topics_to_learn || [];
        totalTopics += menteeTopics.length;

        if (result.proposed_assignment?.mentor_id) {
          const mentor = cohort.mentors.find(m => m.id === result.proposed_assignment!.mentor_id);
          if (mentor) {
            const mentorTopics = new Set(mentor.topics_to_mentor || []);
            const covered = menteeTopics.filter(t => mentorTopics.has(t)).length;
            coveredTopics += covered;
          }
        }
      }

      return {
        cohort_id: cohort.id,
        cohort_name: cohort.name,
        totalTopics,
        coveredTopics,
        coverageRate: totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0,
      };
    });
}

// ============================================================================
// PAIR SURVIVAL RATE
// ============================================================================

export function computePairSurvivalRate(
  cohorts: Cohort[]
): PairSurvivalRate[] {
  return cohorts
    .filter(c => c.matches?.results && c.matches.results.length > 0)
    .map(cohort => {
      const totalPairs = cohort.matches!.results.filter(
        r => r.proposed_assignment?.mentor_id
      ).length;

      return {
        cohort_id: cohort.id,
        cohort_name: cohort.name,
        totalPairs,
        survivingPairs: totalPairs,
        survivalRate: 100,
      };
    });
}
