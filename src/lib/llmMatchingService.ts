/**
 * LLM Pairwise Matching Service
 * Calls the `score-pairs` Supabase edge function which uses OpenAI GPT-4o-mini
 * server-side to score mentee-mentor compatibility.
 * The OpenAI API key never leaves the server.
 */

import { supabase } from './supabase';
import { MenteeData, MentorData } from '@/types/mentoring';

// ============================================================================
// Types
// ============================================================================

export interface LLMPairScore {
  mentee_id: string;
  mentor_id: string;
  /** Overall compatibility score 0-10 */
  overall_score: number;
  /** Capability alignment 0-10 */
  capability_alignment: number;
  /** Goal-experience fit 0-10 */
  goal_experience_fit: number;
  /** Complementary strengths 0-10 */
  complementary_strengths: number;
  /** Brief reasoning for the scores */
  reasoning: string;
}

export interface LLMScoringProgress {
  total: number;
  completed: number;
  status: 'idle' | 'scoring' | 'done' | 'error';
  error?: string;
}

// ============================================================================
// Profile text builders (for LLM prompt context)
// ============================================================================

function buildMenteeProfileText(mentee: MenteeData): string {
  const parts: string[] = [];

  if (mentee.name) parts.push(`Name: ${mentee.name}`);
  if (mentee.business_title || mentee.role) parts.push(`Role: ${mentee.business_title || mentee.role}`);
  if (mentee.org_level_04) parts.push(`Department: ${mentee.org_level_04}`);
  if (mentee.compensation_grade) parts.push(`Level: ${mentee.compensation_grade}`);

  // V3 fields (preferred)
  if (mentee.capabilities_wanted) parts.push(`Capabilities they want to develop: ${mentee.capabilities_wanted}`);
  if (mentee.role_specific_area) parts.push(`Job-specific area for mentoring: ${mentee.role_specific_area}`);
  if (mentee.mentoring_goal) parts.push(`Mentoring goal: ${mentee.mentoring_goal}`);
  if (mentee.specific_challenge) parts.push(`Specific challenge: ${mentee.specific_challenge}`);
  if (mentee.bio) parts.push(`About their role: ${mentee.bio}`);
  if (mentee.mentor_help_wanted?.length) parts.push(`Kind of mentor help wanted: ${mentee.mentor_help_wanted.join(', ')}`);
  if (mentee.preferred_style) parts.push(`Session style preference: ${mentee.preferred_style}`);

  // V2 fallbacks
  if (!mentee.capabilities_wanted && mentee.primary_capability) {
    parts.push(`Primary capability to build: ${mentee.primary_capability}`);
  }
  if (!mentee.capabilities_wanted && mentee.goals_text) {
    parts.push(`Goals: ${mentee.goals_text}`);
  }

  return parts.join('\n');
}

function buildMentorProfileText(mentor: MentorData): string {
  const parts: string[] = [];

  if (mentor.name) parts.push(`Name: ${mentor.name}`);
  if (mentor.business_title || mentor.role) parts.push(`Role: ${mentor.business_title || mentor.role}`);
  if (mentor.org_level_04) parts.push(`Department: ${mentor.org_level_04}`);
  if (mentor.compensation_grade) parts.push(`Level: ${mentor.compensation_grade}`);

  // V3 fields (preferred)
  if (mentor.capabilities_offered) parts.push(`Capabilities confident mentoring: ${mentor.capabilities_offered}`);
  if (mentor.role_specific_offering) parts.push(`Job/field-specific offering: ${mentor.role_specific_offering}`);
  if (mentor.meaningful_impact) parts.push(`Meaningful impact story: ${mentor.meaningful_impact}`);
  if (mentor.bio) parts.push(`About their role: ${mentor.bio}`);
  if (mentor.natural_strengths?.length) parts.push(`Natural strengths: ${mentor.natural_strengths.join(', ')}`);
  if (mentor.mentor_motivation) parts.push(`Motivation for mentoring: ${mentor.mentor_motivation}`);
  if (mentor.mentor_session_style || mentor.meeting_style) {
    parts.push(`Session style: ${mentor.mentor_session_style || mentor.meeting_style}`);
  }

  // V2 fallbacks
  if (!mentor.capabilities_offered && mentor.primary_capability) {
    parts.push(`Primary capability: ${mentor.primary_capability}`);
  }
  if (!mentor.capabilities_offered && mentor.hard_earned_lesson) {
    parts.push(`Hard-earned lesson: ${mentor.hard_earned_lesson}`);
  }

  return parts.join('\n');
}

// ============================================================================
// Edge function call
// ============================================================================

interface EdgeFunctionPairInput {
  mentee_id: string;
  mentor_id: string;
  mentee_profile: string;
  mentor_profile: string;
}

/**
 * Send a batch of pairs to the score-pairs edge function.
 * Returns scores for pairs that were successfully scored.
 */
async function callScorePairsEdgeFunction(
  pairs: EdgeFunctionPairInput[],
): Promise<LLMPairScore[]> {
  const { data, error } = await supabase.functions.invoke('score-pairs', {
    body: { pairs },
  });

  if (error) {
    console.error('score-pairs edge function error:', error);
    throw new Error(`Edge function error: ${error.message}`);
  }

  return data?.scores || [];
}

// ============================================================================
// Batch scoring
// ============================================================================

/**
 * Score all valid mentee-mentor pairs using the score-pairs edge function.
 * Pre-filtered pairs (those that pass hard filters) are scored.
 * Sends batches of `batchSize` to the edge function for server-side parallel scoring.
 *
 * @param pairs - Array of [mentee, mentor] tuples to score
 * @param onProgress - Optional progress callback
 * @param batchSize - Number of pairs per edge function call (default 20)
 * @returns Map of "menteeId::mentorId" → LLMPairScore
 */
export async function scorePairsWithLLM(
  pairs: [MenteeData, MentorData][],
  onProgress?: (progress: LLMScoringProgress) => void,
  batchSize: number = 20,
): Promise<Map<string, LLMPairScore>> {
  const results = new Map<string, LLMPairScore>();
  const total = pairs.length;
  let completed = 0;

  onProgress?.({ total, completed, status: 'scoring' });

  // Build profile texts and send in batches
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);

    const pairInputs: EdgeFunctionPairInput[] = batch.map(([mentee, mentor]) => ({
      mentee_id: mentee.id,
      mentor_id: mentor.id,
      mentee_profile: buildMenteeProfileText(mentee),
      mentor_profile: buildMentorProfileText(mentor),
    }));

    try {
      const scores = await callScorePairsEdgeFunction(pairInputs);

      for (const score of scores) {
        const key = `${score.mentee_id}::${score.mentor_id}`;
        results.set(key, score);
      }

      completed += batch.length;
      onProgress?.({ total, completed, status: 'scoring' });
    } catch (err) {
      console.error(`Batch ${i}-${i + batch.length} failed:`, err);
      completed += batch.length;
      onProgress?.({ total, completed, status: 'scoring' });
    }
  }

  onProgress?.({ total, completed: total, status: 'done' });
  return results;
}
