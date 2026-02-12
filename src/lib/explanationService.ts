import { supabase } from './supabase';
import { MenteeData, MentorData, MatchScore } from '@/types/mentoring';

/**
 * Get or generate an AI explanation for a mentor-mentee match.
 * Checks the match_explanations table for a cached result first,
 * then calls the generate-explanation Edge Function if missing.
 */
export async function getOrGenerateExplanation(
  cohortId: string,
  mentee: MenteeData,
  mentor: MentorData,
  score: MatchScore,
): Promise<string> {
  // 1. Check cache
  const { data: cached } = await supabase
    .from('match_explanations')
    .select('explanation')
    .eq('cohort_id', cohortId)
    .eq('mentee_id', mentee.id)
    .eq('mentor_id', mentor.id)
    .single();

  if (cached?.explanation) {
    return cached.explanation;
  }

  // 2. Build profile summaries for the LLM
  const menteeProfile = {
    id: mentee.id,
    role: mentee.role,
    seniority_band: mentee.seniority_band,
    primary_capability: mentee.primary_capability,
    secondary_capability: mentee.secondary_capability,
    mentoring_goal: mentee.mentoring_goal,
    bio: mentee.bio,
    practice_scenarios: mentee.practice_scenarios,
    timezone: mentee.location_timezone,
    // Legacy fields for old cohorts
    goals_text: mentee.goals_text,
    topics: mentee.topics_to_learn,
  };

  const mentorProfile = {
    id: mentor.id,
    role: mentor.role,
    seniority_band: mentor.seniority_band,
    primary_capability: mentor.primary_capability,
    secondary_capabilities: mentor.secondary_capabilities,
    mentor_motivation: mentor.mentor_motivation,
    hard_earned_lesson: mentor.hard_earned_lesson,
    bio: mentor.bio,
    practice_scenarios: mentor.practice_scenarios,
    natural_strengths: mentor.natural_strengths,
    timezone: mentor.location_timezone,
    // Legacy fields for old cohorts
    bio_text: mentor.bio_text,
    topics: mentor.topics_to_mentor,
  };

  const scoreBreakdown = [
    { criterion: 'capability', criterion_name: 'Capability Match', raw_score: score.features.capability_match, weight: 45, weighted_score: score.features.capability_match * 45 },
    { criterion: 'semantic', criterion_name: 'Goals Alignment', raw_score: score.features.semantic_similarity, weight: 30, weighted_score: score.features.semantic_similarity * 30 },
    { criterion: 'domain', criterion_name: 'Domain Detail Match', raw_score: score.features.domain_match, weight: 5, weighted_score: score.features.domain_match * 5 },
    { criterion: 'seniority', criterion_name: 'Seniority Fit', raw_score: score.features.role_seniority_fit, weight: 10, weighted_score: score.features.role_seniority_fit * 10 },
    { criterion: 'timezone', criterion_name: 'Timezone Compatibility', raw_score: score.features.tz_overlap_bonus, weight: 5, weighted_score: score.features.tz_overlap_bonus * 5 },
  ];

  // 3. Call Edge Function
  const { data, error } = await supabase.functions.invoke('generate-explanation', {
    body: {
      mentee: menteeProfile,
      mentor: mentorProfile,
      score_breakdown: scoreBreakdown,
      total_score: score.total_score,
    },
  });

  if (error) {
    throw new Error(`Failed to generate explanation: ${error.message}`);
  }

  if (!data?.explanation) {
    throw new Error('No explanation returned from generate-explanation function');
  }

  // 4. Cache the result
  await supabase.from('match_explanations').upsert(
    {
      cohort_id: cohortId,
      mentee_id: mentee.id,
      mentor_id: mentor.id,
      explanation: data.explanation,
      model_used: 'gpt-4o-mini',
      total_score: score.total_score,
    },
    { onConflict: 'cohort_id,mentee_id,mentor_id' },
  );

  return data.explanation;
}

/**
 * Batch-generate explanations for multiple matches.
 * Processes up to CONCURRENCY matches in parallel for speed.
 */
const CONCURRENCY = 3;

export async function generateAllExplanations(
  cohortId: string,
  matches: { mentee: MenteeData; mentor: MentorData; score: MatchScore }[],
  onProgress?: (completed: number, total: number) => void,
  onResult?: (key: string, explanation: string) => void,
): Promise<Map<string, string>> {
  const explanations = new Map<string, string>();
  let completed = 0;

  for (let i = 0; i < matches.length; i += CONCURRENCY) {
    const batch = matches.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async ({ mentee, mentor, score }) => {
        const explanation = await getOrGenerateExplanation(cohortId, mentee, mentor, score);
        return { key: `${mentee.id}_${mentor.id}`, explanation };
      }),
    );

    for (const result of results) {
      completed++;
      if (result.status === 'fulfilled') {
        explanations.set(result.value.key, result.value.explanation);
        onResult?.(result.value.key, result.value.explanation);
      } else {
        console.warn('Failed to generate explanation:', result.reason);
      }
      onProgress?.(completed, matches.length);
    }
  }

  return explanations;
}
