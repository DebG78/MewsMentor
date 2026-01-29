// Re-export all functions from supabaseService for backward compatibility
export {
  createCohort,
  getAllCohorts,
  getCohortById,
  updateCohort,
  deleteCohort,
  addImportDataToCohort,
  saveMatchesToCohort,
  addMatchingToHistory,
  signupMentee,
  signupMentor,
  getUnassignedSignups,
  assignToCohort
} from './supabaseService'

// Keep the existing utility functions
import { Cohort, CohortStats } from "@/types/mentoring";

// Calculate cohort statistics
export function calculateCohortStats(cohort: Cohort): CohortStats {
  const totalCapacity = cohort.mentors.reduce((sum, mentor) => sum + mentor.capacity_remaining, 0);

  let matchesCreated = 0;
  let matchesApproved = 0;

  if (cohort.matches) {
    matchesCreated = cohort.matches.results.length;
    matchesApproved = cohort.matches.results.filter(r => r.proposed_assignment?.mentor_id).length;
  }

  return {
    total_mentees: cohort.mentees.length,
    total_mentors: cohort.mentors.length,
    total_capacity: totalCapacity,
    matches_created: matchesCreated,
    matches_approved: matchesApproved,
    active_sessions: 0, // Would be calculated from actual session data
    completed_sessions: 0 // Would be calculated from actual session data
  };
}

// Get cohort status badge info
export function getCohortStatusInfo(status: Cohort['status']) {
  switch (status) {
    case 'draft':
      return { label: 'Draft', color: 'bg-gray-100 text-gray-800' };
    case 'active':
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    case 'completed':
      return { label: 'Completed', color: 'bg-blue-100 text-blue-800' };
    case 'paused':
      return { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' };
    default:
      return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
}

// Validate cohort readiness for matching
export function validateCohortForMatching(cohort: Cohort): { isReady: boolean; issues: string[] } {
  const issues: string[] = [];

  if (cohort.mentees.length === 0) {
    issues.push("No mentees in cohort");
  }

  if (cohort.mentors.length === 0) {
    issues.push("No mentors in cohort");
  }

  const totalCapacity = cohort.mentors.reduce((sum, mentor) => sum + mentor.capacity_remaining, 0);
  if (totalCapacity === 0) {
    issues.push("No available mentor capacity");
  }

  if (totalCapacity < cohort.mentees.length) {
    issues.push(`Insufficient capacity: ${totalCapacity} slots for ${cohort.mentees.length} mentees`);
  }

  return {
    isReady: issues.length === 0,
    issues
  };
}