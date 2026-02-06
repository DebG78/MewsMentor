import {
  MenteeData,
  MentorData,
  MatchingFilters,
  MatchingFeatures,
  MatchScore,
  MatchingResult,
  MatchingOutput,
  MatchingStats,
  SENIORITY_SCORES
} from "@/types/mentoring";
import type {
  MatchingModel,
  MatchingWeights,
  EnhancedMatchScore,
  ScoreBreakdown,
  AlternativeMentor,
  ConstraintViolation,
  MatchingRule,
} from "@/types/matching";
import { cosineSimilarity } from "./embeddingUtils";
import { getOrComputeEmbeddings, type EmbeddingCache } from "./embeddingService";

// Hard filters implementation
export function applyHardFilters(
  mentee: MenteeData,
  mentor: MentorData,
  filters: MatchingFilters = {
    min_language_overlap: 1,
    max_timezone_difference: 3,
    require_available_capacity: true
  }
): boolean {
  // Language overlap filter (≥1 shared language)
  if (mentee.languages && mentor.languages && mentee.languages.length > 0 && mentor.languages.length > 0) {
    const sharedLanguages = mentee.languages.filter(lang =>
      mentor.languages!.includes(lang)
    );
    if (sharedLanguages.length < filters.min_language_overlap) {
      return false;
    }
  }

  // Timezone difference filter (≤3 hours)
  if (mentee.location_timezone && mentor.location_timezone) {
    const timezoneDistance = calculateTimezoneDistance(
      mentee.location_timezone,
      mentor.location_timezone
    );
    if (timezoneDistance > filters.max_timezone_difference) {
      return false;
    }
  }

  // Mentor capacity filter (>0)
  if (filters.require_available_capacity && mentor.capacity_remaining <= 0) {
    return false;
  }

  return true;
}

// Calculate timezone distance in hours
function calculateTimezoneDistance(tz1: string, tz2: string): number {
  // Simplified timezone mapping - in production would use proper timezone library
  const timezoneMap: Record<string, number> = {
    'Central Europe (CET)': 1,
    'UK / Ireland (GMT)': 0,
    'US – Pacific Time (PST)': -8,
    'US – Central Time (CST)': -6,
    'Australia (AEST)': 10,
    'US – Eastern Time (EST)': -5
  };

  const offset1 = timezoneMap[tz1] || 0;
  const offset2 = timezoneMap[tz2] || 0;

  return Math.abs(offset1 - offset2);
}

// Feature score calculations
export function calculateFeatures(mentee: MenteeData, mentor: MentorData): MatchingFeatures {
  return {
    topics_overlap: calculateTopicsOverlap(mentee.topics_to_learn, mentor.topics_to_mentor),
    industry_overlap: calculateIndustryOverlap(mentee, mentor),
    role_seniority_fit: calculateRoleSeniorityFit(mentee, mentor),
    semantic_similarity: calculateSemanticSimilarity(mentee, mentor),
    tz_overlap_bonus: calculateTimezoneBonus(mentee.location_timezone, mentor.location_timezone),
    language_bonus: calculateLanguageBonus(mentee, mentor),
    capacity_penalty: calculateCapacityPenalty(mentor.capacity_remaining)
  };
}

// Topics overlap using Jaccard similarity
function calculateTopicsOverlap(menteeTopics: string[], mentorTopics: string[]): number {
  if (menteeTopics.length === 0 || mentorTopics.length === 0) return 0;

  const intersection = menteeTopics.filter(topic => mentorTopics.includes(topic));
  const union = [...new Set([...menteeTopics, ...mentorTopics])];

  return intersection.length / union.length;
}

// Industry overlap (binary match)
function calculateIndustryOverlap(mentee: MenteeData, mentor: MentorData): number {
  // For now, assume same company = same industry
  // In production, would extract industry from role or have dedicated field
  return 1; // All Mews employees = same industry
}

// Role seniority fit calculation
function calculateRoleSeniorityFit(mentee: MenteeData, mentor: MentorData): number {
  const menteeSeniority = SENIORITY_SCORES[mentee.seniority_band as keyof typeof SENIORITY_SCORES] || 2;
  const mentorSeniority = SENIORITY_SCORES[mentor.seniority_band as keyof typeof SENIORITY_SCORES] || 3;

  if (mentorSeniority >= menteeSeniority) {
    const distance = Math.min((mentorSeniority - menteeSeniority) / 6, 1);
    return 1 - distance;
  } else {
    return 0.5; // Mentor less senior than mentee
  }
}

