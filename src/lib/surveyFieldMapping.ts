/**
 * Shared survey field mapping module.
 * Used by both the CSV parser (dataParser.ts) and the survey webhook edge function.
 *
 * Maps MS Forms question text headers to internal field names.
 * New survey format uses full question text as column headers.
 */

// ============================================================================
// Column finder — matches keywords against full question-text headers
// ============================================================================

/**
 * Find a column value from a row by matching keywords in the header.
 * Returns the first match found. Keywords are matched case-insensitively.
 * All keywords in a group must appear in the header (AND logic).
 */
export function findColumnByKeywords(
  row: Record<string, string>,
  keywordGroups: string[][]
): string | undefined {
  for (const keywords of keywordGroups) {
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (keywords.every(kw => lowerKey.includes(kw.toLowerCase()))) {
        const val = row[key]?.trim();
        if (val) return val;
      }
    }
  }
  return undefined;
}

/**
 * Find the header key (not value) from a row by matching keywords.
 */
export function findHeaderByKeywords(
  row: Record<string, string>,
  keywordGroups: string[][]
): string | undefined {
  for (const keywords of keywordGroups) {
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (keywords.every(kw => lowerKey.includes(kw.toLowerCase()))) {
        return key;
      }
    }
  }
  return undefined;
}

// ============================================================================
// Format detection
// ============================================================================

/**
 * Detect if a row set is from the new (Q2 2026+) survey format.
 * The new format has a "participate as" column (Col 14) that explicitly
 * declares role selection.
 */
export function isNewSurveyFormat(row: Record<string, string>): boolean {
  return Object.keys(row).some(key =>
    key.toLowerCase().includes('participate as') ||
    key.toLowerCase().includes('want to participate')
  );
}

// ============================================================================
// Multi-select parsing (MS Forms uses semicolons with trailing semicolon)
// ============================================================================

/**
 * Parse a multi-select MS Forms value.
 * MS Forms format: "Option A;Option B;Option C;" (trailing semicolon)
 */
export function parseMultiSelect(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(';').map(s => s.trim()).filter(Boolean);
}

// ============================================================================
// Text-to-number conversion for capacity field
// ============================================================================

const TEXT_NUMBERS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
};

/**
 * Parse a capacity value that may be text ("One", "Two") or numeric.
 */
