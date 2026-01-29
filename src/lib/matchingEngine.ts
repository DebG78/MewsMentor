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