// Semantic similarity between goals and bio
function calculateSemanticSimilarity(mentee: MenteeData, mentor: MentorData): number {
  const menteeText = (mentee.goals_text || '').toLowerCase();
  const mentorText = ((mentor.bio_text || '') + ' ' + mentor.topics_to_mentor.join(' ')).toLowerCase();

  if (!menteeText || !mentorText) return 0;

  // Simple keyword-based similarity
  const menteeWords = menteeText.split(/\s+/).filter(word => word.length > 3);
  const mentorWords = mentorText.split(/\s+/).filter(word => word.length > 3);

  if (menteeWords.length === 0 || mentorWords.length === 0) return 0;

  const commonWords = menteeWords.filter(word => mentorWords.includes(word));
  const totalWords = new Set([...menteeWords, ...mentorWords]).size;

  return commonWords.length / Math.max(totalWords, 1);
}

// Timezone overlap bonus
function calculateTimezoneBonus(menteeTimezone: string, mentorTimezone: string): number {
  if (!menteeTimezone || !mentorTimezone) return 0;

  const distance = calculateTimezoneDistance(menteeTimezone, mentorTimezone);
  return distance <= 2 ? 1 : 0;
}

// Language bonus calculation
function calculateLanguageBonus(mentee: MenteeData, mentor: MentorData): number {
  if (!mentee.languages || !mentor.languages || mentee.languages.length === 0) return 0;

  const menteePrimaryLanguage = mentee.languages[0];
  return mentor.languages.includes(menteePrimaryLanguage) ? 1 : 0;
}

// Capacity penalty calculation
function calculateCapacityPenalty(capacityRemaining: number): number {
  return capacityRemaining === 1 ? 1 : 0;
}

// Calculate final match score using your exact formula
export function calculateMatchScore(mentee: MenteeData, mentor: MentorData): MatchScore {
  const features = calculateFeatures(mentee, mentor);

  // Your exact scoring formula
  const totalScore = Math.max(0, Math.min(100,
    40 * features.topics_overlap +
    15 * features.industry_overlap +
    10 * features.role_seniority_fit +
    20 * features.semantic_similarity +
    5 * features.tz_overlap_bonus +
    5 * features.language_bonus -
    10 * features.capacity_penalty
  ));

  // Generate reasons for the match
  const reasons: string[] = [];
  if (features.topics_overlap > 0.3) {
    const sharedTopics = mentee.topics_to_learn.filter(topic =>
      mentor.topics_to_mentor.includes(topic)
    ).length;
    reasons.push(`${sharedTopics} shared development areas`);
  }
  if (features.role_seniority_fit > 0.7) {
    reasons.push("Appropriate seniority gap");
  }
  if (features.tz_overlap_bonus > 0) {
    reasons.push("Compatible timezone");
  }
  if (features.semantic_similarity > 0.2) {
    reasons.push("Aligned goals and expertise");
  }

  // Generate risks/concerns
  const risks: string[] = [];
  if (features.capacity_penalty > 0) {
    risks.push("Limited mentor capacity");
  }
  if (features.topics_overlap < 0.2) {
    risks.push("Limited topic overlap");
  }
  if (calculateTimezoneDistance(mentee.location_timezone, mentor.location_timezone) > 2) {
    risks.push("Timezone difference");
  }

  // Generate icebreaker suggestion
  const sharedTopics = mentee.topics_to_learn.filter(topic =>
    mentor.topics_to_mentor.includes(topic)
  );
  const icebreaker = sharedTopics.length > 0
    ? `Discuss shared interest in ${sharedTopics[0]}`
    : "Explore complementary experiences and goals";

  return {
    total_score: totalScore,
    features,
    reasons,
    risks,
    logistics: {
      timezone_mentee: mentee.location_timezone,
      timezone_mentor: mentor.location_timezone,
      languages_shared: mentee.languages && mentor.languages
        ? mentee.languages.filter(lang => mentor.languages!.includes(lang))
        : [],
      capacity_remaining: mentor.capacity_remaining
    },
    icebreaker
  };
}

