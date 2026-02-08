import { Cohort } from '@/types/mentoring';

export interface ResolvedPair {
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  mentor_name: string;
  mentee_name: string;
  cohort_name: string;
  respondent_role: 'mentor' | 'mentee';
}

export interface ResolutionResult {
  resolved: ResolvedPair | null;
  candidates: ResolvedPair[];
  error?: string;
}

/**
 * Given a respondent name, search active cohorts for the person and their match.
 * Returns the resolved pair if exactly one match is found, or candidates if ambiguous.
 */
export function resolvePairByName(
  name: string,
  cohorts: Cohort[]
): ResolutionResult {
  const normalized = name.trim().toLowerCase();

  if (!normalized) {
    return { resolved: null, candidates: [], error: 'Empty name provided' };
  }

  const activeCohorts = cohorts.filter(c => c.status === 'active');
  const candidates: ResolvedPair[] = [];

  for (const cohort of activeCohorts) {
    if (!cohort.matches?.results) continue;

    // Check mentees
    for (const mentee of cohort.mentees) {
      if (mentee.name?.trim().toLowerCase() === normalized) {
        const match = cohort.matches.results.find(
          r => r.mentee_id === mentee.id && r.proposed_assignment?.mentor_id
        );
        if (match) {
          const mentor = cohort.mentors.find(
            m => m.id === match.proposed_assignment!.mentor_id
          );
          candidates.push({
            mentor_id: match.proposed_assignment!.mentor_id!,
            mentee_id: mentee.id,
            cohort_id: cohort.id,
            mentor_name: mentor?.name || match.proposed_assignment?.mentor_name || 'Unknown',
            mentee_name: mentee.name || mentee.id,
            cohort_name: cohort.name,
            respondent_role: 'mentee',
          });
        }
      }
    }

    // Check mentors
    for (const mentor of cohort.mentors) {
      if (mentor.name?.trim().toLowerCase() === normalized) {
        // Find all matches where this mentor is the proposed assignment
        const matches = cohort.matches.results.filter(
          r => r.proposed_assignment?.mentor_id === mentor.id
        );
        for (const match of matches) {
          const mentee = cohort.mentees.find(m => m.id === match.mentee_id);
          candidates.push({
            mentor_id: mentor.id,
            mentee_id: match.mentee_id,
            cohort_id: cohort.id,
            mentor_name: mentor.name || mentor.id,
            mentee_name: mentee?.name || match.mentee_name || 'Unknown',
            cohort_name: cohort.name,
            respondent_role: 'mentor',
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return { resolved: null, candidates: [], error: `No match found for "${name}"` };
  }

  if (candidates.length === 1) {
    return { resolved: candidates[0], candidates };
  }

  // Multiple candidates — ambiguous, needs admin resolution
  return {
    resolved: null,
    candidates,
    error: `Multiple matches found for "${name}" across ${new Set(candidates.map(c => c.cohort_id)).size} cohort(s)`,
  };
}

/**
 * Batch resolve multiple names at once. Returns matched and unmatched arrays.
 */
export function batchResolvePairsByName(
  names: string[],
  cohorts: Cohort[]
): {
  matched: Array<{ index: number; name: string; pair: ResolvedPair }>;
  unmatched: Array<{ index: number; name: string; error: string; candidates: ResolvedPair[] }>;
} {
  const matched: Array<{ index: number; name: string; pair: ResolvedPair }> = [];
  const unmatched: Array<{ index: number; name: string; error: string; candidates: ResolvedPair[] }> = [];

  for (let i = 0; i < names.length; i++) {
    const result = resolvePairByName(names[i], cohorts);
    if (result.resolved) {
      matched.push({ index: i, name: names[i], pair: result.resolved });
    } else {
      unmatched.push({
        index: i,
        name: names[i],
        error: result.error || 'Unknown error',
        candidates: result.candidates,
      });
    }
  }

  return { matched, unmatched };
}
