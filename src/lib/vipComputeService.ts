import { supabase } from './supabase';
import { getSessionsByCohort, type SessionRow } from './sessionService';
import { upsertVIPScore } from './vipService';
import type { PersonType } from '@/types/vip';

// ============================================================================
// TYPES
// ============================================================================

interface PersonInfo {
  person_id: string;
  person_type: PersonType;
  slack_user_id?: string;
}

interface ComputedVIPScores {
  person_id: string;
  person_type: PersonType;
  engagement_score: number;
  session_score: number;
  response_score: number;
  feedback_score: number;
}

export interface VIPComputeResult {
  computed: number;
  errors: string[];
}

// Target sessions per pair (same as metricsComputeService)
const TARGET_SESSIONS_PER_PAIR = 4;

// ============================================================================
// PERSON DISCOVERY
// ============================================================================

/**
 * Get all mentors and mentees in a cohort from the mentors/mentees tables.
 */
async function getPersonsInCohort(cohortId: string): Promise<PersonInfo[]> {
  const [mentorsResult, menteesResult] = await Promise.all([
    supabase.from('mentors').select('mentor_id, slack_user_id').eq('cohort_id', cohortId),
    supabase.from('mentees').select('mentee_id, slack_user_id').eq('cohort_id', cohortId),
  ]);

  const persons: PersonInfo[] = [];

  for (const m of mentorsResult.data || []) {
    persons.push({
      person_id: m.mentor_id,
      person_type: 'mentor',
      slack_user_id: m.slack_user_id ?? undefined,
    });
  }

  for (const m of menteesResult.data || []) {
    persons.push({
      person_id: m.mentee_id,
      person_type: 'mentee',
      slack_user_id: m.slack_user_id ?? undefined,
    });
  }

  return persons;
}

// ============================================================================
// COMPONENT SCORE CALCULATIONS (each 0-25)
// ============================================================================

/**
 * Engagement Score (max 25)
 * - Check-in completion rate for this person's pairs: up to 15 points
 * - End survey participation: 5 points if submitted
 * - Gave written feedback on sessions: up to 5 points
 */
async function computeEngagementScore(
  personId: string,
  personType: PersonType,
  cohortId: string,
  sessions: SessionRow[],
  hasEndSurvey: boolean
): Promise<number> {
  // Check-in completion rate (up to 15 points)
  const personField = personType === 'mentor' ? 'mentor_id' : 'mentee_id';
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id, status')
    .eq('cohort_id', cohortId)
    .eq(personField, personId);

  let checkInScore = 0;
  if (checkIns && checkIns.length > 0) {
    const completed = checkIns.filter(c => c.status === 'completed').length;
    checkInScore = (completed / checkIns.length) * 15;
  } else {
    // No check-ins exist for this person — neutral, give partial credit
    checkInScore = 7.5;
  }

  // End survey participation (5 points)
  const surveyScore = hasEndSurvey ? 5 : 0;

  // Gave written session feedback (up to 5 points)
  const personSessions = getPersonSessions(personId, personType, sessions);
  const completedSessions = personSessions.filter(s => s.status === 'completed');
  let feedbackWriteScore = 0;
  if (completedSessions.length > 0) {
    const feedbackField = personType === 'mentor' ? 'mentor_feedback' : 'mentee_feedback';
    const withFeedback = completedSessions.filter(s => s[feedbackField] && s[feedbackField]!.trim().length > 0).length;
    feedbackWriteScore = (withFeedback / completedSessions.length) * 5;
  }

  return Math.min(25, Math.round((checkInScore + surveyScore + feedbackWriteScore) * 10) / 10);
}

/**
 * Session Score (max 25)
 * - Session completion rate vs target (4 per pair): up to 15 points
 * - Gave numeric ratings on completed sessions: up to 10 points
 */
function computeSessionScore(
  personId: string,
  personType: PersonType,
  sessions: SessionRow[]
): number {
  const personSessions = getPersonSessions(personId, personType, sessions);

  if (personSessions.length === 0) {
    return 0;
  }

  // Count unique pairs this person is in
  const pairPartners = new Set(
    personSessions.map(s => personType === 'mentor' ? s.mentee_id : s.mentor_id)
  );
  const expectedSessions = pairPartners.size * TARGET_SESSIONS_PER_PAIR;

  // Completion rate (up to 15 points)
  const completed = personSessions.filter(s => s.status === 'completed').length;
  const completionRate = Math.min(1, completed / expectedSessions);
  const completionScore = completionRate * 15;

  // Gave ratings on completed sessions (up to 10 points)
  const ratingField = personType === 'mentor' ? 'mentor_rating' : 'mentee_rating';
  const completedSessions = personSessions.filter(s => s.status === 'completed');
  let ratingScore = 0;
  if (completedSessions.length > 0) {
    const withRating = completedSessions.filter(s => s[ratingField] != null).length;
    ratingScore = (withRating / completedSessions.length) * 10;
  }

  return Math.min(25, Math.round((completionScore + ratingScore) * 10) / 10);
}

/**
 * Response Score (max 25)
 * - Inverse no-show rate: up to 15 points
 * - Inverse cancellation rate: up to 10 points
 * A person who shows up to all sessions and never cancels gets 25.
 */