// Tie-breaking logic as specified
export function compareMentorMatches(
  a: { mentor: MentorData; score: MatchScore },
  b: { mentor: MentorData; score: MatchScore }
): number {
  // Primary: total score (higher is better)
  if (a.score.total_score !== b.score.total_score) {
    return b.score.total_score - a.score.total_score;
  }

  // Tie-break 1: topics_overlap
  if (a.score.features.topics_overlap !== b.score.features.topics_overlap) {
    return b.score.features.topics_overlap - a.score.features.topics_overlap;
  }

  // Tie-break 2: semantic_similarity
  if (a.score.features.semantic_similarity !== b.score.features.semantic_similarity) {
    return b.score.features.semantic_similarity - a.score.features.semantic_similarity;
  }

  // Tie-break 3: higher capacity_remaining
  if (a.mentor.capacity_remaining !== b.mentor.capacity_remaining) {
    return b.mentor.capacity_remaining - a.mentor.capacity_remaining;
  }

  // Tie-break 4: mentor name A→Z
  const nameA = a.mentor.id || '';
  const nameB = b.mentor.id || '';
  return nameA.localeCompare(nameB);
}

// Main matching functions
export function findTopMatches(
  mentee: MenteeData,
  mentors: MentorData[],
  maxResults: number = 3
): { mentor_id: string; mentor_name?: string; score: MatchScore }[] {
  const validMatches = mentors
    .filter(mentor => applyHardFilters(mentee, mentor))
    .map(mentor => ({
      mentor,
      score: calculateMatchScore(mentee, mentor)
    }))
    .sort(compareMentorMatches)
    .slice(0, maxResults);

  return validMatches.map(match => ({
    mentor_id: match.mentor.id,
    mentor_name: match.mentor.id, // Using ID as name for now
    score: match.score
  }));
}

// Batch matching mode
export function performBatchMatching(
  mentees: MenteeData[],
  mentors: MentorData[]
): MatchingOutput {
  const results: MatchingResult[] = [];
  const stats: MatchingStats = {
    mentees_total: mentees.length,
    mentors_total: mentors.length,
    pairs_evaluated: 0,
    after_filters: 0
  };

  // Track mentor capacity during assignment
  const mentorCapacity = new Map<string, number>();
  mentors.forEach(mentor => {
    mentorCapacity.set(mentor.id, mentor.capacity_remaining);
  });

  mentees.forEach(mentee => {
    // Get available mentors (those with capacity)
    const availableMentors = mentors.filter(mentor =>
      (mentorCapacity.get(mentor.id) || 0) > 0
    );

    stats.pairs_evaluated += availableMentors.length;

    // Find top 3 recommendations
    const recommendations = findTopMatches(mentee, availableMentors, 3);

    stats.after_filters += recommendations.length;

    // Assign to best available mentor (greedy approach)
    let proposedAssignment: { mentor_id: string | null; mentor_name?: string | null } = {
      mentor_id: null,
      mentor_name: null
    };

    if (recommendations.length > 0) {
      const bestMatch = recommendations[0];
      proposedAssignment = {
        mentor_id: bestMatch.mentor_id,
        mentor_name: bestMatch.mentor_name
      };

      // Decrease mentor capacity
      const currentCapacity = mentorCapacity.get(bestMatch.mentor_id) || 0;
      mentorCapacity.set(bestMatch.mentor_id, currentCapacity - 1);
    }

    results.push({
      mentee_id: mentee.id,
      mentee_name: mentee.id, // Using ID as name for now
      recommendations,
      proposed_assignment: proposedAssignment
    });
  });

  return {
    mode: "batch",
    stats,
    results
  };
}

// Top 3 per mentee mode
export function performTop3Matching(
  mentees: MenteeData[],
  mentors: MentorData[]
): MatchingOutput {
  const results: MatchingResult[] = [];
  const stats: MatchingStats = {
    mentees_total: mentees.length,
    mentors_total: mentors.length,
    pairs_evaluated: mentees.length * mentors.length,
    after_filters: 0
  };

  mentees.forEach(mentee => {
    const recommendations = findTopMatches(mentee, mentors, 3);
    stats.after_filters += recommendations.length;

    results.push({
      mentee_id: mentee.id,
      mentee_name: mentee.id,
      recommendations
    });
  });

  return {
    mode: "top3_per_mentee",
    stats,
    results
  };
}

