// Check-in and Milestone Types

export type CheckInStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';
export type RiskFlag = 'green' | 'amber' | 'red';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneType = 'kickoff' | 'midpoint' | 'closure' | 'custom';

export interface CheckIn {
  id: string;
  cohort_id: string;
  mentor_id: string;
  mentee_id: string;
  check_in_date: string;
  status: CheckInStatus;
  notes?: string;
  risk_flag: RiskFlag;
  risk_reason?: string;
  next_action?: string;
  next_action_date?: string;
  next_action_owner?: string;
  session_count: number;
  last_session_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckInWithNames extends CheckIn {
  mentor_name?: string;
  mentee_name?: string;
}

export interface Milestone {
  id: string;
  cohort_id: string;
  mentor_id?: string;
  mentee_id?: string;
  title: string;
  description?: string;
  milestone_type: MilestoneType;
  target_date?: string;
  completed_date?: string;
  status: MilestoneStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Input types
export interface CreateCheckInInput {
  cohort_id: string;
  mentor_id: string;
  mentee_id: string;
  check_in_date: string;
  status?: CheckInStatus;
  notes?: string;
  risk_flag?: RiskFlag;
  risk_reason?: string;
  next_action?: string;
  next_action_date?: string;
  next_action_owner?: string;
  created_by?: string;
}

export interface UpdateCheckInInput {
  status?: CheckInStatus;
  notes?: string;
  risk_flag?: RiskFlag;
  risk_reason?: string;
  next_action?: string;
  next_action_date?: string;
  next_action_owner?: string;
  session_count?: number;
  last_session_date?: string;
}

export interface CreateMilestoneInput {
  cohort_id: string;
  mentor_id?: string;
  mentee_id?: string;
  title: string;
  description?: string;
  milestone_type?: MilestoneType;
  target_date?: string;
  created_by?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  target_date?: string;
  completed_date?: string;
  status?: MilestoneStatus;
}

// Summary types for dashboards
export interface CheckInSummary {
  total: number;
  scheduled: number;
  completed: number;
  missed: number;
  at_risk: number; // amber + red
  green: number;
  amber: number;
  red: number;
}

export interface PairCheckInStatus {
  cohort_id: string;
  mentor_id: string;
  mentee_id: string;
  mentor_name?: string;
  mentee_name?: string;
  last_check_in?: CheckIn;
  next_check_in?: CheckIn;
  total_check_ins: number;
  current_risk: RiskFlag;
  session_count: number;
}
