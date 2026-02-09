// ============================================================================
// COHORT RUNBOOK TYPES
// ============================================================================

export type StageType =
  | 'setup'
  | 'import'
  | 'matching'
  | 'review'
  | 'launch'
  | 'midpoint'
  | 'closure'
  | 'reporting';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface DocumentLink {
  id: string;
  name: string;
  url: string;
  type?: 'doc' | 'sheet' | 'pdf' | 'link';
  added_at?: string;
}

export interface CohortStage {
  id: string;
  cohort_id: string;
  stage_type: StageType;
  stage_name: string;
  owner?: string;
  due_date?: string;
  completed_date?: string;
  status: StageStatus;
  checklist: ChecklistItem[];
  documents: DocumentLink[];
  notes?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCohortStageInput {
  cohort_id: string;
  stage_type: StageType;
  stage_name: string;
  owner?: string;
  due_date?: string;
  checklist?: ChecklistItem[];
  documents?: DocumentLink[];
  notes?: string;
  display_order?: number;
}

export interface UpdateCohortStageInput {
  stage_name?: string;
  owner?: string;
  due_date?: string;
  completed_date?: string;
  status?: StageStatus;
  checklist?: ChecklistItem[];
  documents?: DocumentLink[];
  notes?: string;
  display_order?: number;
}

// Default stage templates for initializing a new cohort runbook
export const DEFAULT_STAGE_TEMPLATES: Omit<CreateCohortStageInput, 'cohort_id'>[] = [
  {
    stage_type: 'setup',
    stage_name: 'Program Setup',
    display_order: 0,
    checklist: [
      { id: '1', text: 'Define program objectives', completed: false },
      { id: '2', text: 'Set timeline and key dates', completed: false },
      { id: '3', text: 'Configure matching model', completed: false },
      { id: '4', text: 'Prepare communication templates', completed: false },
    ],
  },
  {
    stage_type: 'import',
    stage_name: 'Participant Import',
    display_order: 1,
    checklist: [
      { id: '1', text: 'Import mentor profiles', completed: false },
      { id: '2', text: 'Import mentee profiles', completed: false },
      { id: '3', text: 'Validate profile data', completed: false },
      { id: '4', text: 'Review capacity settings', completed: false },
    ],
  },
  {
    stage_type: 'matching',
    stage_name: 'Match Generation',
    display_order: 2,
    checklist: [
      { id: '1', text: 'Run matching algorithm', completed: false },
      { id: '2', text: 'Review match scores', completed: false },
      { id: '3', text: 'Identify edge cases', completed: false },
      { id: '4', text: 'Generate alternatives for low scores', completed: false },
    ],
  },
  {
    stage_type: 'review',
    stage_name: 'Match Review & Approval',
    display_order: 3,
    checklist: [
      { id: '1', text: 'Review all proposed matches', completed: false },
      { id: '2', text: 'Handle constraint violations', completed: false },
      { id: '3', text: 'Make manual adjustments', completed: false },
      { id: '4', text: 'Final approval sign-off', completed: false },
    ],
  },
  {
    stage_type: 'launch',
    stage_name: 'Program Launch',
    display_order: 4,
    checklist: [
      { id: '1', text: 'Send match notifications', completed: false },
      { id: '2', text: 'Distribute welcome materials', completed: false },
      { id: '3', text: 'Schedule kickoff sessions', completed: false },
      { id: '4', text: 'Confirm mentor availability', completed: false },
    ],
  },
  {
    stage_type: 'midpoint',
    stage_name: 'Midpoint Check-in',
    display_order: 5,
    checklist: [
      { id: '1', text: 'Send midpoint surveys', completed: false },
      { id: '2', text: 'Review session activity per pair', completed: false },
      { id: '3', text: 'Review engagement metrics', completed: false },
      { id: '4', text: 'Address at-risk pairs', completed: false },
    ],
  },
  {
    stage_type: 'closure',
    stage_name: 'Program Closure',
    display_order: 6,
    checklist: [
      { id: '1', text: 'Send final surveys', completed: false },
      { id: '2', text: 'Collect testimonials', completed: false },
      { id: '3', text: 'Host closing ceremony', completed: false },
      { id: '4', text: 'Gather feedback', completed: false },
    ],
  },
  {
    stage_type: 'reporting',
    stage_name: 'Final Reporting',
    display_order: 7,
    checklist: [
      { id: '1', text: 'Compile success metrics', completed: false },
      { id: '2', text: 'Generate final report', completed: false },
      { id: '3', text: 'Document lessons learned', completed: false },
      { id: '4', text: 'Archive program data', completed: false },
    ],
  },
];

// Stage metadata for UI display
export const STAGE_METADATA: Record<StageType, { icon: string; color: string; description: string }> = {
  setup: {
    icon: 'Settings',
    color: 'bg-blue-500',
    description: 'Configure program settings and prepare for launch',
  },
  import: {
    icon: 'Upload',
    color: 'bg-indigo-500',
    description: 'Import and validate participant data',
  },
  matching: {
    icon: 'Shuffle',
    color: 'bg-purple-500',
    description: 'Generate and analyze match proposals',
  },
  review: {
    icon: 'Eye',
    color: 'bg-pink-500',
    description: 'Review and approve final matches',
  },
  launch: {
    icon: 'Rocket',
    color: 'bg-orange-500',
    description: 'Launch program and notify participants',
  },
  midpoint: {
    icon: 'Activity',
    color: 'bg-yellow-500',
    description: 'Monitor progress and address issues',
  },
  closure: {
    icon: 'Flag',
    color: 'bg-green-500',
    description: 'Wrap up program and collect feedback',
  },
  reporting: {
    icon: 'BarChart',
    color: 'bg-teal-500',
    description: 'Generate reports and document outcomes',
  },
};

// Next actions interface for dashboard widget
export interface NextAction {
  stage_id: string;
  stage_name: string;
  stage_type: StageType;
  cohort_id: string;
  cohort_name?: string;
  action_type: 'due_soon' | 'overdue' | 'blocked' | 'checklist_pending';
  description: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
}
