// Core mentoring data types based on CSV structure

export interface MenteeData {
  id: string; // From "#" column
  name?: string; // From "Full Name" column
  pronouns?: string;
  role: string;
  experience_years: string; // "3–5", "6–10", "10+", etc.
  location_timezone: string;

  // Life situations (boolean flags from CSV - legacy)
  returning_from_leave?: boolean;
  navigating_menopause?: boolean;
  career_break?: boolean;
  relocation?: boolean;
  career_change?: boolean;
  health_challenges?: boolean;
  stepping_into_leadership?: boolean;
  working_towards_promotion?: boolean;
  thinking_about_internal_move?: boolean;
  other_situation?: string;

  // Life experiences array (for database storage)
  life_experiences?: string[];

  // Development areas they want to learn
  topics_to_learn: string[];

  // Participation history
  has_participated_before?: boolean;

  // Mentoring preferences
  motivation?: string;
  main_reason?: string;
  preferred_mentor_style?: string;
  preferred_mentor_energy?: string;
  feedback_preference?: string;
  mentor_experience_importance?: string;
  what_not_wanted?: string;
  meeting_frequency?: string;
  desired_qualities?: string;
  expectations?: string;

  // Organisation fields
  department?: string;
  job_grade?: string;

  // Additional computed fields
  goals_text?: string; // Combined motivation + main_reason + expectations
  languages?: string[];
  seniority_band?: string; // Computed from experience_years
}

export interface MentorData {
  id: string; // From "#" column
  name?: string; // From "Full Name" column
  pronouns?: string;
  role: string;
  experience_years: string;
  location_timezone: string;

  // Life experiences they can relate to
  returning_from_leave?: boolean;
  navigating_menopause?: boolean;
  career_break?: boolean;
  relocation?: boolean;
  career_change?: boolean;
  health_challenges?: boolean;
  stepping_into_leadership?: boolean;
  promotions?: boolean;
  internal_moves?: boolean;
  other_experience?: string;

  // Areas they can mentor in
  topics_to_mentor: string[];

  // Mentoring approach
  has_mentored_before: boolean;
  mentoring_style: string;
  meeting_style: string;
  mentor_energy: string;
  feedback_style: string;
  preferred_mentee_levels: string[]; // "Early-career", "Mid-level", "Senior stretch role"
  topics_not_to_mentor?: string[];
  meeting_frequency: string;
  motivation: string;
  expectations: string;

  // Organisation fields
  department?: string;
  job_grade?: string;

  // Additional computed fields
  bio_text?: string; // Combined motivation + expectations + experience
  languages?: string[];
  capacity_remaining: number; // How many mentees they can take
  industry?: string;
  role_band?: string; // Computed from role + experience
  seniority_band?: string; // IC1-IC5, M1-M2 mapping
}

// Matching algorithm types
export interface MatchingFilters {
  min_language_overlap: number;
  max_timezone_difference: number; // in hours
  require_available_capacity: boolean;
}

export interface MatchingFeatures {
  topics_overlap: number; // 0-1, Jaccard similarity
  industry_overlap: number; // 0-1, binary match
  role_seniority_fit: number; // 0-1, seniority appropriateness
  semantic_similarity: number; // 0-1, text similarity of goals vs bio
  tz_overlap_bonus: number; // 0-1, timezone proximity bonus
  language_bonus: number; // 0-1, primary language match bonus
  capacity_penalty: number; // 0-1, penalty for low capacity
}

export interface MatchScore {
  total_score: number; // 0-100, final weighted score
  features: MatchingFeatures;
  reasons: string[]; // Human-readable reasons for the match
  risks: string[]; // Potential concerns about the match
  logistics: {
    timezone_mentee?: string;
    timezone_mentor?: string;
    languages_shared: string[];
    capacity_remaining?: number;
  };
  icebreaker?: string; // Suggested conversation starter
  ai_explanation?: string; // LLM-generated match explanation
  is_embedding_based?: boolean; // Whether semantic similarity used AI embeddings
}

export interface MatchingResult {
  mentee_id: string;
  mentee_name?: string;
  recommendations: {
    mentor_id: string;
    mentor_name?: string;
    score: MatchScore;
  }[];
  proposed_assignment?: {
    mentor_id: string | null;
    mentor_name?: string | null;
    comment?: string;
  };
}

