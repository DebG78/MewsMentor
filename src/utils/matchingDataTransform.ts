import { MatchingOutput, MatchScore, MentorData } from "@/types/mentoring";

/**
 * Mentor-centric match data structure
 * Transforms mentee-centric MatchingOutput to show mentors as primary entities
 */
export interface MentorCentricMatch {
  mentor_id: string;
  mentor_name: string;
  mentor_role?: string;
  location_timezone?: string;
  capacity_remaining: number;
  potential_mentees: PotentialMentee[];
}

export interface PotentialMentee {
  mentee_id: string;
  mentee_name: string;
  mentee_role?: string;
  score: MatchScore;
  rank_for_this_mentee: number; // 1 = top choice, 2 = second, 3 = third
}

/**
 * Transform mentee-centric matching output to mentor-centric format
 *
 * @param matchingOutput - The original mentee-centric matching results
 * @param mentors - Array of mentor data for additional info (role, timezone, etc.)
 * @returns Array of MentorCentricMatch, sorted by number of potential mentees (descending)
 */
export function transformToMentorCentric(
  matchingOutput: MatchingOutput,
  mentors: MentorData[],
  maxPerMentor?: number
): MentorCentricMatch[] {
  // Create a map to collect mentees for each mentor
  const mentorMap = new Map<string, MentorCentricMatch>();

  // Initialize all mentors from the mentor data
  mentors.forEach(mentor => {
    mentorMap.set(mentor.id, {
      mentor_id: mentor.id,
      mentor_name: mentor.name || mentor.id,
      mentor_role: mentor.role,
      location_timezone: mentor.location_timezone,
      capacity_remaining: mentor.capacity_remaining,
      potential_mentees: []
    });
  });

  // Pivot the data: for each mentee's recommendations, add to the mentor's potential list
  // In batch mode, only include the proposed assignment (the single best match)
  const isBatchMode = matchingOutput.mode === "batch";

  matchingOutput.results.forEach(result => {
    const recsToUse = isBatchMode && result.proposed_assignment?.mentor_id
      ? result.recommendations.filter(rec => rec.mentor_id === result.proposed_assignment?.mentor_id)
      : result.recommendations;

    recsToUse.forEach((rec, idx) => {
      let mentorEntry = mentorMap.get(rec.mentor_id);

      // If mentor not in map (shouldn't happen but handle gracefully), create entry
      if (!mentorEntry) {
        mentorEntry = {
          mentor_id: rec.mentor_id,
          mentor_name: rec.mentor_name || rec.mentor_id,
          capacity_remaining: rec.score.logistics.capacity_remaining || 0,
          potential_mentees: []
        };
        mentorMap.set(rec.mentor_id, mentorEntry);
      }

      // Update mentor name if available from recommendation
      if (rec.mentor_name) {
        mentorEntry.mentor_name = rec.mentor_name;
      }

      // Add this mentee to the mentor's potential list
      mentorEntry.potential_mentees.push({
        mentee_id: result.mentee_id,
        mentee_name: result.mentee_name || result.mentee_id,
        score: rec.score,
        rank_for_this_mentee: isBatchMode ? 1 : idx + 1 // batch = always the #1 pick
      });
    });
  });

  // Convert map to array and sort each mentor's mentees by score (descending)
  const mentorList = Array.from(mentorMap.values());

  mentorList.forEach(mentor => {
    mentor.potential_mentees.sort((a, b) => b.score.total_score - a.score.total_score);
    if (maxPerMentor && mentor.potential_mentees.length > maxPerMentor) {
      mentor.potential_mentees = mentor.potential_mentees.slice(0, maxPerMentor);
    }
  });

  // Sort mentors by number of potential mentees (most matches first), then by name
  mentorList.sort((a, b) => {
    if (b.potential_mentees.length !== a.potential_mentees.length) {
      return b.potential_mentees.length - a.potential_mentees.length;
    }
    return a.mentor_name.localeCompare(b.mentor_name);
  });

  return mentorList;
}