// ============================================================================
// ENHANCED MATCHING WITH CONFIGURABLE MODELS
// ============================================================================

/**
 * Calculate match score using a configurable matching model
 */
export function calculateMatchScoreWithModel(
  mentee: MenteeData,
  mentor: MentorData,
  model: MatchingModel
): EnhancedMatchScore {
  const features = calculateFeatures(mentee, mentor);
  const weights = model.weights;

  // Calculate individual weighted scores
  const scoreBreakdown: ScoreBreakdown[] = [
    {
      criterion: 'topics',
      criterion_name: 'Topics Match',
      raw_score: features.topics_overlap,
      max_possible: 1,
      weight: weights.topics,
      weighted_score: features.topics_overlap * weights.topics,
    },
    {
      criterion: 'semantic',
      criterion_name: 'Semantic Similarity',
      raw_score: features.semantic_similarity,
      max_possible: 1,
      weight: weights.semantic,
      weighted_score: features.semantic_similarity * weights.semantic,
    },
    {
      criterion: 'industry',
      criterion_name: 'Industry Match',
      raw_score: features.industry_overlap,
      max_possible: 1,
      weight: weights.industry,
      weighted_score: features.industry_overlap * weights.industry,
    },
    {
      criterion: 'seniority',
      criterion_name: 'Seniority Fit',
      raw_score: features.role_seniority_fit,
      max_possible: 1,
      weight: weights.seniority,
      weighted_score: features.role_seniority_fit * weights.seniority,
    },
    {
      criterion: 'timezone',
      criterion_name: 'Timezone Bonus',
      raw_score: features.tz_overlap_bonus,
      max_possible: 1,
      weight: weights.timezone,
      weighted_score: features.tz_overlap_bonus * weights.timezone,
    },
    {
      criterion: 'language',
      criterion_name: 'Language Bonus',
      raw_score: features.language_bonus,
      max_possible: 1,
      weight: weights.language,
      weighted_score: features.language_bonus * weights.language,
    },
  ];

  // Calculate total score
  const positiveScore = scoreBreakdown.reduce((sum, item) => sum + item.weighted_score, 0);
  const capacityPenalty = features.capacity_penalty * weights.capacity_penalty;
  const totalScore = Math.max(0, Math.min(100, positiveScore - capacityPenalty));

  // Add capacity penalty to breakdown
  scoreBreakdown.push({
    criterion: 'capacity_penalty',
    criterion_name: 'Capacity Penalty',
    raw_score: features.capacity_penalty,
    max_possible: 1,
    weight: -weights.capacity_penalty,
    weighted_score: -capacityPenalty,
  });

  // Check for constraint violations (placeholder for rule evaluation)
  const constraintViolations: ConstraintViolation[] = [];
  let needsApproval = false;
  let approvalReason: string | undefined;

  // Example violation checks
  if (mentor.capacity_remaining <= 0) {
    constraintViolations.push({
      rule_id: 'capacity_zero',
      rule_name: 'No Capacity',
      severity: 'error',
      description: 'Mentor has no remaining capacity',
    });
    needsApproval = true;
    approvalReason = 'Mentor at capacity';
  }

  if (features.topics_overlap === 0) {
    constraintViolations.push({
      rule_id: 'no_topics',
      rule_name: 'No Topic Overlap',
      severity: 'warning',
      description: 'No shared development topics',
    });
  }

  return {
    total_score: totalScore,
    score_breakdown: scoreBreakdown,
    alternative_mentors: [], // Will be populated by findAlternatives
    constraint_violations: constraintViolations,
    needs_approval: needsApproval,
    approval_reason: approvalReason,
  };
}

/**
 * Find alternative mentors (2nd, 3rd best) for a mentee
 */
