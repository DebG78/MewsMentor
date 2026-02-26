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
  keywordGroups: readonly (readonly string[])[]
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
  keywordGroups: readonly (readonly string[])[]
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
 * Survey format version for branching logic.
 * - v3_simplified: Q2 2026+ (25 questions, Workday enrichment, free-text capabilities)
 * - v2_capability: Q1 2026  (capability-based model with proficiency, practice scenarios)
 * - v1_legacy: pre-2026     (topic-based with separate mentor/mentee files)
 */
export type SurveyVersion = 'v3_simplified' | 'v2_capability' | 'v1_legacy';

/**
 * Detect survey format version from a row's column headers.
 * V3 is detected by presence of Workday enrichment columns (Business Title, Compensation Grade).
 * V2 is detected by "participate as" column without Workday columns.
 * V1 is the fallback for legacy topic-based surveys.
 */
export function detectSurveyVersion(row: Record<string, string>): SurveyVersion {
  const keys = Object.keys(row).map(k => k.toLowerCase());

  // V3: has Workday enrichment columns (Business Title or Compensation Grade)
  const hasWorkday = keys.some(k =>
    k.includes('business title') ||
    k.includes('compensation grade') ||
    k.includes('compensation_grade')
  );
  const hasRoleSelection = keys.some(k =>
    k.includes('participate as') ||
    k.includes('want to participate')
  );

  if (hasWorkday && hasRoleSelection) return 'v3_simplified';
  if (hasRoleSelection) return 'v2_capability';
  return 'v1_legacy';
}

/**
 * Detect if a row set is from the new (Q2 2026+) survey format.
 * The new format has a "participate as" column (Col 14) that explicitly
 * declares role selection.
 * @deprecated Use detectSurveyVersion() for 3-way detection
 */
export function isNewSurveyFormat(row: Record<string, string>): boolean {
  const version = detectSurveyVersion(row);
  return version === 'v2_capability' || version === 'v3_simplified';
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
  team: [["team's name"], ['write down your team'], ['team name']],
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
  capabilities_all: [['feel confident mentoring'], ['confident mentoring others'], ['capabilities', 'confident']],  // Q25 full list (CSV fallback)
  primary_capability_detail: [['domain expertise', 'more info']],  // in mentor context
  secondary_capabilities: [['secondary capabilit']],  // handles both "capability" and "capabilities" (plural PA label)
  // secondary_capability_detail: handled by position
  primary_proficiency: [['proficiency', 'primary', 'mentor'], ['proficiency', 'primary', 'strongest']],  // disambiguates from mentee proficiency
  practice_scenarios: [['practice scenarios', 'strongest'], ['scenarios you\'re strongest']],
  hard_earned_lesson: [['hard-earned lesson'], ['hard earned lesson']],
  natural_strengths: [['naturally bring'], ['natural strengths']],
  meeting_style: [['session style', 'mentor'], ['session style', 'style (mentor']],  // disambiguates from mentee session style
  topics_not_to_mentor: [['do not want to mentor'], ['prefer not to mentor']],
  excluded_scenarios: [['prefer not to support'], ['scenarios you prefer not']],
  match_exclusions: [['make a match not work'], ['anything else']],
} as const;

// ============================================================================
// Seniority band parsing
// ============================================================================

const VALID_SENIORITY_BANDS = ['IC1', 'IC2', 'IC3', 'IC4', 'IC5', 'S1', 'S2', 'M1', 'M2', 'D1', 'D2', 'VP', 'SVP', 'LT'];

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
  team?: string;
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
  const f = (patterns: readonly (readonly string[])[]) => findColumnByKeywords(row, patterns);

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
    team: f(SHARED_BIO_PATTERNS.team),
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
  const f = (patterns: readonly (readonly string[])[]) => findColumnByKeywords(row, patterns);

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
  const f = (patterns: readonly (readonly string[])[]) => findColumnByKeywords(row, patterns);

  let primaryCap = f(MENTOR_PATTERNS.primary_capability);
  const motivation = f(MENTOR_PATTERNS.mentor_motivation);

  // Q25 fallback: "Select the capabilities you feel confident mentoring others in"
  // Parse as multi-select; first item becomes primary, rest become secondary_capabilities
  const allCapabilitiesRaw = f(MENTOR_PATTERNS.capabilities_all);
  const allCapabilities = parseMultiSelect(allCapabilitiesRaw);
  if (!primaryCap && allCapabilities.length > 0) {
    primaryCap = allCapabilities[0];
  }

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
    secondary_capabilities: parseMultiSelect(f(MENTOR_PATTERNS.secondary_capabilities)) ||
      (allCapabilities.length > 1 ? allCapabilities.slice(1) : []),
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