/**
 * Get the score breakdown as an array of labeled components for visualization
 */
export interface ScoreComponent {
  key: string;
  label: string;
  description: string;
  value: number;
  maxValue: number;
  percentage: number;
  color: string;
}

export function getScoreComponents(score: MatchScore): ScoreComponent[] {
  const features = score.features;

  return [
    {
      key: 'topics',
      label: 'Topics',
      description: 'How well the mentor\'s expertise matches what the mentee wants to learn',
      value: Math.round(features.topics_overlap * 40),
      maxValue: 40,
      percentage: features.topics_overlap * 100,
      color: 'bg-blue-500'
    },
    {
      key: 'semantic',
      label: score.is_embedding_based ? 'Goals Alignment (AI)' : 'Goals Alignment',
      description: 'How closely the mentee\'s goals align with what the mentor offers',
      value: Math.round(features.semantic_similarity * 20),
      maxValue: 20,
      percentage: features.semantic_similarity * 100,
      color: 'bg-purple-500'
    },
    {
      key: 'industry',
      label: 'Industry',
      description: 'Whether mentor and mentee work in the same or related industries',
      value: Math.round(features.industry_overlap * 15),
      maxValue: 15,
      percentage: features.industry_overlap * 100,
      color: 'bg-green-500'
    },
    {
      key: 'seniority',
      label: 'Seniority Fit',
      description: 'Whether the mentor has enough seniority gap to guide the mentee',
      value: Math.round(features.role_seniority_fit * 10),
      maxValue: 10,
      percentage: features.role_seniority_fit * 100,
      color: 'bg-yellow-500'
    },
    {
      key: 'timezone',
      label: 'Timezone',
      description: 'Whether they can easily schedule meetings in overlapping hours',
      value: Math.round(features.tz_overlap_bonus * 5),
      maxValue: 5,
      percentage: features.tz_overlap_bonus * 100,
      color: 'bg-cyan-500'
    },
    {
      key: 'language',
      label: 'Language',
      description: 'Whether they share a common language for communication',
      value: Math.round(features.language_bonus * 5),
      maxValue: 5,
      percentage: features.language_bonus * 100,
      color: 'bg-pink-500'
    }
  ];
}

/**
 * Check if a mentee is already selected for any mentor
 */
export function getMenteeAssignments(
  selections: Map<string, Set<string>>
): Map<string, string[]> {
  // Returns: mentee_id -> array of mentor_ids they're selected for
  const menteeToMentors = new Map<string, string[]>();

  selections.forEach((menteeSet, mentorId) => {
    menteeSet.forEach(menteeId => {
      const existing = menteeToMentors.get(menteeId) || [];
      existing.push(mentorId);
      menteeToMentors.set(menteeId, existing);
    });
  });

  return menteeToMentors;
}

/**
 * Validate selections - check for conflicts and capacity issues
 */
export interface SelectionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflictingMentees: Set<string>; // Mentees selected for multiple mentors
  overCapacityMentors: Set<string>; // Mentors with too many selections
}

export function validateSelections(
  selections: Map<string, Set<string>>,
  mentorCapacities: Map<string, number>
): SelectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflictingMentees = new Set<string>();
  const overCapacityMentors = new Set<string>();

  // Check for mentees assigned to multiple mentors
  const menteeAssignments = getMenteeAssignments(selections);
  menteeAssignments.forEach((mentorIds, menteeId) => {
    if (mentorIds.length > 1) {
      conflictingMentees.add(menteeId);
      errors.push(`Mentee assigned to multiple mentors`);
    }
  });

  // Check capacity constraints
  selections.forEach((menteeSet, mentorId) => {
    const capacity = mentorCapacities.get(mentorId) || 0;
    if (menteeSet.size > capacity) {
      overCapacityMentors.add(mentorId);
      errors.push(`Mentor over capacity`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: [...new Set(errors)], // Deduplicate
    warnings,
    conflictingMentees,
    overCapacityMentors
  };
}