export function findAlternativeMentors(
  mentee: MenteeData,
  mentors: MentorData[],
  excludeMentorId: string,
  model: MatchingModel,
  count: number = 2
): AlternativeMentor[] {
  const filters = model.filters;

  const alternatives = mentors
    .filter(mentor => mentor.id !== excludeMentorId)
    .filter(mentor => applyHardFilters(mentee, mentor, filters))
    .map(mentor => ({
      mentor,
      score: calculateMatchScoreWithModel(mentee, mentor, model),
    }))
    .sort((a, b) => b.score.total_score - a.score.total_score)
    .slice(0, count);

  return alternatives.map((alt, index) => ({
    mentor_id: alt.mentor.id,
    mentor_name: alt.mentor.id,
    score: alt.score.total_score,
    rank: index + 2, // 2 = second best, 3 = third best
  }));
}

/**
 * Perform matching using a configurable matching model
 */
export function performMatchingWithModel(
  mentees: MenteeData[],
  mentors: MentorData[],
  model: MatchingModel,
  mode: 'batch' | 'top3' = 'batch'
): {
  mode: string;
  model_id: string;
  model_version: number;
  stats: MatchingStats;
  results: Array<{
    mentee_id: string;
    mentee_name: string;
    recommendations: Array<{
      mentor_id: string;
      mentor_name: string;
      score: EnhancedMatchScore;
    }>;
    proposed_assignment?: {
      mentor_id: string | null;
      mentor_name?: string | null;
    };
  }>;
  flagged_for_approval: Array<{
    mentee_id: string;
    mentor_id: string;
    reason: string;
  }>;
} {
  const filters = model.filters;
  const flaggedForApproval: Array<{ mentee_id: string; mentor_id: string; reason: string }> = [];

  const stats: MatchingStats = {
    mentees_total: mentees.length,
    mentors_total: mentors.length,
    pairs_evaluated: 0,
    after_filters: 0,
  };

  // Track mentor capacity during batch assignment
  const mentorCapacity = new Map<string, number>();
  mentors.forEach(mentor => {
    mentorCapacity.set(mentor.id, mentor.capacity_remaining);
  });

  const results = mentees.map(mentee => {
    // Get available mentors
    const availableMentors = mode === 'batch'
      ? mentors.filter(mentor => (mentorCapacity.get(mentor.id) || 0) > 0)
      : mentors;

    stats.pairs_evaluated += availableMentors.length;

    // Filter and score all mentors
    const scoredMentors = availableMentors
      .filter(mentor => applyHardFilters(mentee, mentor, filters))
      .map(mentor => {
        const score = calculateMatchScoreWithModel(mentee, mentor, model);
        // Add alternatives to the score
        score.alternative_mentors = findAlternativeMentors(
          mentee,
          availableMentors,
          mentor.id,
          model,
          2
        );
        return { mentor, score };
      })
      .sort((a, b) => b.score.total_score - a.score.total_score);

    stats.after_filters += scoredMentors.length;

    // Get top 3 recommendations
    const recommendations = scoredMentors.slice(0, 3).map(match => ({
      mentor_id: match.mentor.id,
      mentor_name: match.mentor.id,
      score: match.score,
    }));

    // Handle batch assignment
    let proposedAssignment: { mentor_id: string | null; mentor_name?: string | null } | undefined;

    if (mode === 'batch' && recommendations.length > 0) {
      const bestMatch = recommendations[0];
      proposedAssignment = {
        mentor_id: bestMatch.mentor_id,
        mentor_name: bestMatch.mentor_name,
      };

      // Track flagged matches
      if (bestMatch.score.needs_approval) {
        flaggedForApproval.push({
          mentee_id: mentee.id,
          mentor_id: bestMatch.mentor_id,
          reason: bestMatch.score.approval_reason || 'Manual review required',
        });
      }

      // Decrease mentor capacity
      const currentCapacity = mentorCapacity.get(bestMatch.mentor_id) || 0;
      mentorCapacity.set(bestMatch.mentor_id, currentCapacity - 1);
    }

    return {
      mentee_id: mentee.id,
      mentee_name: mentee.id,
      recommendations,
      proposed_assignment: proposedAssignment,
    };
  });

  return {
    mode: mode === 'batch' ? 'batch_with_model' : 'top3_with_model',
    model_id: model.id,
    model_version: model.version,
    stats,
    results,
    flagged_for_approval: flaggedForApproval,
  };
}