// ============================================================================
// V3 SIMPLIFIED SURVEY (Q2 2026+ with Workday enrichment)
// ============================================================================

/**
 * Country → UTC offset mapping for timezone matching.
 * Used when timezone is derived from Workday "Location Address - Country".
 */
export const COUNTRY_TIMEZONE_MAP: Record<string, number> = {
  // Europe
  'united kingdom': 0, 'uk': 0, 'ireland': 0, 'portugal': 0, 'iceland': 0,
  'france': 1, 'germany': 1, 'spain': 1, 'italy': 1, 'netherlands': 1,
  'belgium': 1, 'austria': 1, 'switzerland': 1, 'czech republic': 1, 'czechia': 1,
  'poland': 1, 'sweden': 1, 'norway': 1, 'denmark': 1, 'hungary': 1,
  'slovakia': 1, 'croatia': 1, 'slovenia': 1, 'serbia': 1, 'luxembourg': 1,
  'greece': 2, 'romania': 2, 'bulgaria': 2, 'finland': 2, 'estonia': 2,
  'latvia': 2, 'lithuania': 2, 'ukraine': 2, 'turkey': 3,
  // Middle East
  'israel': 2, 'united arab emirates': 4, 'uae': 4, 'qatar': 3,
  'saudi arabia': 3, 'oman': 4, 'bahrain': 3, 'kuwait': 3,
  // Africa
  'south africa': 2, 'nigeria': 1, 'kenya': 3, 'egypt': 2, 'morocco': 1,
  'ghana': 0, 'ethiopia': 3, 'tanzania': 3,
  // Asia
  'india': 5.5, 'japan': 9, 'south korea': 9, 'china': 8, 'hong kong': 8,
  'singapore': 8, 'malaysia': 8, 'thailand': 7, 'vietnam': 7,
  'indonesia': 7, 'philippines': 8, 'taiwan': 8, 'pakistan': 5,
  'bangladesh': 6, 'sri lanka': 5.5,
  // Oceania
  'australia': 10, 'new zealand': 12,
  // Americas
  'united states': -5, 'usa': -5, 'us': -5, 'canada': -5,
  'mexico': -6, 'brazil': -3, 'argentina': -3, 'colombia': -5,
  'chile': -4, 'peru': -5, 'costa rica': -6,
};

/**
 * Convert a country name to a UTC offset (hours).
 * Returns 1 (CET) as default if country not found (company HQ in Prague).
 */
export function countryToTimezoneOffset(country: string | undefined): number {
  if (!country) return 1;
  const lower = country.trim().toLowerCase();
  return COUNTRY_TIMEZONE_MAP[lower] ?? 1;
}

/**
 * Convert a country name to a human-readable timezone string.
 * e.g. "Czech Republic" → "UTC+1 (CET)"
 */
export function countryToTimezoneString(country: string | undefined): string {
  if (!country) return 'UTC+1';
  const offset = countryToTimezoneOffset(country);
  const sign = offset >= 0 ? '+' : '';
  const offsetStr = Number.isInteger(offset) ? `${offset}` : `${offset}`;
  return `UTC${sign}${offsetStr}`;
}

// ============================================================================
// V3 keyword patterns (matched against actual CSV column headers from XLSX export)
// ============================================================================

