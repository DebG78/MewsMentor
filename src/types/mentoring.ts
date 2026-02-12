// Core mentoring data types based on CSV structure

export interface MenteeData {
  id: string; // From "#" column
  name?: string; // From "Full Name" column
  pronouns?: string;
  role: string;
  experience_years: string; // "3–5", "6–10", "10+", etc. (legacy)
  location_timezone: string;

  // Life situations (boolean flags from CSV - legacy, kept for old cohorts)
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

  // Life experiences array (for database storage - legacy)
  life_experiences?: string[];

  // Development areas they want to learn (legacy array, still populated from capabilities)
  topics_to_learn: string[];

  // Participation history
  has_participated_before?: boolean;

  // Mentoring preferences (legacy fields kept for old cohorts)
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
  email?: string;

  // Additional computed fields
  goals_text?: string; // Combined motivation + main_reason + expectations
  languages?: string[];
  seniority_band?: string; // Direct from survey (S1, S2, M1, M2, D1, D2, VP, SVP, LT)

  // === New survey revamp fields (capability-based model) ===
  bio?: string;
  primary_capability?: string;
  primary_capability_detail?: string;
  secondary_capability?: string;
  secondary_capability_detail?: string;
  primary_proficiency?: number; // 1-4
  secondary_proficiency?: number; // 1-4
  mentoring_goal?: string;
  practice_scenarios?: string[];
}

export interface MentorData {
  id: string; // From "#" column
  name?: string; // From "Full Name" column
  pronouns?: string;
  role: string;
  experience_years: string; // legacy
  location_timezone: string;

  // Life experiences they can relate to (legacy, kept for old cohorts)
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

  // Areas they can mentor in (legacy array, still populated from capabilities)
  topics_to_mentor: string[];

  // Mentoring approach (legacy fields kept for old cohorts)
  has_mentored_before: boolean;
  mentoring_style: string;
  meeting_style: string;
  mentor_energy: string;
  feedback_style: string;
  preferred_mentee_levels: string[];
  topics_not_to_mentor?: string[];
  meeting_frequency: string;
  motivation: string;
  expectations: string;

  // Organisation fields
  department?: string;
  job_grade?: string;
  email?: string;

  // Additional computed fields
  bio_text?: string; // Combined motivation + expectations + experience
  languages?: string[];
  capacity_remaining: number; // How many mentees they can take
  industry?: string;
  role_band?: string;
  seniority_band?: string; // Direct from survey (S1, S2, M1, M2, D1, D2, VP, SVP, LT)

  // === New survey revamp fields (capability-based model) ===
  bio?: string;
  mentor_motivation?: string;
  mentoring_experience?: string; // Richer than boolean has_mentored_before
  first_time_support?: string[];
  primary_capability?: string;
  primary_capability_detail?: string;
  secondary_capabilities?: string[]; // Multi-select array
  secondary_capability_detail?: string;
  primary_proficiency?: number; // 1-5
  practice_scenarios?: string[];
  hard_earned_lesson?: string;
  natural_strengths?: string[];
  excluded_scenarios?: string[];
  match_exclusions?: string;
}

// Matching algorithm types
export interface MatchingFilters {
  max_timezone_difference: number; // in hours (6h hard block)
  require_available_capacity: boolean;
  // Legacy fields kept for backward compat
  min_language_overlap?: number;
}

export interface MatchingFeatures {
  capability_match: number; // 0-1, tiered capability scoring (45% weight)
  semantic_similarity: number; // 0-1, text similarity of goals vs bio (30% weight)
  domain_match: number; // 0-1, domain detail text similarity (5% weight)
  role_seniority_fit: number; // 0-1, seniority appropriateness (10% weight)
  tz_overlap_bonus: number; // 0-1, timezone proximity bonus (5% weight)
  capacity_penalty: number; // 0-1, penalty for low capacity (-10% weight)
  // Legacy fields kept for backward compat
  topics_overlap?: number;
  industry_overlap?: number;
  language_bonus?: number;
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

// Legacy experience level mappings (kept for old cohorts)
export const EXPERIENCE_MAPPING = {
  "0-2": "IC1",
  "3–5": "IC2",
  "6–10": "IC3",
  "10+": "IC4"
} as const;

// Legacy seniority scores (for old cohorts using IC1-M2 bands)
export const LEGACY_SENIORITY_SCORES: Record<string, number> = {
  "IC1": 1,
  "IC2": 2,
  "IC3": 3,
  "IC4": 4,
  "IC5": 5,
  "M1": 6,
  "M2": 7,
};

// New seniority levels from survey (S1–LT, direct from Col 9)
// Mentor should be ≥1 level above mentee for a good fit
export const SENIORITY_SCORES: Record<string, number> = {
  "S1": 1,
  "S2": 2,
  "M1": 3,
  "M2": 4,
  "D1": 5,
  "D2": 6,
  "VP": 7,
  "SVP": 8,
  "LT": 9,
};

// Journey phases for session-based next-steps messaging
export type JourneyPhase = 'getting_started' | 'building' | 'midpoint' | 'wrapping_up';

export const JOURNEY_PHASES: { key: JourneyPhase; label: string }[] = [
  { key: 'getting_started', label: 'Getting Started' },
  { key: 'building', label: 'Building' },
  { key: 'midpoint', label: 'Midpoint Check-in' },
  { key: 'wrapping_up', label: 'Wrapping Up' },
];

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
  journey_phase?: JourneyPhase | null;
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