/**
 * Evaluate matching rules against a mentee-mentor pair
 */
export function evaluateMatchingRules(
  mentee: MenteeData,
  mentor: MentorData,
  rules: MatchingRule[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const rule of rules) {
    if (!rule.is_active) continue;

    const condition = rule.condition;
    let conditionMet = false;

    // Get the value to check based on field
    let value: unknown;
    if (condition.field.startsWith('mentee.')) {
      const field = condition.field.replace('mentee.', '') as keyof MenteeData;
      value = mentee[field];
    } else if (condition.field.startsWith('mentor.')) {
      const field = condition.field.replace('mentor.', '') as keyof MentorData;
      value = mentor[field];
    }

    // Evaluate condition
    switch (condition.operator) {
      case '=':
        conditionMet = value === condition.value;
        break;
      case '!=':
        conditionMet = value !== condition.value;
        break;
      case '>':
        conditionMet = (value as number) > (condition.value as number);
        break;
      case '<':
        conditionMet = (value as number) < (condition.value as number);
        break;
      case '>=':
        conditionMet = (value as number) >= (condition.value as number);
        break;
      case '<=':
        conditionMet = (value as number) <= (condition.value as number);
        break;
      case 'contains':
        conditionMet = Array.isArray(value) && value.includes(condition.value);
        break;
      case 'not_contains':
        conditionMet = Array.isArray(value) && !value.includes(condition.value);
        break;
    }

    // If condition is met and it's an exclusion/must_have rule, add violation
    if (conditionMet && (rule.rule_type === 'exclusion' || rule.rule_type === 'must_have')) {
      violations.push({
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.rule_type === 'exclusion' ? 'error' : 'warning',
        description: rule.description || `Rule "${rule.name}" triggered`,
      });
    }
  }

  return violations;
}

// ============================================================================
// AI-ENHANCED MATCHING WITH OPENAI EMBEDDINGS
// ============================================================================

/**
 * Calculate embedding-based semantic similarity from pre-computed vectors.
 * Falls back to 0 if embeddings are missing for either participant.
 */
function calculateEmbeddingSimilarity(
  menteeId: string,
  mentorId: string,
  cache: EmbeddingCache,
): number {
  const menteeVec = cache.menteeEmbeddings.get(menteeId);
  const mentorVec = cache.mentorEmbeddings.get(mentorId);
  if (!menteeVec || !mentorVec) return 0;
  // Cosine similarity for normalized OpenAI embeddings returns 0-1 range
  return Math.max(0, cosineSimilarity(menteeVec, mentorVec));
}

/**
 * Calculate features with embedding-based semantic similarity
 * instead of the keyword-counting heuristic.
 */
export function calculateFeaturesWithEmbeddings(
  mentee: MenteeData,
  mentor: MentorData,
  embeddingCache: EmbeddingCache,
): MatchingFeatures {
  const baseFeatures = calculateFeatures(mentee, mentor);
  return {
    ...baseFeatures,
    semantic_similarity: calculateEmbeddingSimilarity(mentee.id, mentor.id, embeddingCache),
  };
}

/**
 * Calculate match score using embedding-enhanced features.
 */
function calculateMatchScoreWithEmbeddings(
  mentee: MenteeData,
  mentor: MentorData,
  embeddingCache: EmbeddingCache,
): MatchScore {
  const features = calculateFeaturesWithEmbeddings(mentee, mentor, embeddingCache);

  const totalScore = Math.max(0, Math.min(100,
    40 * features.topics_overlap +
    15 * features.industry_overlap +
    10 * features.role_seniority_fit +
    20 * features.semantic_similarity +
    5 * features.tz_overlap_bonus +
    5 * features.language_bonus -
    10 * features.capacity_penalty
  ));

  // Reuse the reason/risk generation from the original calculateMatchScore
  const baseScore = calculateMatchScore(mentee, mentor);

  return {
    ...baseScore,
    total_score: totalScore,
    features,
    is_embedding_based: true,
  };
}

/**
 * Find top matches using embedding-enhanced scoring.
 */