export interface MatchingStats {
  mentees_total: number;
  mentors_total: number;
  pairs_evaluated: number;
  after_filters: number;
}

export interface MatchingOutput {
  mode: "batch" | "top3_per_mentee";
  stats: MatchingStats;
  results: MatchingResult[];
  timestamp?: string; // When this matching was run
}

// Matching history types
export interface MatchingHistoryEntry {
  id: string;
  timestamp: string;
  mode: "batch" | "top3_per_mentee";
  stats: MatchingStats;
  launched: boolean; // Whether these matches were actually launched/approved
  matches_count: number;
  average_score: number;
}

// Manual matching types
export interface ManualMatch {
  mentee_id: string;
  mentee_name?: string;
  mentor_id: string;
  mentor_name?: string;
  confidence: number;    // 1-5 admin gut-feel score
  notes?: string;
  created_at: string;
}

export interface ManualMatchingOutput {
  matches: ManualMatch[];
  created_at: string;
  updated_at: string;
  finalized: boolean;    // admin considers matching "done"
}

// Cohort management types
export interface Cohort {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  created_date: string;
  start_date?: string;
  end_date?: string;
  mentees: MenteeData[];
  mentors: MentorData[];
  matches?: MatchingOutput;
  matching_history?: MatchingHistoryEntry[];
  manual_matches?: ManualMatchingOutput;
  program_manager?: string;
  target_skills?: string[];
  success_rate_target?: number;
  mentor_survey_id?: string;  // Survey template ID for mentor signup
  mentee_survey_id?: string;  // Survey template ID for mentee signup
}

export interface CohortStats {
  total_mentees: number;
  total_mentors: number;
  total_capacity: number;
  matches_created: number;
  matches_approved: number;
  active_sessions: number;
  completed_sessions: number;
}

// Data import types
export interface ImportResult {
  mentees: MenteeData[];
  mentors: MentorData[];
  errors: string[];
  warnings: string[];
}

export interface DataValidationError {
  row: number;
  field: string;
  message: string;
}

// Development areas/topics mapping
export const DEVELOPMENT_TOPICS = [
  "Career growth & progression",
  "Leadership & management",
  "Technical / product knowledge",
  "Customer success & client relationships",
  "Communication & soft skills",
  "Cross-functional collaboration",
  "Strategic thinking & vision",
  "Change management / navigating transformation",
  "Diversity, equity & inclusion",
  "Work–life balance & wellbeing"
] as const;

export type DevelopmentTopic = typeof DEVELOPMENT_TOPICS[number];

// Experience level mappings for seniority calculation
export const EXPERIENCE_MAPPING = {
  "0-2": "IC1",
  "3–5": "IC2",
  "6–10": "IC3",
  "10+": "IC4"
} as const;

export const SENIORITY_SCORES = {
  "IC1": 1,
  "IC2": 2,
  "IC3": 3,
  "IC4": 4,
  "IC5": 5,
  "M1": 6,
  "M2": 7
} as const;

// Session management types (simplified for meeting logging)
export interface Session {
  id: string;
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  meeting_date: string; // Date when the meeting happened (YYYY-MM-DD)
  notes?: string;
  mentor_rating?: number; // Optional 1-5 rating
  mentee_rating?: number; // Optional 1-5 rating
  mentor_feedback?: string;
  mentee_feedback?: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  mentor_name?: string;
  mentee_name?: string;
  cohort_name?: string;
}

export interface SessionCreateInput {
  mentor_id: string;
  mentee_id: string;
  cohort_id: string;
  meeting_date: string; // YYYY-MM-DD format
  notes?: string;
}

export interface SessionUpdateInput {
  meeting_date?: string;
  notes?: string;
  mentor_rating?: number;
  mentee_rating?: number;
  mentor_feedback?: string;
  mentee_feedback?: string;
}

export interface SessionStats {
  total_meetings: number;
  active_pairs: number; // Pairs that have met at least once
  engagement_rate: number; // Percentage of pairs that have logged meetings
  average_meetings_per_pair: number;
  average_rating?: number; // Optional, if ratings are provided
  last_meeting_date?: string; // Most recent meeting date
}