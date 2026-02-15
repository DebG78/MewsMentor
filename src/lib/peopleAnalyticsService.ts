import type { Cohort, MenteeData, MentorData, MatchingResult, MatchingFeatures } from '@/types/mentoring';

// ============================================================================
// TOPIC DEMAND VS SUPPLY
// ============================================================================

export interface TopicDemandSupply {
  topic: string;
  demand: number; // mentees wanting this topic
  supply: number; // mentors offering this topic
  gap: number;    // demand - supply (positive = unmet demand)
}

export function getTopicDemandSupply(cohorts: Cohort[]): TopicDemandSupply[] {
  const demandMap = new Map<string, number>();
  const supplyMap = new Map<string, number>();

  for (const cohort of cohorts) {
    for (const mentee of cohort.mentees) {
      // New survey: use primary/secondary capability
      if (mentee.primary_capability) {
        demandMap.set(mentee.primary_capability, (demandMap.get(mentee.primary_capability) || 0) + 1);
        if (mentee.secondary_capability) {
          demandMap.set(mentee.secondary_capability, (demandMap.get(mentee.secondary_capability) || 0) + 1);
        }
      } else {
        // Legacy: use topics_to_learn
        for (const topic of mentee.topics_to_learn || []) {
          demandMap.set(topic, (demandMap.get(topic) || 0) + 1);
        }
      }
    }
    for (const mentor of cohort.mentors) {
      // New survey: use primary capability + secondary capabilities array
      if (mentor.primary_capability) {
        supplyMap.set(mentor.primary_capability, (supplyMap.get(mentor.primary_capability) || 0) + 1);
        for (const cap of mentor.secondary_capabilities || []) {
          supplyMap.set(cap, (supplyMap.get(cap) || 0) + 1);
        }
      } else {
        // Legacy: use topics_to_mentor
        for (const topic of mentor.topics_to_mentor || []) {
          supplyMap.set(topic, (supplyMap.get(topic) || 0) + 1);
        }
      }
    }
  }

  const allTopics = new Set([...demandMap.keys(), ...supplyMap.keys()]);

  return Array.from(allTopics)
    .map(topic => ({
      topic,
      demand: demandMap.get(topic) || 0,
      supply: supplyMap.get(topic) || 0,
      gap: (demandMap.get(topic) || 0) - (supplyMap.get(topic) || 0),
    }))
    .sort((a, b) => b.gap - a.gap);
}

// ============================================================================
// EXPERIENCE DISTRIBUTION
// ============================================================================

export interface ExperienceBand {
  band: string;
  mentors: number;
  mentees: number;
}

function getExperienceBand(years: string): string {
  const num = parseInt(years);
  if (isNaN(num)) return 'Unknown';
  if (num <= 2) return '0-2 years';
  if (num <= 5) return '3-5 years';
  if (num <= 10) return '6-10 years';
  if (num <= 15) return '11-15 years';
  return '15+ years';
}

