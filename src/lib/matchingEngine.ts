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
  COMPENSATION_GRADE_SCORES,
  parseCompensationGrade,
} from "@/types/mentoring";
import { countryToTimezoneOffset } from './surveyFieldMapping';
import type { LLMPairScore } from './llmMatchingService';
import { scorePairsWithLLM } from './llmMatchingService';
import type {
  MatchingModel,
  MatchingWeights,
  EnhancedMatchScore,
  ScoreBreakdown,
  AlternativeMentor,
  ConstraintViolation,
  MatchingRule,
} from "@/types/matching";
import type { LLMScoringProgress } from './llmMatchingService';
import { cosineSimilarity } from "./embeddingUtils";

// Progress callback for multi-step matching
export type MatchingStep = 'embeddings' | 'llm_scoring' | 'scoring' | 'done';
export interface MatchingProgress {
  step: MatchingStep;
  stepLabel: string;
  /** 0-100 progress within the current step */
  stepProgress: number;
  /** LLM scoring detail (only during llm_scoring step) */
  llmDetail?: { completed: number; total: number };
}
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

  // First-time mentor filter: hard block if mentee explicitly requires prior experience
  // V3: open_to_first_time_mentor field, V2: mentor_experience_importance
  const firstTimePref = mentee.open_to_first_time_mentor || mentee.mentor_experience_importance;
  if (firstTimePref) {
    const pref = firstTimePref.toLowerCase();
    const requiresExperience = (pref.includes('no') && pref.includes('prior')) ||
      (pref.includes('no') && !pref.includes('yes')) ||
      pref.includes('prefer experienced');
    if (requiresExperience && !mentor.has_mentored_before) {
      return false;
    }
  }

  // V3: topics_prefer_not (mentor's free-text exclusion) vs mentee's capabilities_wanted
  if (mentor.topics_prefer_not && mentee.capabilities_wanted) {
    const excludeWords = mentor.topics_prefer_not.toLowerCase().split(/[\s,;]+/).filter(w => w.length > 3);
    const wantedWords = mentee.capabilities_wanted.toLowerCase().split(/[\s,;]+/).filter(w => w.length > 3);
    // Hard block if there's significant keyword overlap (3+ shared words)
    const overlap = excludeWords.filter(w => wantedWords.includes(w));
    if (overlap.length >= 3) {
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

    // V3 format: "UTC+1", "UTC-5", "UTC+5.5"
    const utcMatch = tz.match(/UTC([+-]?\d+(?:\.\d+)?)/i);
    if (utcMatch) return parseFloat(utcMatch[1]);

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
/**
 * Detect which survey version the data is from.
 * V3: has capabilities_wanted/capabilities_offered (free-text) or compensation_grade
 * V2: has primary_capability (from capability framework)
 * V1: legacy topic-based
 */
function detectDataVersion(mentee: MenteeData, mentor: MentorData): 'v3' | 'v2' | 'v1' {
  if (mentee.capabilities_wanted || mentor.capabilities_offered || mentee.compensation_grade || mentor.compensation_grade) {
    return 'v3';
  }
  if (mentee.primary_capability || mentor.primary_capability) {
    return 'v2';
  }
  return 'v1';
}

export function calculateFeatures(mentee: MenteeData, mentor: MentorData): MatchingFeatures {
  const version = detectDataVersion(mentee, mentor);

  // Advanced features (computed regardless of survey version)
  const advancedFeatures = {
    compatibility_score: calculateCompatibility(mentee, mentor),
    proficiency_gap: calculateProficiencyGap(mentee, mentor),
    department_diversity: calculateDepartmentDiversity(mentee, mentor),
  };

  if (version === 'v3') {
    // V3: LLM scores populated externally, other features computed here
    return {
      capability_match: 0, // Replaced by llm_content_score for V3 (populated externally)
      domain_match: 0,     // Replaced by llm_content_score for V3
      role_seniority_fit: calculateRoleSeniorityFitV3(mentee, mentor),
      semantic_similarity: calculateSemanticSimilarity(mentee, mentor),
      tz_overlap_bonus: calculateTimezoneBonus(mentee.location_timezone, mentor.location_timezone),
      capacity_penalty: calculateCapacityPenalty(mentor.capacity_remaining),
      ...advancedFeatures,
    };
  }

  if (version === 'v2') {
    return {
      capability_match: calculateCapabilityMatch(mentee, mentor),
      domain_match: calculateDomainMatch(mentee, mentor),
      role_seniority_fit: calculateRoleSeniorityFit(mentee, mentor),
      semantic_similarity: calculateSemanticSimilarity(mentee, mentor),
      tz_overlap_bonus: calculateTimezoneBonus(mentee.location_timezone, mentor.location_timezone),
      capacity_penalty: calculateCapacityPenalty(mentor.capacity_remaining),
      ...advancedFeatures,
    };
  }

  // V1 Legacy fallback for old cohorts
  return {
    capability_match: calculateTopicsOverlap(mentee.topics_to_learn, mentor.topics_to_mentor),
    domain_match: 0,
    role_seniority_fit: calculateRoleSeniorityFit(mentee, mentor),
    semantic_similarity: calculateSemanticSimilarity(mentee, mentor),
    tz_overlap_bonus: calculateTimezoneBonus(mentee.location_timezone, mentor.location_timezone),
    capacity_penalty: calculateCapacityPenalty(mentor.capacity_remaining),
    ...advancedFeatures,
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
  const menteeDetail = [
    mentee.primary_capability_detail || '',
    mentee.secondary_capability_detail || '',
  ].join(' ').toLowerCase();
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

/**
 * V3 seniority fit using Compensation Grade (L1–L7).
 * L1 = highest (SVP/VP), L7 = lowest (entry). Score = 7 for L1, 1 for L7.
 * Falls back to SENIORITY_SCORES if compensation_grade not available.
 */
function calculateRoleSeniorityFitV3(mentee: MenteeData, mentor: MentorData): number {
  const menteeSeniority = mentee.compensation_grade
    ? parseCompensationGrade(mentee.compensation_grade)
    : (mentee.seniority_band ? (SENIORITY_SCORES[mentee.seniority_band] ?? LEGACY_SENIORITY_SCORES[mentee.seniority_band] ?? 2) : 2);

  const mentorSeniority = mentor.compensation_grade
    ? parseCompensationGrade(mentor.compensation_grade)
    : (mentor.seniority_band ? (SENIORITY_SCORES[mentor.seniority_band] ?? LEGACY_SENIORITY_SCORES[mentor.seniority_band] ?? 3) : 3);

  if (mentorSeniority > menteeSeniority) {
    const gap = mentorSeniority - menteeSeniority;
    if (gap <= 2) return 1.0;
    if (gap <= 4) return 0.8;
    return 0.6;
  } else if (mentorSeniority === menteeSeniority) {
    return 0.5;
  } else {
    return 0.2;
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

// ============================================================================
// ADVANCED SCORING FUNCTIONS (opt-in via weights)
// ============================================================================

/**
 * Compatibility score based on style, energy, feedback, meeting frequency, and mentoring
 * style alignment (mentor_help_wanted vs natural_strengths).
 * Averages all sub-factors where both values exist (0–1 scale).
 */
function calculateCompatibility(mentee: MenteeData, mentor: MentorData): number {
  const comparePair = (menteeVal?: string, mentorVal?: string): number | null => {
    if (!menteeVal || !mentorVal) return null; // Skip if either missing
    const a = menteeVal.toLowerCase();
    const b = mentorVal.toLowerCase();
    if (a === b || b.includes(a) || a.includes(b)) return 1.0;
    return 0;
  };

  // Session style: use new-survey meeting_style with legacy mentoring_style as fallback
  const mentorSessionStyle = mentor.meeting_style || mentor.mentoring_style;

  // mentor_help_wanted (Q17) vs natural_strengths (Q31): both use aligned option lists.
  // Normalize by stripping the "Someone who..." / "I..." prefixes, then measure word overlap.
  const styleAlignmentScore = (() => {
    const wanted = mentee.mentor_help_wanted;
    const strengths = mentor.natural_strengths;
    if (!wanted?.length || !strengths?.length) return null;

    const tokenize = (s: string) =>
      s.toLowerCase()
        .replace(/^someone who (will |can )?/i, '')
        .replace(/^i (help |provide |share |hold |challenge |navigate |role-plays? )?/i, '')
        .split(/[\s()\/,+]+/)
        .filter(w => w.length > 3);

    const wantedTokens = new Set(wanted.flatMap(tokenize));
    const strengthTokens = new Set(strengths.flatMap(tokenize));
    if (wantedTokens.size === 0) return null;

    const overlap = [...wantedTokens].filter(t => strengthTokens.has(t)).length;
    return Math.min(1, overlap / wantedTokens.size);
  })();

  const scores = [
    comparePair(mentee.preferred_mentor_style, mentorSessionStyle),
    comparePair(mentee.preferred_mentor_energy, mentor.mentor_energy),
    comparePair(mentee.feedback_preference, mentor.feedback_style),
    comparePair(mentee.meeting_frequency, mentor.meeting_frequency),
    styleAlignmentScore,
  ].filter((s): s is number => s !== null);

  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Proficiency gap score — rewards mentors with higher proficiency than their mentee.
 * Gap 1–2: 1.0 (ideal), Gap 3+: 0.8, Same: 0.4, Negative: 0.1
 */
function calculateProficiencyGap(mentee: MenteeData, mentor: MentorData): number {
  if (!mentee.primary_proficiency || !mentor.primary_proficiency) return 0;

  const gap = mentor.primary_proficiency - mentee.primary_proficiency;
  if (gap >= 1 && gap <= 2) return 1.0;
  if (gap >= 3) return 0.8;
  if (gap === 0) return 0.4;
  return 0.1; // Mentee has higher proficiency than mentor
}

/**
 * Department diversity — rewards cross-department matches.
 * Different department: 1.0, Same department: 0.0
 */
function calculateDepartmentDiversity(mentee: MenteeData, mentor: MentorData): number {
  if (!mentee.department || !mentor.department) return 0;
  return mentee.department.toLowerCase() !== mentor.department.toLowerCase() ? 1.0 : 0;
}

// Calculate final match score with new capability-based weights
/**
 * Calculate match score with optional LLM pair score.
 * For V3 data, LLM content score replaces capability_match and domain_match.
 */
export function calculateMatchScore(
  mentee: MenteeData,
  mentor: MentorData,
  llmScore?: LLMPairScore,
): MatchScore {
  const features = calculateFeatures(mentee, mentor);
  const version = detectDataVersion(mentee, mentor);

  // Inject LLM scores if available (V3 path)
  if (llmScore) {
    features.llm_content_score = llmScore.overall_score / 10; // normalize 0-10 → 0-1
    features.llm_reasoning = llmScore.reasoning;
  }

  let totalScore: number;

  if (version === 'v3' && features.llm_content_score != null) {
    // V3 weights: llm(45) + semantic(20) + seniority(12) + compatibility(10) + department(8) + tz(5) = 100
    totalScore = Math.max(0, Math.min(100,
      45 * features.llm_content_score +
      20 * features.semantic_similarity +
      12 * features.role_seniority_fit +
      10 * features.compatibility_score +
      8 * features.department_diversity +
      5 * features.tz_overlap_bonus -
      10 * features.capacity_penalty
    ));
  } else if (version === 'v3') {
    // V3 without LLM scores (fallback): semantic takes more weight
    totalScore = Math.max(0, Math.min(100,
      40 * features.semantic_similarity +
      20 * features.role_seniority_fit +
      15 * features.compatibility_score +
      15 * features.department_diversity +
      10 * features.tz_overlap_bonus -
      10 * features.capacity_penalty
    ));
  } else {
    // V2/V1 weights: capability(45) + semantic(30) + domain(5) + seniority(10) + tz(5) + compat(5) = 100
    totalScore = Math.max(0, Math.min(100,
      45 * features.capability_match +
      30 * features.semantic_similarity +
      5 * features.domain_match +
      10 * features.role_seniority_fit +
      5 * features.tz_overlap_bonus +
      5 * features.compatibility_score -
      10 * features.capacity_penalty
    ));
  }

  // Compute timezone distance once for reasons and risks
  const tzDistance = calculateTimezoneDistance(mentee.location_timezone, mentor.location_timezone);

  // Generate reasons for the match
  const reasons: string[] = [];

  // V3 LLM-based reasons
  if (features.llm_content_score != null && features.llm_content_score > 0) {
    const llmPct = Math.round(features.llm_content_score * 100);
    if (features.llm_content_score >= 0.7) {
      reasons.push(`Strong LLM content match (${llmPct}%): ${features.llm_reasoning || 'Good alignment between mentee needs and mentor offerings'}`);
    } else if (features.llm_content_score >= 0.5) {
      reasons.push(`Moderate LLM content match (${llmPct}%): ${features.llm_reasoning || 'Some alignment found'}`);
    }
  }

  // V2/V1 capability-based reasons
  if (version !== 'v3') {
    if (features.capability_match >= 1.0) {
      reasons.push(`Exact primary capability match: both share "${mentee.primary_capability || mentee.topics_to_learn?.[0] || 'shared area'}" as their primary focus`);
    } else if (features.capability_match >= 0.8) {
      reasons.push(`Mentee wants "${mentee.primary_capability}" \u2014 mentor offers it as a secondary capability`);
    } else if (features.capability_match >= 0.55) {
      reasons.push(`Related capability cluster: mentee wants "${mentee.primary_capability}", mentor's primary is "${mentor.primary_capability}" (same theme family)`);
    } else if (features.capability_match >= 0.4) {
      reasons.push(`Related capability cluster via secondary: mentee wants "${mentee.primary_capability}", mentor has related secondary expertise`);
    }
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

  // Advanced factor reasons
  if (features.compatibility_score >= 0.75) {
    reasons.push(`Strong compatibility: well-aligned on mentoring style, energy, and feedback preferences`);
  } else if (features.compatibility_score > 0 && features.compatibility_score < 0.25) {
    risks.push(`Low compatibility: misaligned preferences for mentoring style, energy, or feedback`);
  }
  if (features.proficiency_gap >= 0.8) {
    reasons.push(`Good proficiency gap: mentor's skill level is well above mentee's (ideal for growth)`);
  } else if (features.proficiency_gap > 0 && features.proficiency_gap <= 0.1) {
    risks.push(`Proficiency concern: mentee may be at a higher skill level than mentor`);
  }
  if (features.department_diversity === 1.0 && mentee.department && mentor.department) {
    reasons.push(`Cross-department match: ${mentee.department} / ${mentor.department} (fresh perspectives)`);
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
    icebreaker,
    ai_explanation: features.llm_reasoning,
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
// LLM-ENHANCED MATCHING (V3)
// ============================================================================

/**
 * Find top matches with pre-computed LLM scores.
 * For V3 data, the LLM scores are injected into the match calculation.
 */
export function findTopMatchesWithLLM(
  mentee: MenteeData,
  mentors: MentorData[],
  llmScores: Map<string, LLMPairScore>,
  maxResults: number = 3,
): { mentor_id: string; mentor_name?: string; score: MatchScore }[] {
  const validMatches = mentors
    .filter(mentor => applyHardFilters(mentee, mentor))
    .map(mentor => {
      const llmKey = `${mentee.id}::${mentor.id}`;
      const llmScore = llmScores.get(llmKey);
      return {
        mentor,
        score: calculateMatchScore(mentee, mentor, llmScore),
      };
    })
    .sort(compareMentorMatches)
    .slice(0, maxResults);

  return validMatches.map(match => ({
    mentor_id: match.mentor.id,
    mentor_name: match.mentor.name || match.mentor.id,
    score: match.score,
  }));
}

/**
 * Batch matching with LLM scores for V3 data.
 * Same greedy assignment as performBatchMatching but uses LLM pair scores.
 */
export function performBatchMatchingWithLLM(
  mentees: MenteeData[],
  mentors: MentorData[],
  llmScores: Map<string, LLMPairScore>,
): MatchingOutput {
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

    const recommendations = findTopMatchesWithLLM(mentee, availableMentors, llmScores, 3);
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
    mode: 'batch',
    stats,
    results,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// ENHANCED MATCHING WITH CONFIGURABLE MODELS
// ============================================================================

/**
 * Calculate match score using a configurable matching model.
 * Supports V3 LLM scores when llmScore is provided and weights.llm_content > 0.
 */
export function calculateMatchScoreWithModel(
  mentee: MenteeData,
  mentor: MentorData,
  model: MatchingModel,
  llmScore?: LLMPairScore,
): EnhancedMatchScore {
  const features = calculateFeatures(mentee, mentor);
  const weights = model.weights;

  // Inject LLM scores if available
  if (llmScore) {
    features.llm_content_score = llmScore.overall_score / 10; // normalize 0-10 → 0-1
    features.llm_reasoning = llmScore.reasoning;
  }

  // Calculate individual weighted scores
  const scoreBreakdown: ScoreBreakdown[] = [];

  // LLM Content Match (V3 — only if weight > 0)
  const llmWeight = weights.llm_content ?? 0;
  if (llmWeight > 0) {
    const llmRaw = features.llm_content_score ?? 0;
    scoreBreakdown.push({
      criterion: 'llm_content',
      criterion_name: 'AI Content Match',
      raw_score: llmRaw,
      max_possible: 1,
      weight: llmWeight,
      weighted_score: llmRaw * llmWeight,
    });
  }

  // Capability Match (V2/V1 — only if weight > 0)
  if (weights.capability > 0) {
    scoreBreakdown.push({
      criterion: 'capability',
      criterion_name: 'Capability Match',
      raw_score: features.capability_match,
      max_possible: 1,
      weight: weights.capability,
      weighted_score: features.capability_match * weights.capability,
    });
  }

  // Always-included core weights
  scoreBreakdown.push(
    {
      criterion: 'semantic',
      criterion_name: 'Semantic Similarity',
      raw_score: features.semantic_similarity,
      max_possible: 1,
      weight: weights.semantic,
      weighted_score: features.semantic_similarity * weights.semantic,
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
  );

  // Domain Match (only if weight > 0)
  if (weights.domain > 0) {
    scoreBreakdown.push({
      criterion: 'domain',
      criterion_name: 'Domain Match',
      raw_score: features.domain_match,
      max_possible: 1,
      weight: weights.domain,
      weighted_score: features.domain_match * weights.domain,
    });
  }

  // Advanced weights (only included in breakdown if weight > 0)
  const compatibilityWeight = weights.compatibility ?? 0;
  const proficiencyWeight = weights.proficiency_gap ?? 0;
  const departmentWeight = weights.department_diversity ?? 0;

  if (compatibilityWeight > 0) {
    scoreBreakdown.push({
      criterion: 'compatibility',
      criterion_name: 'Compatibility',
      raw_score: features.compatibility_score,
      max_possible: 1,
      weight: compatibilityWeight,
      weighted_score: features.compatibility_score * compatibilityWeight,
    });
  }
  if (proficiencyWeight > 0) {
    scoreBreakdown.push({
      criterion: 'proficiency_gap',
      criterion_name: 'Proficiency Gap',
      raw_score: features.proficiency_gap,
      max_possible: 1,
      weight: proficiencyWeight,
      weighted_score: features.proficiency_gap * proficiencyWeight,
    });
  }
  if (departmentWeight > 0) {
    scoreBreakdown.push({
      criterion: 'department_diversity',
      criterion_name: 'Department Diversity',
      raw_score: features.department_diversity,
      max_possible: 1,
      weight: departmentWeight,
      weighted_score: features.department_diversity * departmentWeight,
    });
  }

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

  // Check for constraint violations
  const constraintViolations: ConstraintViolation[] = [];
  let needsApproval = false;
  let approvalReason: string | undefined;

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

  // Only flag no-capability for V2/V1 (V3 uses LLM content instead)
  if (weights.capability > 0 && features.capability_match === 0) {
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
    alternative_mentors: [],
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
  // Advanced factors use default 0 weight in this path (no effect)
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
 * Convert EnhancedMatchScore to MatchScore for compatibility with existing result types.
 */
function enhancedToMatchScore(
  mentee: MenteeData,
  mentor: MentorData,
  enhanced: EnhancedMatchScore,
  features: MatchingFeatures,
): MatchScore {
  // Build reasons and risks from the model's actual scoring, not the old hardcoded logic
  const reasons: string[] = [];
  const risks: string[] = [];

  // LLM content match
  if (features.llm_content_score != null && features.llm_content_score > 0) {
    const llmPct = Math.round(features.llm_content_score * 100);
    if (features.llm_content_score >= 0.7) {
      reasons.push(`Strong AI-assessed compatibility (${llmPct}%)`);
    } else if (features.llm_content_score >= 0.5) {
      reasons.push(`Moderate AI-assessed compatibility (${llmPct}%)`);
    } else {
      risks.push(`Low AI-assessed compatibility (${llmPct}%)`);
    }
    if (features.llm_reasoning) {
      reasons.push(features.llm_reasoning);
    }
  }

  // Semantic similarity
  if (features.semantic_similarity >= 0.7) {
    reasons.push(`Strong goals alignment (${Math.round(features.semantic_similarity * 100)}%)`);
  } else if (features.semantic_similarity >= 0.4) {
    reasons.push(`Moderate goals alignment`);
  } else if (features.semantic_similarity < 0.2) {
    risks.push(`Low goals alignment`);
  }

  // Capability match (V2)
  if (features.capability_match > 0) {
    if (features.capability_match >= 0.8) {
      reasons.push(`Excellent capability match`);
    } else if (features.capability_match >= 0.5) {
      reasons.push(`Good capability overlap`);
    }
  }

  // Seniority
  if (features.role_seniority_fit >= 0.8) {
    reasons.push(`Good seniority gap for mentoring`);
  } else if (features.role_seniority_fit < 0.3) {
    risks.push(`Limited seniority difference`);
  }

  // Department diversity
  if (features.department_diversity > 0) {
    reasons.push(`Cross-department perspective`);
  }

  // Compatibility
  if (features.compatibility_score >= 0.7) {
    reasons.push(`Compatible working styles`);
  }

  // Timezone
  if (features.tz_overlap_bonus >= 0.8) {
    reasons.push(`Same timezone`);
  } else if (features.tz_overlap_bonus < 0.3) {
    risks.push(`Large timezone difference`);
  }

  // Capacity
  if (mentor.capacity_remaining <= 0) {
    risks.push(`Mentor at capacity`);
  } else if (mentor.capacity_remaining === 1) {
    risks.push(`Mentor has only 1 slot left`);
  }

  return {
    total_score: enhanced.total_score,
    features,
    reasons,
    risks,
    logistics: {
      timezone_mentee: mentee.timezone || mentee.country,
      timezone_mentor: mentor.timezone || mentor.country,
      languages_shared: [],
      capacity_remaining: mentor.capacity_remaining,
    },
    is_embedding_based: true,
  };
}

/**
 * Calculate match score using a model with embedding-enhanced semantic similarity.
 */
function calculateMatchScoreWithModelAndEmbeddings(
  mentee: MenteeData,
  mentor: MentorData,
  model: MatchingModel,
  embeddingCache: EmbeddingCache,
  llmScore?: LLMPairScore,
): MatchScore {
  const features = calculateFeaturesWithEmbeddings(mentee, mentor, embeddingCache);

  // Inject LLM scores if available
  if (llmScore) {
    features.llm_content_score = llmScore.overall_score / 10;
    features.llm_reasoning = llmScore.reasoning;
  }

  const enhanced = calculateMatchScoreWithModel(mentee, mentor, model, llmScore);
  return enhancedToMatchScore(mentee, mentor, enhanced, features);
}

/**
 * Find top matches using a model with embedding-enhanced scoring.
 */
function findTopMatchesWithModelAndEmbeddings(
  mentee: MenteeData,
  mentors: MentorData[],
  model: MatchingModel,
  embeddingCache: EmbeddingCache,
  llmScores?: Map<string, LLMPairScore>,
  maxResults: number = 3,
): { mentor_id: string; mentor_name?: string; score: MatchScore }[] {
  const validMatches = mentors
    .filter(mentor => applyHardFilters(mentee, mentor, model.filters))
    .map(mentor => {
      const llmKey = `${mentee.id}::${mentor.id}`;
      const llmScore = llmScores?.get(llmKey);
      return {
        mentor,
        score: calculateMatchScoreWithModelAndEmbeddings(mentee, mentor, model, embeddingCache, llmScore),
      };
    })
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
 * When a model is provided, uses its configurable weights instead of hardcoded defaults.
 * Falls back to the original synchronous matching if embedding generation fails.
 */
export async function performBatchMatchingAsync(
  mentees: MenteeData[],
  mentors: MentorData[],
  cohortId: string,
  model?: MatchingModel,
  onProgress?: (progress: MatchingProgress) => void,
): Promise<{ output: MatchingOutput; usedEmbeddings: boolean }> {
  let embeddingCache: EmbeddingCache | null = null;

  onProgress?.({ step: 'embeddings', stepLabel: 'Computing AI embeddings...', stepProgress: 0 });

  try {
    embeddingCache = await getOrComputeEmbeddings(cohortId, mentees, mentors);
  } catch (error) {
    console.warn('Embedding generation failed, falling back to keyword matching:', error);
  }

  if (!embeddingCache) {
    onProgress?.({ step: 'done', stepLabel: 'Done', stepProgress: 100 });
    return { output: performBatchMatching(mentees, mentors), usedEmbeddings: false };
  }

  onProgress?.({ step: 'embeddings', stepLabel: 'Embeddings ready', stepProgress: 100 });

  // Run LLM pairwise scoring when the model uses llm_content weight
  let llmScores: Map<string, LLMPairScore> | undefined;
  if (model && (model.weights.llm_content ?? 0) > 0) {
    try {
      const pairs: [MenteeData, MentorData][] = [];
      for (const mentee of mentees) {
        for (const mentor of mentors) {
          if (applyHardFilters(mentee, mentor, model.filters)) {
            pairs.push([mentee, mentor]);
          }
        }
      }
      if (pairs.length > 0) {
        console.log(`[Matching] Starting LLM scoring for ${pairs.length} pairs...`);
        onProgress?.({ step: 'llm_scoring', stepLabel: `Scoring ${pairs.length} pairs with AI...`, stepProgress: 0, llmDetail: { completed: 0, total: pairs.length } });
        llmScores = await scorePairsWithLLM(pairs, (llmProgress: LLMScoringProgress) => {
          const pct = llmProgress.total > 0 ? Math.round((llmProgress.completed / llmProgress.total) * 100) : 0;
          onProgress?.({ step: 'llm_scoring', stepLabel: `AI scoring pairs (${llmProgress.completed}/${llmProgress.total})...`, stepProgress: pct, llmDetail: { completed: llmProgress.completed, total: llmProgress.total } });
        });
        console.log(`[Matching] LLM scoring complete: ${llmScores.size} scores received for ${pairs.length} pairs`);
        if (llmScores.size === 0) {
          console.error('[Matching] LLM scoring returned 0 scores — the score-pairs edge function may be failing. Check browser console for errors.');
        }
      }
    } catch (error) {
      console.error('[Matching] LLM scoring failed, proceeding without LLM scores:', error);
    }
  }

  const llmScoreCount = llmScores?.size ?? 0;
  onProgress?.({ step: 'scoring', stepLabel: `Computing final scores${llmScoreCount > 0 ? ` (${llmScoreCount} AI scores)` : ' (no AI scores)'}...`, stepProgress: 0 });

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

    // Use model-aware scoring when a model is provided, otherwise use default embedding scoring
    const recommendations = model
      ? findTopMatchesWithModelAndEmbeddings(mentee, availableMentors, model, embeddingCache!, llmScores, 3)
      : findTopMatchesWithEmbeddings(mentee, availableMentors, embeddingCache!, 3);
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

  onProgress?.({ step: 'done', stepLabel: 'Matching complete', stepProgress: 100 });

  return {
    output: { mode: "batch", stats, results },
    usedEmbeddings: true,
  };
}

/**
 * Async top-3 matching using OpenAI embeddings for semantic similarity.
 * When a model is provided, uses its configurable weights instead of hardcoded defaults.
 * Falls back to the original synchronous matching if embedding generation fails.
 */
export async function performTop3MatchingAsync(
  mentees: MenteeData[],
  mentors: MentorData[],
  cohortId: string,
  model?: MatchingModel,
  onProgress?: (progress: MatchingProgress) => void,
): Promise<{ output: MatchingOutput; usedEmbeddings: boolean }> {
  let embeddingCache: EmbeddingCache | null = null;

  onProgress?.({ step: 'embeddings', stepLabel: 'Computing AI embeddings...', stepProgress: 0 });

  try {
    embeddingCache = await getOrComputeEmbeddings(cohortId, mentees, mentors);
  } catch (error) {
    console.warn('Embedding generation failed, falling back to keyword matching:', error);
  }

  if (!embeddingCache) {
    onProgress?.({ step: 'done', stepLabel: 'Done', stepProgress: 100 });
    return { output: performTop3Matching(mentees, mentors), usedEmbeddings: false };
  }

  onProgress?.({ step: 'embeddings', stepLabel: 'Embeddings ready', stepProgress: 100 });

  // Run LLM pairwise scoring when the model uses llm_content weight
  let llmScores: Map<string, LLMPairScore> | undefined;
  if (model && (model.weights.llm_content ?? 0) > 0) {
    try {
      const pairs: [MenteeData, MentorData][] = [];
      for (const mentee of mentees) {
        for (const mentor of mentors) {
          if (applyHardFilters(mentee, mentor, model.filters)) {
            pairs.push([mentee, mentor]);
          }
        }
      }
      if (pairs.length > 0) {
        console.log(`[Matching] Starting LLM scoring for ${pairs.length} pairs...`);
        onProgress?.({ step: 'llm_scoring', stepLabel: `Scoring ${pairs.length} pairs with AI...`, stepProgress: 0, llmDetail: { completed: 0, total: pairs.length } });
        llmScores = await scorePairsWithLLM(pairs, (llmProgress: LLMScoringProgress) => {
          const pct = llmProgress.total > 0 ? Math.round((llmProgress.completed / llmProgress.total) * 100) : 0;
          onProgress?.({ step: 'llm_scoring', stepLabel: `AI scoring pairs (${llmProgress.completed}/${llmProgress.total})...`, stepProgress: pct, llmDetail: { completed: llmProgress.completed, total: llmProgress.total } });
        });
        console.log(`[Matching] LLM scoring complete: ${llmScores.size} scores received for ${pairs.length} pairs`);
        if (llmScores.size === 0) {
          console.error('[Matching] LLM scoring returned 0 scores — the score-pairs edge function may be failing. Check browser console for errors.');
        }
      }
    } catch (error) {
      console.error('[Matching] LLM scoring failed, proceeding without LLM scores:', error);
    }
  }

  const llmScoreCount = llmScores?.size ?? 0;
  onProgress?.({ step: 'scoring', stepLabel: `Computing final scores${llmScoreCount > 0 ? ` (${llmScoreCount} AI scores)` : ' (no AI scores)'}...`, stepProgress: 0 });

  const results: MatchingResult[] = [];
  const stats: MatchingStats = {
    mentees_total: mentees.length,
    mentors_total: mentors.length,
    pairs_evaluated: mentees.length * mentors.length,
    after_filters: 0,
  };

  mentees.forEach(mentee => {
    const recommendations = model
      ? findTopMatchesWithModelAndEmbeddings(mentee, mentors, model, embeddingCache!, llmScores, 3)
      : findTopMatchesWithEmbeddings(mentee, mentors, embeddingCache!, 3);
    stats.after_filters += recommendations.length;

    results.push({
      mentee_id: mentee.id,
      mentee_name: mentee.name || mentee.id,
      recommendations,
    });
  });

  onProgress?.({ step: 'done', stepLabel: 'Matching complete', stepProgress: 100 });

  return {
    output: { mode: "top3_per_mentee", stats, results },
    usedEmbeddings: true,
  };
}