/** V3 shared fields (both mentees and mentors) */
export const V3_SHARED_PATTERNS = {
  email: [['email']],
  name: [['name']],
  business_title: [['business title']],
  compensation_grade: [['compensation grade']],
  country: [['location address', 'country'], ['country']],
  org_level_04: [['org level 04'], ['organization level 04']],
  org_level_05: [['org level 05'], ['organization level 05']],
  slack_user_id: [['slack user id'], ['slack']],
  bio: [['tell us about your role'], ['few lines', 'role'], ['context about your role']],
  role_selection: [['participate as'], ['want to participate']],
} as const;

/** V3 mentee-specific patterns (Q7–Q14) */
export const V3_MENTEE_PATTERNS = {
  capabilities_wanted: [['capabilities', 'develop'], ['skills', 'develop'], ['capability', 'build']],
  role_specific_area: [['job-specific'], ['role-specific'], ['role-related', 'mentoring']],
  mentoring_goal: [['mentoring goal'], ['using the format'], ['what would you like to achieve']],
  specific_challenge: [['specific situation'], ['specific challenge'], ['situation or challenge']],
  mentor_help_wanted: [['kind of mentor help'], ['mentor help'], ['support from your mentor']],
  open_to_first_time_mentor: [['open to', 'first-time'], ['first-time mentor'], ['first time mentor']],
  preferred_style: [['session style', 'mentee'], ['session style preference'], ['session style']],
  feedback_preference: [['feedback style', 'mentee'], ['feedback style preference'], ['feedback style']],
} as const;

/** V3 mentor-specific patterns (Q15–Q25) */
export const V3_MENTOR_PATTERNS = {
  mentor_motivation: [['want to mentor'], ['hope to get out'], ['motivation']],
  capacity: [['how many mentees'], ['mentees would you']],
  mentoring_experience: [['first time mentoring'], ['first time as a mentor'], ['first time mentor']],
  mentor_support_wanted: [['support', 'feel confident'], ['what support']],
  capabilities_offered: [['capabilities', 'confident', 'mentor'], ['confident mentoring'], ['feel confident']],
  role_specific_offering: [['benefit from', 'job'], ['job', 'field', 'mentee'], ['role-specific', 'offering']],
  meaningful_impact: [['meaningful impact'], ['impact', 'story']],
  natural_strengths: [['naturally bring'], ['natural strengths'], ['pick up to']],
  mentor_session_style: [['session style', 'mentor'], ['preferred session style']],
  topics_prefer_not: [['prefer not', 'matched'], ['prefer not to', 'mentor'], ['topics', 'prefer not']],
  match_exclusions: [['make a match not work'], ['anything else', 'match']],
} as const;

// ============================================================================
// V3 extraction interfaces
// ============================================================================

export interface V3SharedFields {
  email?: string;
  name?: string;
  business_title?: string;
  compensation_grade?: string;
  country?: string;
  org_level_04?: string;
  org_level_05?: string;
  slack_user_id?: string;
  bio?: string;
  role_selection: 'mentee' | 'mentor' | 'both';
}

export interface V3MenteeFields {
  capabilities_wanted?: string;
  role_specific_area?: string;
  mentoring_goal?: string;
  specific_challenge?: string;
  mentor_help_wanted: string[];
  open_to_first_time_mentor?: string;
  preferred_style?: string;
  feedback_preference?: string;
}

export interface V3MentorFields {
  mentor_motivation?: string;
  capacity_remaining: number;
  mentoring_experience?: string;
  has_mentored_before: boolean;
  mentor_support_wanted: string[];
  capabilities_offered?: string;
  role_specific_offering?: string;
  meaningful_impact?: string;
  natural_strengths: string[];
  mentor_session_style?: string;
  topics_prefer_not?: string;
  match_exclusions?: string;
}

// ============================================================================
// V3 extraction functions
// ============================================================================

/**
 * Extract shared bio fields from a V3 survey row (with Workday enrichment).
 */