export function getExperienceDistribution(cohorts: Cohort[]): ExperienceBand[] {
  const bands = new Map<string, { mentors: number; mentees: number }>();

  // Check if any cohort uses new seniority bands (S1, S2, M1, etc.)
  const hasNewFormat = cohorts.some(c =>
    c.mentees.some(m => m.seniority_band && /^[SMDVL]/.test(m.seniority_band)) ||
    c.mentors.some(m => m.seniority_band && /^[SMDVL]/.test(m.seniority_band))
  );

  if (hasNewFormat) {
    const orderedBands = ['S1', 'S2', 'M1', 'M2', 'D1', 'D2', 'VP', 'SVP', 'LT', 'Unknown'];
    for (const band of orderedBands) {
      bands.set(band, { mentors: 0, mentees: 0 });
    }

    for (const cohort of cohorts) {
      for (const mentee of cohort.mentees) {
        const band = mentee.seniority_band || 'Unknown';
        const entry = bands.get(band) || { mentors: 0, mentees: 0 };
        entry.mentees++;
        bands.set(band, entry);
      }
      for (const mentor of cohort.mentors) {
        const band = mentor.seniority_band || 'Unknown';
        const entry = bands.get(band) || { mentors: 0, mentees: 0 };
        entry.mentors++;
        bands.set(band, entry);
      }
    }

    return orderedBands
      .map(band => ({
        band,
        mentors: bands.get(band)?.mentors || 0,
        mentees: bands.get(band)?.mentees || 0,
      }))
      .filter(b => b.mentors > 0 || b.mentees > 0);
  }

  // Legacy format: use experience_years
  const orderedBands = ['0-2 years', '3-5 years', '6-10 years', '11-15 years', '15+ years', 'Unknown'];
  for (const band of orderedBands) {
    bands.set(band, { mentors: 0, mentees: 0 });
  }

  for (const cohort of cohorts) {
    for (const mentee of cohort.mentees) {
      const band = getExperienceBand(mentee.experience_years);
      const entry = bands.get(band) || { mentors: 0, mentees: 0 };
      entry.mentees++;
      bands.set(band, entry);
    }
    for (const mentor of cohort.mentors) {
      const band = getExperienceBand(mentor.experience_years);
      const entry = bands.get(band) || { mentors: 0, mentees: 0 };
      entry.mentors++;
      bands.set(band, entry);
    }
  }

  return orderedBands
    .map(band => ({
      band,
      mentors: bands.get(band)?.mentors || 0,
      mentees: bands.get(band)?.mentees || 0,
    }))
    .filter(b => b.mentors > 0 || b.mentees > 0);
}

// ============================================================================
// MENTOR UTILIZATION
// ============================================================================

export interface MentorUtilization {
  mentor_id: string;
  mentor_name: string;
  cohort_name: string;
  capacity: number;
  assigned: number;
  remaining: number;
}

export function getMentorUtilization(cohorts: Cohort[]): MentorUtilization[] {
  const results: MentorUtilization[] = [];

  for (const cohort of cohorts) {
    if (cohort.status !== 'active' && cohort.status !== 'completed') continue;

    const assignedCounts = new Map<string, number>();
    if (cohort.matches?.results) {
      for (const result of cohort.matches.results) {
        if (result.proposed_assignment?.mentor_id) {
          const mentorId = result.proposed_assignment.mentor_id;
          assignedCounts.set(mentorId, (assignedCounts.get(mentorId) || 0) + 1);
        }
      }
    }

    for (const mentor of cohort.mentors) {
      const assigned = assignedCounts.get(mentor.id) || 0;
      const capacity = mentor.capacity_remaining + assigned; // total capacity = remaining + already assigned
      results.push({
        mentor_id: mentor.id,
        mentor_name: mentor.name || mentor.id.slice(0, 8),
        cohort_name: cohort.name,
        capacity,
        assigned,
        remaining: capacity - assigned,
      });
    }
  }

  return results.sort((a, b) => b.remaining - a.remaining);
}

// ============================================================================
// MATCH QUALITY
// ============================================================================

export interface MatchScoreBucket {
  range: string;
  count: number;
}

export interface FeatureContribution {
  feature: string;
  avgValue: number;
}

export interface CohortMatchQuality {
  cohort_id: string;
  cohort_name: string;
  avgScore: number;
  matchCount: number;
}

export function getMatchScoreDistribution(cohort: Cohort): MatchScoreBucket[] {
  if (!cohort.matches?.results) return [];

  const buckets = [
    { range: '0-20', min: 0, max: 20, count: 0 },
    { range: '21-40', min: 21, max: 40, count: 0 },
    { range: '41-60', min: 41, max: 60, count: 0 },
    { range: '61-80', min: 61, max: 80, count: 0 },
    { range: '81-100', min: 81, max: 100, count: 0 },
  ];

  for (const result of cohort.matches.results) {
    if (result.proposed_assignment?.mentor_id) {
      const rec = result.recommendations.find(
        r => r.mentor_id === result.proposed_assignment?.mentor_id
      );
      if (rec) {
        const score = rec.score.total_score;
        const bucket = buckets.find(b => score >= b.min && score <= b.max);
        if (bucket) bucket.count++;
      }
    }
  }

  return buckets;
}

