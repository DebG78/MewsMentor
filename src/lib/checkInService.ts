import { supabase } from './supabase';
import type {
  CheckIn,
  CheckInWithNames,
  Milestone,
  CreateCheckInInput,
  UpdateCheckInInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  CheckInSummary,
  PairCheckInStatus,
  RiskFlag,
} from '@/types/checkIns';

// ============================================================================
// CHECK-INS
// ============================================================================

/**
 * Get all check-ins for a cohort
 */
export async function getCheckInsByCohort(cohortId: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('Error fetching check-ins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get check-ins for a specific mentor-mentee pair
 */
export async function getCheckInsByPair(
  cohortId: string,
  mentorId: string,
  menteeId: string
): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId)
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('Error fetching pair check-ins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get at-risk pairs (amber or red risk flag)
 */
export async function getAtRiskPairs(cohortId: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('cohort_id', cohortId)
    .in('risk_flag', ['amber', 'red'])
    .order('risk_flag', { ascending: true }) // red first
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('Error fetching at-risk pairs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new check-in
 */
export async function createCheckIn(input: CreateCheckInInput): Promise<CheckIn> {
  const { data, error } = await supabase
    .from('check_ins')
    .insert({
      cohort_id: input.cohort_id,
      mentor_id: input.mentor_id,
      mentee_id: input.mentee_id,
      check_in_date: input.check_in_date,
      status: input.status || 'scheduled',
      notes: input.notes,
      risk_flag: input.risk_flag || 'green',
      risk_reason: input.risk_reason,
      next_action: input.next_action,
      next_action_date: input.next_action_date,
      next_action_owner: input.next_action_owner,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating check-in:', error);
    throw error;
  }

  return data;
}

/**
 * Update a check-in
 */
export async function updateCheckIn(id: string, updates: UpdateCheckInInput): Promise<CheckIn> {
  const { data, error } = await supabase
    .from('check_ins')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating check-in:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a check-in
 */
export async function deleteCheckIn(id: string): Promise<void> {
  const { error } = await supabase
    .from('check_ins')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting check-in:', error);
    throw error;
  }
}

/**
 * Update risk flag for a check-in
 */
export async function updateRiskFlag(
  id: string,
  riskFlag: RiskFlag,
  riskReason?: string
): Promise<CheckIn> {
  return updateCheckIn(id, { risk_flag: riskFlag, risk_reason: riskReason });
}

/**
 * Mark check-in as completed
 */
export async function completeCheckIn(id: string, notes?: string): Promise<CheckIn> {
  return updateCheckIn(id, { status: 'completed', notes });
}

/**
 * Bulk create check-ins for all pairs in a cohort
 */
export async function bulkCreateCheckIns(
  cohortId: string,
  pairs: Array<{ mentor_id: string; mentee_id: string }>,
  checkInDate: string,
  createdBy?: string
): Promise<CheckIn[]> {
  const checkInsToInsert = pairs.map(pair => ({
    cohort_id: cohortId,
    mentor_id: pair.mentor_id,
    mentee_id: pair.mentee_id,
    check_in_date: checkInDate,
    status: 'scheduled' as const,
    risk_flag: 'green' as const,
    created_by: createdBy,
  }));

  const { data, error } = await supabase
    .from('check_ins')
    .insert(checkInsToInsert)
    .select();

  if (error) {
    console.error('Error bulk creating check-ins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get check-in summary for a cohort
 */
export async function getCheckInSummary(cohortId: string): Promise<CheckInSummary> {
  const checkIns = await getCheckInsByCohort(cohortId);

  return {
    total: checkIns.length,
    scheduled: checkIns.filter(c => c.status === 'scheduled').length,
    completed: checkIns.filter(c => c.status === 'completed').length,
    missed: checkIns.filter(c => c.status === 'missed').length,
    at_risk: checkIns.filter(c => c.risk_flag === 'amber' || c.risk_flag === 'red').length,
    green: checkIns.filter(c => c.risk_flag === 'green').length,
    amber: checkIns.filter(c => c.risk_flag === 'amber').length,
    red: checkIns.filter(c => c.risk_flag === 'red').length,
  };
}

// ============================================================================
// MILESTONES
// ============================================================================

/**
 * Get all milestones for a cohort
 */
export async function getMilestonesByCohort(cohortId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('target_date', { ascending: true });

  if (error) {
    console.error('Error fetching milestones:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get milestones for a specific pair
 */
export async function getMilestonesByPair(
  cohortId: string,
  mentorId: string,
  menteeId: string
): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId)
    .order('target_date', { ascending: true });

  if (error) {
    console.error('Error fetching pair milestones:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new milestone
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
  const { data, error } = await supabase
    .from('milestones')
    .insert({
      cohort_id: input.cohort_id,
      mentor_id: input.mentor_id,
      mentee_id: input.mentee_id,
      title: input.title,
      description: input.description,
      milestone_type: input.milestone_type || 'custom',
      target_date: input.target_date,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating milestone:', error);
    throw error;
  }

  return data;
}

/**
 * Update a milestone
 */
export async function updateMilestone(id: string, updates: UpdateMilestoneInput): Promise<Milestone> {
  const { data, error } = await supabase
    .from('milestones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating milestone:', error);
    throw error;
  }

  return data;
}

/**
 * Complete a milestone
 */
export async function completeMilestone(id: string): Promise<Milestone> {
  return updateMilestone(id, {
    status: 'completed',
    completed_date: new Date().toISOString().split('T')[0],
  });
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting milestone:', error);
    throw error;
  }
}

/**
 * Create default milestones for a cohort
 */
export async function createDefaultMilestones(
  cohortId: string,
  startDate: string,
  endDate: string,
  createdBy?: string
): Promise<Milestone[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const midpoint = new Date((start.getTime() + end.getTime()) / 2);

  const defaultMilestones = [
    {
      cohort_id: cohortId,
      title: 'Program Kickoff',
      description: 'Initial meeting between mentor and mentee',
      milestone_type: 'kickoff' as const,
      target_date: startDate,
      created_by: createdBy,
    },
    {
      cohort_id: cohortId,
      title: 'Midpoint Check-in',
      description: 'Review progress and adjust goals if needed',
      milestone_type: 'midpoint' as const,
      target_date: midpoint.toISOString().split('T')[0],
      created_by: createdBy,
    },
    {
      cohort_id: cohortId,
      title: 'Program Closure',
      description: 'Final session and program wrap-up',
      milestone_type: 'closure' as const,
      target_date: endDate,
      created_by: createdBy,
    },
  ];

  const { data, error } = await supabase
    .from('milestones')
    .insert(defaultMilestones)
    .select();

  if (error) {
    console.error('Error creating default milestones:', error);
    throw error;
  }

  return data || [];
}