function findTopMatchesWithEmbeddings(
  mentee: MenteeData,
  mentors: MentorData[],
  embeddingCache: EmbeddingCache,
  maxResults: number = 3,
): { mentor_id: string; mentor_name?: string; score: MatchScore }[] {
  const validMatches = mentors
    .filter(mentor => applyHardFilters(mentee, mentor))
    .map(mentor => ({
      mentor,
      score: calculateMatchScoreWithEmbeddings(mentee, mentor, embeddingCache),
    }))
    .sort(compareMentorMatches)
    .slice(0, maxResults);

  return validMatches.map(match => ({
    mentor_id: match.mentor.id,
    mentor_name: match.mentor.id,
    score: match.score,
  }));
}

/**
 * Async batch matching using OpenAI embeddings for semantic similarity.
 * Falls back to the original synchronous matching if embedding generation fails.
 */
export async function performBatchMatchingAsync(
  mentees: MenteeData[],
  mentors: MentorData[],
  cohortId: string,
): Promise<{ output: MatchingOutput; usedEmbeddings: boolean }> {
  let embeddingCache: EmbeddingCache | null = null;

  try {
    embeddingCache = await getOrComputeEmbeddings(cohortId, mentees, mentors);
  } catch (error) {
    console.warn('Embedding generation failed, falling back to keyword matching:', error);
  }

  if (!embeddingCache) {
    return { output: performBatchMatching(mentees, mentors), usedEmbeddings: false };
  }

  const results: MatchingResult[] = [];
  const stats: MatchingStats = {
    mentees_total: mentees.length,
    mentors_total: mentors.length,
    pairs_evaluated: 0,
    after_filters: 0,
  };

  const mentorCapacity = new Map<string, number>();
  mentors.forEach(mentor => {
    mentorCapacity.set(mentor.id, mentor.capacity_remaining);
  });

  mentees.forEach(mentee => {
    const availableMentors = mentors.filter(mentor =>
      (mentorCapacity.get(mentor.id) || 0) > 0
    );

    stats.pairs_evaluated += availableMentors.length;

    const recommendations = findTopMatchesWithEmbeddings(mentee, availableMentors, embeddingCache!, 3);
    stats.after_filters += recommendations.length;

    let proposedAssignment: { mentor_id: string | null; mentor_name?: string | null } = {
      mentor_id: null,
      mentor_name: null,
    };

    if (recommendations.length > 0) {
      const bestMatch = recommendations[0];
      proposedAssignment = {
        mentor_id: bestMatch.mentor_id,
        mentor_name: bestMatch.mentor_name,
      };
      const currentCapacity = mentorCapacity.get(bestMatch.mentor_id) || 0;
      mentorCapacity.set(bestMatch.mentor_id, currentCapacity - 1);
    }

    results.push({
      mentee_id: mentee.id,
      mentee_name: mentee.id,
      recommendations,
      proposed_assignment: proposedAssignment,
    });
  });

  return {
    output: { mode: "batch", stats, results },
    usedEmbeddings: true,
  };
}

/**
 * Async top-3 matching using OpenAI embeddings for semantic similarity.
 * Falls back to the original synchronous matching if embedding generation fails.
 */
export async function performTop3MatchingAsync(
  mentees: MenteeData[],
  mentors: MentorData[],
  cohortId: string,
): Promise<{ output: MatchingOutput; usedEmbeddings: boolean }> {
  let embeddingCache: EmbeddingCache | null = null;

  try {
    embeddingCache = await getOrComputeEmbeddings(cohortId, mentees, mentors);
  } catch (error) {
    console.warn('Embedding generation failed, falling back to keyword matching:', error);
  }

  if (!embeddingCache) {
    return { output: performTop3Matching(mentees, mentors), usedEmbeddings: false };
  }

  const results: MatchingResult[] = [];
  const stats: MatchingStats = {
    mentees_total: mentees.length,
    mentors_total: mentors.length,
    pairs_evaluated: mentees.length * mentors.length,
    after_filters: 0,
  };

  mentees.forEach(mentee => {
    const recommendations = findTopMatchesWithEmbeddings(mentee, mentors, embeddingCache!, 3);
    stats.after_filters += recommendations.length;

    results.push({
      mentee_id: mentee.id,
      mentee_name: mentee.id,
      recommendations,
    });
  });

  return {
    output: { mode: "top3_per_mentee", stats, results },
    usedEmbeddings: true,
  };
}