export function getFeatureContributions(cohort: Cohort): FeatureContribution[] {
  if (!cohort.matches?.results) return [];

  const featureSums: Record<string, { sum: number; count: number }> = {
    capability_match: { sum: 0, count: 0 },
    semantic_similarity: { sum: 0, count: 0 },
    domain_match: { sum: 0, count: 0 },
    role_seniority_fit: { sum: 0, count: 0 },
    tz_overlap_bonus: { sum: 0, count: 0 },
  };

  for (const result of cohort.matches.results) {
    if (result.proposed_assignment?.mentor_id) {
      const rec = result.recommendations.find(
        r => r.mentor_id === result.proposed_assignment?.mentor_id
      );
      if (rec?.score.features) {
        for (const [key, value] of Object.entries(rec.score.features)) {
          if (key in featureSums && key !== 'capacity_penalty') {
            featureSums[key].sum += value as number;
            featureSums[key].count++;
          }
        }
      }
    }
  }

  const featureLabels: Record<string, string> = {
    capability_match: 'Capability',
    semantic_similarity: 'Goals Alignment',
    domain_match: 'Domain Detail',
    role_seniority_fit: 'Seniority',
    tz_overlap_bonus: 'Timezone',
  };

  return Object.entries(featureSums)
    .filter(([, data]) => data.count > 0)
    .map(([feature, data]) => ({
      feature: featureLabels[feature] || feature,
      avgValue: Math.round((data.sum / data.count) * 100),
    }))
    .sort((a, b) => b.avgValue - a.avgValue);
}

export function getCohortMatchQualities(cohorts: Cohort[]): CohortMatchQuality[] {
  return cohorts
    .filter(c => c.matches?.results && c.matches.results.length > 0)
    .map(cohort => {
      let totalScore = 0;
      let count = 0;

      for (const result of cohort.matches!.results) {
        if (result.proposed_assignment?.mentor_id) {
          const rec = result.recommendations.find(
            r => r.mentor_id === result.proposed_assignment?.mentor_id
          );
          if (rec) {
            totalScore += rec.score.total_score;
            count++;
          }
        }
      }

      return {
        cohort_id: cohort.id,
        cohort_name: cohort.name,
        avgScore: count > 0 ? Math.round(totalScore / count) : 0,
        matchCount: count,
      };
    })
    .filter(c => c.matchCount > 0);
}

// ============================================================================
// POPULATION STATS
// ============================================================================

export interface PopulationStats {
  totalMentors: number;
  totalMentees: number;
  totalPairs: number;
  activeCohorts: number;
  uniqueTopics: number;
  avgMatchScore: number | null;
}

export function getPopulationStats(cohorts: Cohort[]): PopulationStats {
  const topics = new Set<string>();
  let totalMentors = 0;
  let totalMentees = 0;
  let totalPairs = 0;
  let activeCohorts = 0;
  let matchScoreSum = 0;
  let matchCount = 0;

  for (const cohort of cohorts) {
    totalMentors += cohort.mentors.length;
    totalMentees += cohort.mentees.length;
    if (cohort.status === 'active') activeCohorts++;

    for (const mentee of cohort.mentees) {
      if (mentee.primary_capability) {
        topics.add(mentee.primary_capability);
        if (mentee.secondary_capability) topics.add(mentee.secondary_capability);
      } else {
        for (const t of mentee.topics_to_learn || []) topics.add(t);
      }
    }
    for (const mentor of cohort.mentors) {
      if (mentor.primary_capability) {
        topics.add(mentor.primary_capability);
        for (const c of mentor.secondary_capabilities || []) topics.add(c);
      } else {
        for (const t of mentor.topics_to_mentor || []) topics.add(t);
      }
    }

    if (cohort.matches?.results) {
      for (const result of cohort.matches.results) {
        if (result.proposed_assignment?.mentor_id) {
          totalPairs++;
          const rec = result.recommendations.find(
            r => r.mentor_id === result.proposed_assignment?.mentor_id
          );
          if (rec) {
            matchScoreSum += rec.score.total_score;
            matchCount++;
          }
        }
      }
    }
  }

  return {
    totalMentors,
    totalMentees,
    totalPairs,
    activeCohorts,
    uniqueTopics: topics.size,
    avgMatchScore: matchCount > 0 ? Math.round(matchScoreSum / matchCount) : null,
  };
}