function computeResponseScore(
  personId: string,
  personType: PersonType,
  sessions: SessionRow[]
): number {
  const personSessions = getPersonSessions(personId, personType, sessions);

  if (personSessions.length === 0) {
    return 0;
  }

  // Only look at sessions whose date has passed
  const now = new Date();
  const pastSessions = personSessions.filter(s => new Date(s.scheduled_datetime) <= now);

  if (pastSessions.length === 0) {
    return 12.5; // All sessions are in the future — neutral
  }

  // No-show rate (inverse, up to 15 points)
  const noShows = pastSessions.filter(s => s.status === 'no_show').length;
  const noShowRate = noShows / pastSessions.length;
  const noShowScore = (1 - noShowRate) * 15;

  // Cancellation rate (inverse, up to 10 points)
  const cancelled = pastSessions.filter(s => s.status === 'cancelled').length;
  const cancelRate = cancelled / pastSessions.length;
  const cancelScore = (1 - cancelRate) * 10;

  return Math.min(25, Math.round((noShowScore + cancelScore) * 10) / 10);
}

/**
 * Feedback Score (max 25)
 * - Average rating RECEIVED from their partner in sessions (1-5 → 0-15): up to 15 points
 * - End survey satisfaction scores (1-5 → 0-10): up to 10 points
 */
function computeFeedbackScore(
  personId: string,
  personType: PersonType,
  sessions: SessionRow[],
  endSurveyAvgScore: number | null
): number {
  const personSessions = getPersonSessions(personId, personType, sessions);
  const completedSessions = personSessions.filter(s => s.status === 'completed');

  // Rating RECEIVED from partner (up to 15 points)
  // If person is mentor, look at mentee_rating (the mentee rates the mentor)
  // If person is mentee, look at mentor_rating (the mentor rates the mentee)
  const receivedRatingField = personType === 'mentor' ? 'mentee_rating' : 'mentor_rating';
  const receivedRatings = completedSessions
    .map(s => s[receivedRatingField])
    .filter((r): r is number => r != null);

  let ratingReceivedScore = 0;
  if (receivedRatings.length > 0) {
    const avgRating = receivedRatings.reduce((a, b) => a + b, 0) / receivedRatings.length;
    // Map 1-5 scale to 0-15 points: (rating - 1) / 4 * 15
    ratingReceivedScore = ((avgRating - 1) / 4) * 15;
  }

  // End survey satisfaction scores (up to 10 points)
  let surveyScore = 0;
  if (endSurveyAvgScore !== null) {
    // Map 1-5 scale to 0-10 points: (score - 1) / 4 * 10
    surveyScore = ((endSurveyAvgScore - 1) / 4) * 10;
  }

  return Math.min(25, Math.round((ratingReceivedScore + surveyScore) * 10) / 10);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get sessions where this person is the mentor or mentee.
 */
function getPersonSessions(
  personId: string,
  personType: PersonType,
  sessions: SessionRow[]
): SessionRow[] {
  return sessions.filter(s =>
    personType === 'mentor' ? s.mentor_id === personId : s.mentee_id === personId
  );
}

/**
 * Get end survey average satisfaction score for a person.
 * Returns null if no survey found.
 */
function getEndSurveyAvgScore(
  personType: PersonType,
  surveyResponse: any | undefined
): number | null {
  if (!surveyResponse) return null;

  let scores: number[];
  if (personType === 'mentor') {
    scores = [
      surveyResponse.mentor_support_growth,
      surveyResponse.mentor_saw_impact,
      surveyResponse.mentor_time_worthwhile,
      surveyResponse.overall_worth,
    ].filter((v): v is number => v != null);
  } else {
    scores = [
      surveyResponse.mentee_skill_clarity,
      surveyResponse.mentee_focus_clarity,
      surveyResponse.mentee_perspective_challenged,
      surveyResponse.overall_worth,
    ].filter((v): v is number => v != null);
  }

  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

/**
 * Compute VIP scores for all persons in a cohort and upsert them.
 */
export async function computeAndStoreVIPScores(cohortId: string): Promise<VIPComputeResult> {
  const errors: string[] = [];

  // Fetch all shared data in parallel
  const [persons, sessions, endSurveyResult] = await Promise.all([
    getPersonsInCohort(cohortId),
    getSessionsByCohort(cohortId),
    supabase.from('end_survey_responses').select('*').eq('cohort_id', cohortId),
  ]);

  const endSurveyResponses = endSurveyResult.data || [];

  // Build a map of slack_user_id → survey response for matching
  const surveyBySlackId = new Map<string, any>();
  for (const r of endSurveyResponses) {
    if (r.slack_user_id) {
      surveyBySlackId.set(r.slack_user_id, r);
    }
  }

  let computed = 0;

  for (const person of persons) {
    try {
      // Match person to their end survey response via slack_user_id
      const surveyResponse = person.slack_user_id
        ? surveyBySlackId.get(person.slack_user_id)
        : undefined;
      const hasEndSurvey = surveyResponse != null;
      const endSurveyAvg = getEndSurveyAvgScore(person.person_type, surveyResponse);

      // Compute all 4 component scores
      const engagement = await computeEngagementScore(
        person.person_id, person.person_type, cohortId, sessions, hasEndSurvey
      );
      const session = computeSessionScore(person.person_id, person.person_type, sessions);
      const response = computeResponseScore(person.person_id, person.person_type, sessions);
      const feedback = computeFeedbackScore(person.person_id, person.person_type, sessions, endSurveyAvg);

      await upsertVIPScore({
        person_id: person.person_id,
        person_type: person.person_type,
        cohort_id: cohortId,
        engagement_score: engagement,
        session_score: session,
        response_score: response,
        feedback_score: feedback,
      });

      computed++;
    } catch (err: any) {
      errors.push(`${person.person_id}: ${err.message || 'Unknown error'}`);
    }
  }

  return { computed, errors };
}
