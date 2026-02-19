import {
  MenteeData,
  MentorData,
  MatchingFilters,
  MatchingFeatures,
  MatchScore,
  MatchingResult,
  MatchingOutput,
  MatchingStats,
  SENIORITY_SCORES,
  LEGACY_SENIORITY_SCORES,
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
import { areSameCluster } from "./capabilityClusters";

// Hard filters implementation
export function applyHardFilters(
  mentee: MenteeData,
  mentor: MentorData,
  filters: MatchingFilters = {
    max_timezone_difference: 6,
    require_available_capacity: true
  }
): boolean {
  // Timezone difference filter (>6h = hard block)
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

  // Excluded scenarios filter: if mentee's practice scenarios overlap with mentor's excluded scenarios
  if (mentee.practice_scenarios?.length && mentor.excluded_scenarios?.length) {
    const menteeScenarios = new Set(mentee.practice_scenarios.map(s => s.toLowerCase()));
    const hasExcludedOverlap = mentor.excluded_scenarios.some(s =>
      menteeScenarios.has(s.toLowerCase())
    );
    if (hasExcludedOverlap) {
      return false;
    }
  }

  return true;
}

// Calculate timezone distance in hours
function calculateTimezoneDistance(tz1: string, tz2: string): number {
  // Timezone mapping for both legacy and new survey labels
  const timezoneMap: Record<string, number> = {
    // New survey labels (from MS Forms)
    'Americas (CT)': -6,
    'Europe (CET)': 1,
    'Europe (GMT)': 0,
    'Australia (AET)': 10,
    'Europe - (CET / CEST)': 1,
    'Europe - (GMT / BST)': 0,
    'Americas - (CT / CDT)': -6,
    'Australia - (AET / AEDT)': 10,
    // Legacy labels
    'Central Europe (CET)': 1,
    'UK / Ireland (GMT)': 0,
    'US – Pacific Time (PST)': -8,
    'US – Central Time (CST)': -6,
    'Australia (AEST)': 10,
    'US – Eastern Time (EST)': -5,
  };

  // Try exact match first, then keyword-based fallback
  const resolveOffset = (tz: string): number => {
    if (timezoneMap[tz] !== undefined) return timezoneMap[tz];
    const lower = tz.toLowerCase();
    if (lower.includes('cet') || lower.includes('cest')) return 1;
    if (lower.includes('gmt') || lower.includes('bst')) return 0;
    if (lower.includes('ct') || lower.includes('cdt') || lower.includes('cst')) return -6;
    if (lower.includes('est') || lower.includes('edt')) return -5;
    if (lower.includes('pst') || lower.includes('pdt')) return -8;
    if (lower.includes('aet') || lower.includes('aedt') || lower.includes('aest')) return 10;
    return 0;
  };

  return Math.abs(resolveOffset(tz1) - resolveOffset(tz2));
}

// Feature score calculations
export function calculateFeatures(mentee: MenteeData, mentor: MentorData): MatchingFeatures {
  // Detect if we're using new survey data (has primary_capability)
  const hasNewFields = !!(mentee.primary_capability || mentor.primary_capability);

  if (hasNewFields) {
    return {
      capability_match: calculateCapabilityMatch(mentee, mentor),
      domain_match: calculateDomainMatch(mentee, mentor),
      role_seniority_fit: calculateRoleSeniorityFit(mentee, mentor),
      semantic_similarity: calculateSemanticSimilarity(mentee, mentor),
      tz_overlap_bonus: calculateTimezoneBonus(mentee.location_timezone, mentor.location_timezone),
      capacity_penalty: calculateCapacityPenalty(mentor.capacity_remaining),
    };
  }

  // Legacy fallback for old cohorts
  return {
    capability_match: calculateTopicsOverlap(mentee.topics_to_learn, mentor.topics_to_mentor),
    domain_match: 0,
    role_seniority_fit: calculateRoleSeniorityFit(mentee, mentor),
    semantic_similarity: calculateSemanticSimilarity(mentee, mentor),
    tz_overlap_bonus: calculateTimezoneBonus(mentee.location_timezone, mentor.location_timezone),
    capacity_penalty: calculateCapacityPenalty(mentor.capacity_remaining),
    // Legacy fields
    topics_overlap: calculateTopicsOverlap(mentee.topics_to_learn, mentor.topics_to_mentor),
    industry_overlap: 1,
    language_bonus: 0,
  };
}

// ============================================================================
// NEW CAPABILITY-BASED MATCHING (tiered scoring)
// ============================================================================

/**
 * Tiered capability matching score (0-1 scale).
 *
 * Scoring tiers within the 45% capability bucket:
 * - Mentee primary = Mentor primary: 100%
 * - Mentee primary = one of Mentor secondary: 80%
 * - Mentee primary in same cluster as Mentor primary: 55%
 * - Mentee primary in same cluster as Mentor secondary: 40%
 * - Mentee secondary matches Mentor primary or any secondary: +15% bonus
 * - Practice scenario overlap: +10% bonus
 * - No match: 0%
 */
function calculateCapabilityMatch(mentee: MenteeData, mentor: MentorData): number {
  const menteePrimary = mentee.primary_capability?.toLowerCase() || '';
  const menteeSecondary = mentee.secondary_capability?.toLowerCase() || '';
  const mentorPrimary = mentor.primary_capability?.toLowerCase() || '';
  const mentorSecondaries = (mentor.secondary_capabilities || []).map(s => s.toLowerCase());

  if (!menteePrimary) return 0;

  let score = 0;

  // Primary capability matching
  if (mentorPrimary && menteePrimary === mentorPrimary) {
    score = 1.0; // 100% — exact primary match
  } else if (mentorSecondaries.includes(menteePrimary)) {
    score = 0.8; // 80% — in mentor's secondary list
  } else if (mentorPrimary && mentee.primary_capability && mentor.primary_capability &&
    areSameCluster(mentee.primary_capability, mentor.primary_capability)) {
    score = 0.55; // 55% — same cluster as mentor primary
  } else if (mentee.primary_capability && (mentor.secondary_capabilities || []).some(sec =>
    areSameCluster(mentee.primary_capability!, sec))) {
    score = 0.4; // 40% — same cluster as mentor secondary
  }

  // Secondary capability bonus (+15%)
  if (menteeSecondary) {
    const secondaryMatches = mentorPrimary === menteeSecondary ||
      mentorSecondaries.includes(menteeSecondary);
    if (secondaryMatches) {
      score = Math.min(1.0, score + 0.15);
    }
  }

  // Practice scenario overlap bonus (+10%)
  if (mentee.practice_scenarios?.length && mentor.practice_scenarios?.length) {
    const menteeScenarios = new Set(mentee.practice_scenarios.map(s => s.toLowerCase()));
    const scenarioOverlap = mentor.practice_scenarios.some(s =>
      menteeScenarios.has(s.toLowerCase())
    );
    if (scenarioOverlap) {
      score = Math.min(1.0, score + 0.10);
    }
  }

  return score;
}

/**
 * Domain detail text similarity (5% weight).
 * Compares free-text domain expertise detail fields for keyword overlap.
 */
function calculateDomainMatch(mentee: MenteeData, mentor: MentorData): number {
  const menteeDetail = (mentee.primary_capability_detail || '').toLowerCase();
  const mentorDetail = [
    mentor.primary_capability_detail || '',
    mentor.secondary_capability_detail || '',
  ].join(' ').toLowerCase();

  if (!menteeDetail || !mentorDetail) return 0;

  const menteeWords = menteeDetail.split(/\s+/).filter(w => w.length > 3);
  const mentorWords = mentorDetail.split(/\s+/).filter(w => w.length > 3);

  if (menteeWords.length === 0 || mentorWords.length === 0) return 0;

  const commonWords = menteeWords.filter(w => mentorWords.includes(w));
  return Math.min(1, commonWords.length / Math.max(menteeWords.length, 1));
}

// ============================================================================
// LEGACY TOPIC MATCHING (for old cohorts)
// ============================================================================

// Topics overlap using Jaccard similarity
function calculateTopicsOverlap(menteeTopics: string[], mentorTopics: string[]): number {
  if (menteeTopics.length === 0 || mentorTopics.length === 0) return 0;

  const intersection = menteeTopics.filter(topic => mentorTopics.includes(topic));
  const union = [...new Set([...menteeTopics, ...mentorTopics])];

  return intersection.length / union.length;
}

// ============================================================================
// SHARED SCORING FUNCTIONS
// ============================================================================

// Role seniority fit calculation
function calculateRoleSeniorityFit(mentee: MenteeData, mentor: MentorData): number {
  // Resolve seniority score — try new S1-LT levels first, then legacy IC1-M2
  const resolveSeniority = (band: string | undefined, defaultVal: number): number => {
    if (!band) return defaultVal;
    return SENIORITY_SCORES[band] ?? LEGACY_SENIORITY_SCORES[band] ?? defaultVal;
  };

  const menteeSeniority = resolveSeniority(mentee.seniority_band, 2);
  const mentorSeniority = resolveSeniority(mentor.seniority_band, 3);

  if (mentorSeniority > menteeSeniority) {
    // Mentor is senior — ideal. Score based on gap (1-2 levels = best).
    const gap = mentorSeniority - menteeSeniority;
    if (gap <= 2) return 1.0;
    if (gap <= 4) return 0.8;
    return 0.6; // Very large gap — still valid but less ideal
  } else if (mentorSeniority === menteeSeniority) {
    return 0.5; // Same level — not ideal but acceptable
  } else {
    return 0.2; // Mentor below mentee — poor fit
  }
}

// Semantic similarity between goals and bio (keyword-based fallback)
function calculateSemanticSimilarity(mentee: MenteeData, mentor: MentorData): number {
  // Build text from new fields first, fall back to legacy
  const menteeText = (
    mentee.mentoring_goal || mentee.bio || mentee.goals_text || ''
  ).toLowerCase();
  const mentorText = (
    mentor.mentor_motivation || mentor.hard_earned_lesson || mentor.bio ||
    mentor.bio_text || mentor.topics_to_mentor.join(' ')
  ).toLowerCase();

  if (!menteeText || !mentorText) return 0;

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
  if (distance === 0) return 1.0; // Same timezone
  if (distance <= 2) return 0.5; // Close enough
  return 0; // Too far
}

// Capacity penalty calculation
function calculateCapacityPenalty(capacityRemaining: number): number {
  return capacityRemaining === 1 ? 1 : 0;
}

// Calculate final match score with new capability-based weights
export function calculateMatchScore(mentee: MenteeData, mentor: MentorData): MatchScore {
  const features = calculateFeatures(mentee, mentor);

  // New scoring formula: Capability 45%, Semantic 30%, Domain 5%, Seniority 10%, TZ 5%, Capacity -10%
  const totalScore = Math.max(0, Math.min(100,
    45 * features.capability_match +
    30 * features.semantic_similarity +
    5 * features.domain_match +
    10 * features.role_seniority_fit +
    5 * features.tz_overlap_bonus -
    10 * features.capacity_penalty
  ));

  // Compute timezone distance once for reasons and risks
  const tzDistance = calculateTimezoneDistance(mentee.location_timezone, mentor.location_timezone);

  // Generate reasons for the match
  const reasons: string[] = [];
  if (features.capability_match >= 1.0) {
    reasons.push(`Exact primary capability match: both share "${mentee.primary_capability || mentee.topics_to_learn?.[0] || 'shared area'}" as their primary focus`);
  } else if (features.capability_match >= 0.8) {
    reasons.push(`Mentee wants "${mentee.primary_capability}" \u2014 mentor offers it as a secondary capability`);
  } else if (features.capability_match >= 0.55) {
    reasons.push(`Related capability cluster: mentee wants "${mentee.primary_capability}", mentor's primary is "${mentor.primary_capability}" (same theme family)`);
  } else if (features.capability_match >= 0.4) {
    reasons.push(`Related capability cluster via secondary: mentee wants "${mentee.primary_capability}", mentor has related secondary expertise`);
  }

  // Secondary capability bonus
  if (mentee.secondary_capability) {
    const mentorPri = mentor.primary_capability?.toLowerCase() || '';
    const mentorSecs = (mentor.secondary_capabilities || []).map(s => s.toLowerCase());
    if (mentorPri === mentee.secondary_capability.toLowerCase() ||
        mentorSecs.includes(mentee.secondary_capability.toLowerCase())) {
      reasons.push(`Secondary capability bonus: mentee also wants "${mentee.secondary_capability}" which the mentor can offer`);
    }
  }

  if (features.domain_match > 0.2) {
    reasons.push("Overlapping domain expertise in capability detail descriptions");
  }
  if (features.role_seniority_fit >= 1.0) {
    reasons.push(`Good seniority fit: mentee is ${mentee.seniority_band || 'unknown'}, mentor is ${mentor.seniority_band || 'unknown'} (1-2 level gap, ideal)`);
  } else if (features.role_seniority_fit >= 0.8) {
    reasons.push(`Good seniority fit: mentee is ${mentee.seniority_band || 'unknown'}, mentor is ${mentor.seniority_band || 'unknown'} (3-4 level gap, solid)`);
  }
  if (features.tz_overlap_bonus > 0) {
    if (tzDistance === 0) {
      reasons.push(`Same timezone: both in ${mentee.location_timezone}`);
    } else {
      reasons.push(`Close timezones (~${tzDistance}h): ${mentee.location_timezone} / ${mentor.location_timezone}`);
    }
  }
  if (features.semantic_similarity > 0.2) {
    reasons.push("Aligned goals and motivation based on profile text analysis");
  }

  // Practice scenario overlap
  if (mentee.practice_scenarios?.length && mentor.practice_scenarios?.length) {
    const menteeScenarios = new Set(mentee.practice_scenarios.map(s => s.toLowerCase()));
    const overlapping = mentor.practice_scenarios.filter(s => menteeScenarios.has(s.toLowerCase()));
    if (overlapping.length > 0) {
      reasons.push(`Shared practice scenario${overlapping.length > 1 ? 's' : ''}: ${overlapping.join(', ')}`);
    }
  }

  // Mentoring style & preference insights
  if (mentee.preferred_mentor_style && mentor.mentoring_style) {
    const menteeStyle = mentee.preferred_mentor_style.toLowerCase();
    const mentorStyle = mentor.mentoring_style.toLowerCase();
    if (menteeStyle === mentorStyle || mentorStyle.includes(menteeStyle) || menteeStyle.includes(mentorStyle)) {
      reasons.push(`Mentoring style alignment: mentee prefers "${mentee.preferred_mentor_style}" and mentor's style is "${mentor.mentoring_style}"`);
    }
  }
  if (mentee.preferred_mentor_energy && mentor.mentor_energy) {
    const menteeEnergy = mentee.preferred_mentor_energy.toLowerCase();
    const mentorEnergy = mentor.mentor_energy.toLowerCase();
    if (menteeEnergy === mentorEnergy || mentorEnergy.includes(menteeEnergy) || menteeEnergy.includes(mentorEnergy)) {
      reasons.push(`Energy match: mentee wants "${mentee.preferred_mentor_energy}" and mentor is "${mentor.mentor_energy}"`);
    }
  }
  if (mentee.feedback_preference && mentor.feedback_style) {
    const menteeFb = mentee.feedback_preference.toLowerCase();
    const mentorFb = mentor.feedback_style.toLowerCase();
    if (menteeFb === mentorFb || mentorFb.includes(menteeFb) || menteeFb.includes(mentorFb)) {
      reasons.push(`Feedback style match: mentee prefers "${mentee.feedback_preference}" and mentor gives "${mentor.feedback_style}"`);
    }
  }
  if (mentee.meeting_frequency && mentor.meeting_frequency) {
    const menteeMf = mentee.meeting_frequency.toLowerCase();
    const mentorMf = mentor.meeting_frequency.toLowerCase();
    if (menteeMf === mentorMf || mentorMf.includes(menteeMf) || menteeMf.includes(mentorMf)) {
      reasons.push(`Meeting frequency agreement: both prefer ${mentee.meeting_frequency}`);
    }
  }
  if (mentor.has_mentored_before && mentee.mentor_experience_importance) {
    const importance = mentee.mentor_experience_importance.toLowerCase();
    if (importance.includes('important') || importance.includes('very') || importance.includes('prefer')) {
      reasons.push(`Experienced mentor: mentee values mentor experience and this mentor has mentored before`);
    }
  }
  if (mentor.natural_strengths?.length) {
    reasons.push(`Mentor's natural strengths: ${mentor.natural_strengths.join(', ')}`);
  }

  // Generate risks/concerns
  const risks: string[] = [];
  if (features.capacity_penalty > 0) {
    risks.push(`Limited mentor capacity: only ${mentor.capacity_remaining} slot${mentor.capacity_remaining === 1 ? '' : 's'} remaining`);
  }
  if (features.capability_match < 0.2) {
    risks.push(`Minimal capability overlap: mentee wants "${mentee.primary_capability || 'unknown'}" but mentor focuses on "${mentor.primary_capability || 'unknown'}"`);
  } else if (features.capability_match < 0.4) {
    risks.push(`Weak capability overlap: mentee wants "${mentee.primary_capability || 'unknown'}", mentor's primary is "${mentor.primary_capability || 'unknown'}"`);
  }
  if (tzDistance > 4) {
    risks.push(`Large timezone gap (${tzDistance}h): ${mentee.location_timezone} vs ${mentor.location_timezone} \u2014 scheduling may be challenging`);
  } else if (tzDistance > 2) {
    risks.push(`Moderate timezone difference (${tzDistance}h): ${mentee.location_timezone} vs ${mentor.location_timezone}`);
  }
  if (features.role_seniority_fit <= 0.2 && features.role_seniority_fit > 0) {
    risks.push(`Seniority concern: mentee is ${mentee.seniority_band || 'unknown'}, mentor is ${mentor.seniority_band || 'unknown'} (mentor may be at a lower level)`);
  } else if (features.role_seniority_fit <= 0.5 && features.role_seniority_fit > 0.2) {
    risks.push(`Same seniority level: both at ${mentee.seniority_band || 'unknown'} \u2014 limited growth opportunity`);
  }
  if (features.semantic_similarity < 0.1) {
    risks.push("Low goals alignment: mentee's stated goals and mentor's motivation have minimal textual overlap");
  }

  // Style/preference mismatch risks
  if (mentee.preferred_mentor_style && mentor.mentoring_style) {
    const menteeStyle = mentee.preferred_mentor_style.toLowerCase();
    const mentorStyle = mentor.mentoring_style.toLowerCase();
    if (menteeStyle !== mentorStyle && !mentorStyle.includes(menteeStyle) && !menteeStyle.includes(mentorStyle)) {
      risks.push(`Style mismatch: mentee prefers "${mentee.preferred_mentor_style}" but mentor's style is "${mentor.mentoring_style}"`);
    }
  }
  if (mentee.preferred_mentor_energy && mentor.mentor_energy) {
    const menteeEnergy = mentee.preferred_mentor_energy.toLowerCase();
    const mentorEnergy = mentor.mentor_energy.toLowerCase();
    if (menteeEnergy !== mentorEnergy && !mentorEnergy.includes(menteeEnergy) && !menteeEnergy.includes(mentorEnergy)) {
      risks.push(`Energy mismatch: mentee wants "${mentee.preferred_mentor_energy}" but mentor is "${mentor.mentor_energy}"`);
    }
  }
  if (mentee.feedback_preference && mentor.feedback_style) {
    const menteeFb = mentee.feedback_preference.toLowerCase();
    const mentorFb = mentor.feedback_style.toLowerCase();
    if (menteeFb !== mentorFb && !mentorFb.includes(menteeFb) && !menteeFb.includes(mentorFb)) {
      risks.push(`Feedback style mismatch: mentee prefers "${mentee.feedback_preference}" but mentor gives "${mentor.feedback_style}"`);
    }
  }
  if (mentee.meeting_frequency && mentor.meeting_frequency) {
    const menteeMf = mentee.meeting_frequency.toLowerCase();
    const mentorMf = mentor.meeting_frequency.toLowerCase();
    if (menteeMf !== mentorMf && !mentorMf.includes(menteeMf) && !menteeMf.includes(mentorMf)) {
      risks.push(`Meeting frequency mismatch: mentee wants ${mentee.meeting_frequency}, mentor prefers ${mentor.meeting_frequency}`);
    }
  }
  if (!mentor.has_mentored_before) {
    if (mentee.mentor_experience_importance) {
      const importance = mentee.mentor_experience_importance.toLowerCase();
      if (importance.includes('important') || importance.includes('very') || importance.includes('prefer')) {
        risks.push(`Mentee values mentor experience but this is the mentor's first time mentoring`);
      }
    } else {
      risks.push(`First-time mentor: ${mentor.name || 'this mentor'} has not mentored before`);
    }
  }
  if (mentee.what_not_wanted) {
    risks.push(`Mentee has stated they don't want: "${mentee.what_not_wanted}"`);
  }
  if (mentor.excluded_scenarios?.length && mentee.practice_scenarios?.length) {
    const excluded = mentor.excluded_scenarios.map(s => s.toLowerCase());
    const flagged = mentee.practice_scenarios.filter(s => excluded.includes(s.toLowerCase()));
    if (flagged.length > 0) {
      risks.push(`Scenario conflict: mentee wants "${flagged.join(', ')}" but mentor has excluded ${flagged.length > 1 ? 'these' : 'this'}`);
    }
  }
  if (mentor.match_exclusions) {
    risks.push(`Mentor has match exclusion notes: "${mentor.match_exclusions}"`);
  }

  // Generate icebreaker suggestion
  const sharedCapability = mentee.primary_capability && mentor.primary_capability &&
    mentee.primary_capability.toLowerCase() === mentor.primary_capability.toLowerCase()
    ? mentee.primary_capability
    : null;
  const icebreaker = sharedCapability
    ? `Discuss shared focus on ${sharedCapability}`
    : mentee.mentoring_goal
      ? `Explore mentee's goal: ${mentee.mentoring_goal.substring(0, 80)}...`
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

  // Tie-break 1: capability_match
  if (a.score.features.capability_match !== b.score.features.capability_match) {
    return b.score.features.capability_match - a.score.features.capability_match;
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
    mentor_name: match.mentor.name || match.mentor.id,
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
      mentee_name: mentee.name || mentee.id,
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
      mentee_name: mentee.name || mentee.id,
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
      criterion: 'capability',
      criterion_name: 'Capability Match',
      raw_score: features.capability_match,
      max_possible: 1,
      weight: weights.capability,
      weighted_score: features.capability_match * weights.capability,
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
      criterion: 'domain',
      criterion_name: 'Domain Match',
      raw_score: features.domain_match,
      max_possible: 1,
      weight: weights.domain,
      weighted_score: features.domain_match * weights.domain,
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

  if (features.capability_match === 0) {
    constraintViolations.push({
      rule_id: 'no_capability',
      rule_name: 'No Capability Match',
      severity: 'warning',
      description: 'No capability or cluster overlap',
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
    mentor_name: alt.mentor.name || alt.mentor.id,
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
      mentor_name: match.mentor.name || match.mentor.id,
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
      mentee_name: mentee.name || mentee.id,
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

  // Same weights as calculateMatchScore but with embedding-enhanced semantic similarity
  const totalScore = Math.max(0, Math.min(100,
    45 * features.capability_match +
    30 * features.semantic_similarity +
    5 * features.domain_match +
    10 * features.role_seniority_fit +
    5 * features.tz_overlap_bonus -
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
    mentor_name: match.mentor.name || match.mentor.id,
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
      mentee_name: mentee.name || mentee.id,
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
      mentee_name: mentee.name || mentee.id,
      recommendations,
    });
  });

  return {
    output: { mode: "top3_per_mentee", stats, results },
    usedEmbeddings: true,
  };
}