export function extractV3SharedFields(row: Record<string, string>): V3SharedFields {
  const f = (patterns: readonly (readonly string[])[]) => findColumnByKeywords(row, patterns);

  // Determine role selection
  const roleRaw = f(V3_SHARED_PATTERNS.role_selection) || '';
  const roleLower = roleRaw.toLowerCase();
  let role_selection: 'mentee' | 'mentor' | 'both' = 'mentee';
  if (roleLower.includes('both') || (roleLower.includes('mentee') && roleLower.includes('mentor'))) {
    role_selection = 'both';
  } else if (roleLower.includes('mentor')) {
    role_selection = 'mentor';
  }

  return {
    email: f(V3_SHARED_PATTERNS.email),
    name: f(V3_SHARED_PATTERNS.name),
    business_title: f(V3_SHARED_PATTERNS.business_title),
    compensation_grade: f(V3_SHARED_PATTERNS.compensation_grade),
    country: f(V3_SHARED_PATTERNS.country),
    org_level_04: f(V3_SHARED_PATTERNS.org_level_04),
    org_level_05: f(V3_SHARED_PATTERNS.org_level_05),
    slack_user_id: f(V3_SHARED_PATTERNS.slack_user_id),
    bio: f(V3_SHARED_PATTERNS.bio),
    role_selection,
  };
}

/**
 * Extract mentee-specific fields from a V3 survey row.
 * Returns null if no mentee data is populated.
 */
export function extractV3MenteeFields(row: Record<string, string>): V3MenteeFields | null {
  const f = (patterns: readonly (readonly string[])[]) => findColumnByKeywords(row, patterns);

  const capabilitiesWanted = f(V3_MENTEE_PATTERNS.capabilities_wanted);
  const goal = f(V3_MENTEE_PATTERNS.mentoring_goal);

  // If no capabilities and no goal, likely not a mentee response
  if (!capabilitiesWanted && !goal) return null;

  return {
    capabilities_wanted: capabilitiesWanted,
    role_specific_area: f(V3_MENTEE_PATTERNS.role_specific_area),
    mentoring_goal: goal,
    specific_challenge: f(V3_MENTEE_PATTERNS.specific_challenge),
    mentor_help_wanted: parseMultiSelect(f(V3_MENTEE_PATTERNS.mentor_help_wanted)),
    open_to_first_time_mentor: f(V3_MENTEE_PATTERNS.open_to_first_time_mentor),
    preferred_style: f(V3_MENTEE_PATTERNS.preferred_style),
    feedback_preference: f(V3_MENTEE_PATTERNS.feedback_preference),
  };
}

/**
 * Extract mentor-specific fields from a V3 survey row.
 * Returns null if no mentor data is populated.
 */
export function extractV3MentorFields(row: Record<string, string>): V3MentorFields | null {
  const f = (patterns: readonly (readonly string[])[]) => findColumnByKeywords(row, patterns);

  const capabilitiesOffered = f(V3_MENTOR_PATTERNS.capabilities_offered);
  const motivation = f(V3_MENTOR_PATTERNS.mentor_motivation);

  // If no capabilities and no motivation, likely not a mentor response
  if (!capabilitiesOffered && !motivation) return null;

  const experienceText = f(V3_MENTOR_PATTERNS.mentoring_experience);

  return {
    mentor_motivation: motivation,
    capacity_remaining: parseCapacityText(f(V3_MENTOR_PATTERNS.capacity)),
    mentoring_experience: experienceText,
    has_mentored_before: parseMentoringExperience(experienceText),
    mentor_support_wanted: parseMultiSelect(f(V3_MENTOR_PATTERNS.mentor_support_wanted)),
    capabilities_offered: capabilitiesOffered,
    role_specific_offering: f(V3_MENTOR_PATTERNS.role_specific_offering),
    meaningful_impact: f(V3_MENTOR_PATTERNS.meaningful_impact),
    natural_strengths: parseMultiSelect(f(V3_MENTOR_PATTERNS.natural_strengths)),
    mentor_session_style: f(V3_MENTOR_PATTERNS.mentor_session_style),
    topics_prefer_not: f(V3_MENTOR_PATTERNS.topics_prefer_not),
    match_exclusions: f(V3_MENTOR_PATTERNS.match_exclusions),
  };
}