export function parseCapacityText(value: string | undefined, defaultValue: number = 1): number {
  if (!value) return defaultValue;
  const cleaned = value.trim().toLowerCase();

  // Try direct number parse
  const num = parseInt(cleaned, 10);
  if (!isNaN(num) && num >= 0) return num;

  // Try text-to-number
  if (TEXT_NUMBERS[cleaned] !== undefined) return TEXT_NUMBERS[cleaned];

  // Try range: "1-2" → take higher
  const rangeMatch = cleaned.match(/^(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return Math.max(parseInt(rangeMatch[2], 10), 1);

  // Try "3+" style
  const plusMatch = cleaned.match(/^(\d+)\s*\+/);
  if (plusMatch) return parseInt(plusMatch[1], 10);

  return defaultValue;
}

// ============================================================================
// New survey column keyword patterns
// ============================================================================

/**
 * Keyword patterns for shared bio fields (both mentees and mentors).
 * Each entry maps a field name to keyword groups (OR between groups, AND within).
 */
export const SHARED_BIO_PATTERNS = {
  seniority_band: [['current level']],
  role: [['role title'], ['current role']],
  industry: [['select your function'], ['your function']],
  location_timezone: [['time-zone'], ['time zone'], ['preferred time']],
  bio: [['context about your role'], ['provide a little context'], ['role and focus']],
  role_selection: [['participate as'], ['want to participate']],
  email: [['email']],
  name: [['name']],
  slack_user_id: [['slack']],
} as const;

/**
 * Keyword patterns for mentee-specific fields.
 * Ordered to disambiguate from mentor fields (mentee cols come first in Excel).
 */
export const MENTEE_PATTERNS = {
  primary_capability: [['primary capability', 'build']],
  primary_capability_detail: [['domain expertise', 'more info']],  // first occurrence
  secondary_capability: [['secondary capability', 'build']],
  // secondary_capability_detail: same header as primary detail but second occurrence — handled by position
  primary_proficiency: [['proficiency', 'primary']],
  secondary_proficiency: [['proficiency', 'secondary']],
  mentoring_goal: [['mentoring goal'], ['using the format']],
  practice_scenarios: [['practice scenarios', 'choose'], ['practice arena']],
  mentor_help_wanted: [['mentor help'], ['kind of mentor help']],
  mentor_experience_importance: [['open to being mentored'], ['first-time mentor']],
  preferred_style: [['session style']],
  feedback_preference: [['feedback style']],
} as const;

/**
 * Keyword patterns for mentor-specific fields.
 */
export const MENTOR_PATTERNS = {
  mentor_motivation: [['want to mentor'], ['hope to get out']],
  capacity: [['how many mentees']],
  mentoring_experience: [['first time mentoring'], ['first time mentor']],
  first_time_support: [['support would help you feel confident'], ['what support']],
  primary_capability: [['primary capability', 'strongest'], ['primary capability', 'mentoring on']],
  primary_capability_detail: [['domain expertise', 'more info']],  // in mentor context
  secondary_capabilities: [['secondary capability']],  // multi-select
  // secondary_capability_detail: handled by position
  primary_proficiency: [['proficiency', 'primary']],
  practice_scenarios: [['practice scenarios', 'strongest'], ['scenarios you\'re strongest']],
  hard_earned_lesson: [['hard-earned lesson'], ['hard earned lesson']],
  natural_strengths: [['naturally bring'], ['natural strengths']],
  meeting_style: [['session style']],
  topics_not_to_mentor: [['do not want to mentor'], ['prefer not to mentor']],
  excluded_scenarios: [['prefer not to support'], ['scenarios you prefer not']],
  match_exclusions: [['make a match not work'], ['anything else']],
} as const;

// ============================================================================
// Seniority band parsing
// ============================================================================

const VALID_SENIORITY_BANDS = ['S1', 'S2', 'M1', 'M2', 'D1', 'D2', 'VP', 'SVP', 'LT'];

/**
 * Parse and normalize a seniority band value from the survey.
 * Accepts values like "S1", "s1", "S 1", etc.
 */
export function parseSeniorityBand(value: string | undefined): string {
  if (!value) return 'S1';
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '');
  if (VALID_SENIORITY_BANDS.includes(cleaned)) return cleaned;
  return 'S1'; // Default
}

// ============================================================================
// Mentoring experience parsing
// ============================================================================

/**
 * Parse mentoring experience text to boolean (backward compat for has_mentored_before).
 */
export function parseMentoringExperience(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return lower.includes('mentored before') || lower.includes('helped informally');
}

// ============================================================================
// Full row extraction for new survey format
// ============================================================================

export interface NewSurveySharedFields {
  email?: string;
  name?: string;
  slack_user_id?: string;
  seniority_band: string;
  role: string;
  industry: string;
  location_timezone: string;
  bio?: string;
  role_selection: 'mentee' | 'mentor' | 'both';
}

export interface NewSurveyMenteeFields {
  primary_capability?: string;
  primary_capability_detail?: string;
  secondary_capability?: string;
  secondary_capability_detail?: string;
  primary_proficiency?: number;
  secondary_proficiency?: number;
  mentoring_goal?: string;
  practice_scenarios: string[];
  mentor_help_wanted: string[];
  mentor_experience_importance?: string;
  preferred_style?: string;
  feedback_preference?: string;
}

export interface NewSurveyMentorFields {
  mentor_motivation?: string;
  capacity_remaining: number;
  mentoring_experience?: string;
  has_mentored_before: boolean;
  first_time_support: string[];
  primary_capability?: string;
  primary_capability_detail?: string;
  secondary_capabilities: string[];
  secondary_capability_detail?: string;
  primary_proficiency?: number;
  practice_scenarios: string[];
  hard_earned_lesson?: string;
  natural_strengths: string[];
  meeting_style?: string;
  topics_not_to_mentor: string[];
  excluded_scenarios: string[];
  match_exclusions?: string;
}

/**
 * Extract shared bio fields from a new-format survey row.
 */
export function extractSharedFields(row: Record<string, string>): NewSurveySharedFields {
  const f = (patterns: string[][]) => findColumnByKeywords(row, patterns);

  // Determine role selection
  const roleRaw = f(SHARED_BIO_PATTERNS.role_selection) || '';
  const roleLower = roleRaw.toLowerCase();
  let role_selection: 'mentee' | 'mentor' | 'both' = 'mentee';
  if (roleLower.includes('both') || (roleLower.includes('mentee') && roleLower.includes('mentor'))) {
    role_selection = 'both';
  } else if (roleLower.includes('mentor')) {
    role_selection = 'mentor';
  }

  return {
    email: f(SHARED_BIO_PATTERNS.email),
    name: f(SHARED_BIO_PATTERNS.name),
    slack_user_id: f(SHARED_BIO_PATTERNS.slack_user_id),
    seniority_band: parseSeniorityBand(f(SHARED_BIO_PATTERNS.seniority_band)),
    role: f(SHARED_BIO_PATTERNS.role) || '',
    industry: f(SHARED_BIO_PATTERNS.industry) || '',
    location_timezone: f(SHARED_BIO_PATTERNS.location_timezone) || '',
    bio: f(SHARED_BIO_PATTERNS.bio),
    role_selection,
  };
}

/**
 * Extract mentee-specific fields from a new-format survey row.
 * Returns null if no mentee data is populated.
 */
export function extractMenteeFields(row: Record<string, string>): NewSurveyMenteeFields | null {
  const f = (patterns: string[][]) => findColumnByKeywords(row, patterns);

  const primaryCap = f(MENTEE_PATTERNS.primary_capability);
  const goal = f(MENTEE_PATTERNS.mentoring_goal);

  // If no primary capability and no goal, likely not a mentee response
  if (!primaryCap && !goal) return null;

  // Parse proficiency as integer
  const parseProficiency = (val: string | undefined): number | undefined => {
    if (!val) return undefined;
    const num = parseInt(val, 10);
    return !isNaN(num) ? num : undefined;
  };

  // Domain expertise detail fields: MS Forms has two columns with similar names.
  // We match the first occurrence (mentee primary) vs second (mentee secondary) by position.
  const detailKeys = Object.keys(row).filter(k =>
    k.toLowerCase().includes('domain expertise') && k.toLowerCase().includes('more info')
  );

  return {
    primary_capability: primaryCap,
    primary_capability_detail: detailKeys[0] ? row[detailKeys[0]]?.trim() || undefined : undefined,
    secondary_capability: f(MENTEE_PATTERNS.secondary_capability),
    secondary_capability_detail: detailKeys[1] ? row[detailKeys[1]]?.trim() || undefined : undefined,
    primary_proficiency: parseProficiency(f(MENTEE_PATTERNS.primary_proficiency)),
    secondary_proficiency: parseProficiency(f(MENTEE_PATTERNS.secondary_proficiency)),
    mentoring_goal: goal,
    practice_scenarios: parseMultiSelect(f(MENTEE_PATTERNS.practice_scenarios)),
    mentor_help_wanted: parseMultiSelect(f(MENTEE_PATTERNS.mentor_help_wanted)),
    mentor_experience_importance: f(MENTEE_PATTERNS.mentor_experience_importance),
    preferred_style: f(MENTEE_PATTERNS.preferred_style),
    feedback_preference: f(MENTEE_PATTERNS.feedback_preference),
  };
}

/**
 * Extract mentor-specific fields from a new-format survey row.
 * Returns null if no mentor data is populated.
 */
export function extractMentorFields(row: Record<string, string>): NewSurveyMentorFields | null {
  const f = (patterns: string[][]) => findColumnByKeywords(row, patterns);

  const primaryCap = f(MENTOR_PATTERNS.primary_capability);
  const motivation = f(MENTOR_PATTERNS.mentor_motivation);

  // If no primary capability and no motivation, likely not a mentor response
  if (!primaryCap && !motivation) return null;

  const parseProficiency = (val: string | undefined): number | undefined => {
    if (!val) return undefined;
    const num = parseInt(val, 10);
    return !isNaN(num) ? num : undefined;
  };

  const experienceText = f(MENTOR_PATTERNS.mentoring_experience);

  // Domain expertise detail fields for mentors (later columns in Excel)
  const detailKeys = Object.keys(row).filter(k =>
    k.toLowerCase().includes('domain expertise') && k.toLowerCase().includes('more info')
  );
  // Mentor details are at index 2 and 3 (after mentee's 0 and 1), or 0 and 1 if mentor-only
  const mentorDetailOffset = detailKeys.length > 2 ? 2 : 0;

  return {
    mentor_motivation: motivation,
    capacity_remaining: parseCapacityText(f(MENTOR_PATTERNS.capacity)),
    mentoring_experience: experienceText,
    has_mentored_before: parseMentoringExperience(experienceText),
    first_time_support: parseMultiSelect(f(MENTOR_PATTERNS.first_time_support)),
    primary_capability: primaryCap,
    primary_capability_detail: detailKeys[mentorDetailOffset] ? row[detailKeys[mentorDetailOffset]]?.trim() || undefined : undefined,
    secondary_capabilities: parseMultiSelect(f(MENTOR_PATTERNS.secondary_capabilities)),
    secondary_capability_detail: detailKeys[mentorDetailOffset + 1] ? row[detailKeys[mentorDetailOffset + 1]]?.trim() || undefined : undefined,
    primary_proficiency: parseProficiency(f(MENTOR_PATTERNS.primary_proficiency)),
    practice_scenarios: parseMultiSelect(f(MENTOR_PATTERNS.practice_scenarios)),
    hard_earned_lesson: f(MENTOR_PATTERNS.hard_earned_lesson),
    natural_strengths: parseMultiSelect(f(MENTOR_PATTERNS.natural_strengths)),
    meeting_style: f(MENTOR_PATTERNS.meeting_style),
    topics_not_to_mentor: parseMultiSelect(f(MENTOR_PATTERNS.topics_not_to_mentor)),
    excluded_scenarios: parseMultiSelect(f(MENTOR_PATTERNS.excluded_scenarios)),
    match_exclusions: f(MENTOR_PATTERNS.match_exclusions),
  };
}
