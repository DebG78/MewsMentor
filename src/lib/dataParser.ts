import {
  MenteeData,
  MentorData,
  ImportResult,
  DataValidationError,
  DEVELOPMENT_TOPICS,
  EXPERIENCE_MAPPING,
  Cohort,
} from "@/types/mentoring";
import type { CreateVIPScoreInput, PersonType } from '@/types/vip';
import type { CreateMetricSnapshotInput } from '@/types/metrics';
import type { CreateSessionInput, SessionStatus } from '@/lib/sessionService';
import { resolvePairByName, type ResolvedPair } from '@/lib/personPairResolver';
import * as XLSX from 'xlsx';

// CSV parsing utility
export function parseCSV(csvText: string): Record<string, string>[] {
  // Remove BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse headers with better handling of quotes and commas
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = (values[index] || '').trim();
      });
      rows.push(row);
    }
  }

  return rows;
}

// Handle CSV parsing with quoted fields and commas
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map(val => val.replace(/^"(.*)"$/, '$1').trim());
}

// Identify if a row represents a mentee or mentor
// Returns 'mentee', 'mentor', 'both', or 'unknown'
export function identifyRowType(row: Record<string, string>): 'mentee' | 'mentor' | 'both' | 'unknown' {
  const keys = Object.keys(row);

  // FIRST: Check for explicit "Role Type" column (most reliable)
  const roleTypeKey = keys.find(key => key.toLowerCase().trim() === 'role type');
  if (roleTypeKey) {
    const roleValue = (row[roleTypeKey] || '').toLowerCase().trim();
    console.log('identifyRowType - found Role Type column:', roleValue);

    if (roleValue === 'mentor') {
      return 'mentor';
    } else if (roleValue === 'mentee') {
      return 'mentee';
    } else if (roleValue === 'both') {
      return 'both';
    }
    // If Role Type column exists but has unexpected value, log warning and continue with fallback detection
    console.log('identifyRowType - Role Type value not recognized:', roleValue, '- falling back to header detection');
  }

  // FALLBACK: Header-based detection for files without Role Type column
  console.log('identifyRowType - no Role Type column, checking headers:', keys.slice(0, 10));

  // Check for STRONG mentor indicators first (these are very specific to mentor files)
  const hasStrongMentorFields = keys.some(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('have you mentored before') ||
           lowerKey.includes('what do you hope to gain from being a mentor') ||
           lowerKey.includes('how often would you ideally like to meet with a mentee') ||
           lowerKey.includes('what type of meeting style do you usually prefer') ||
           lowerKey.includes('what\'s your feedback style') ||
           lowerKey.includes('topics you would prefer not to mentor') ||
           (lowerKey === 'early-career') ||
           (lowerKey === 'mid-level') ||
           (lowerKey === 'senior stretch role');
  });

  if (hasStrongMentorFields) {
    console.log('identifyRowType - detected as MENTOR (strong indicators)');
    return 'mentor';
  }

  // Check for mentee indicators
  const hasMenteeFields = keys.some(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('what\'s the main reason you\'d like a mentor') ||
           lowerKey.includes('what kind of mentor style do you think would help you most') ||
           lowerKey.includes('what kind of mentor energy would help you thrive') ||
           lowerKey.includes('how do you prefer to receive feedback') ||
           lowerKey.includes('what do you not want in a mentor') ||
           lowerKey.includes('how often would you ideally like to meet with a mentor') ||
           lowerKey.includes('why would you like to join the mentorship program') ||
           lowerKey.includes('🤝 mentoring style preferences') ||
           lowerKey.includes('what qualities would you like in a mentor');
  });

  // Check for weaker mentor indicators
  const hasMentorFields = keys.some(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('your mentoring style') ||
           lowerKey.includes('how would you describe your energy as a mentor');
  });

  if (hasMenteeFields) {
    console.log('identifyRowType - detected as MENTEE');
    return 'mentee';
  }

  if (hasMentorFields) {
    console.log('identifyRowType - detected as MENTOR (weak indicators)');
    return 'mentor';
  }

  // Last resort fallback
  const hasSubstantialData = Object.values(row).filter(v => v && v.trim().length > 0).length >= 3;
  if (hasSubstantialData) {
    console.log('identifyRowType - detected as MENTEE (fallback - no clear indicators)');
    return 'mentee';
  }

  console.log('identifyRowType - UNKNOWN');
  return 'unknown';
}

// Extract development topics from text
function extractDevelopmentTopics(text: string): string[] {
  if (!text) return [];

  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  DEVELOPMENT_TOPICS.forEach(topic => {
    // Check if topic keywords appear in the text
    const keywords = topic.toLowerCase().split(/[&/,]/).map(k => k.trim());
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      topics.push(topic);
    }
  });

  return topics;
}

// Map experience years to seniority band
function mapExperienceToSeniority(experience: string): string {
  const cleaned = experience.trim();

  for (const [range, seniority] of Object.entries(EXPERIENCE_MAPPING)) {
    if (cleaned.includes(range)) {
      return seniority;
    }
  }

  // Default mapping for edge cases
  if (cleaned.includes('0') || cleaned.includes('1') || cleaned.includes('2')) return 'IC1';
  if (cleaned.includes('3') || cleaned.includes('4') || cleaned.includes('5')) return 'IC2';
  if (cleaned.includes('6') || cleaned.includes('7') || cleaned.includes('8') || cleaned.includes('9')) return 'IC3';
  if (cleaned.includes('10') || cleaned.includes('+')) return 'IC4';

  return 'IC2'; // Default
}

// Parse mentee data from CSV row
export function parseMenteeRow(row: Record<string, string>): MenteeData | null {
  const id = row['#'] || row['id'];
  if (!id) return null;

  // Extract name from "Full Name" or "Name" column, fall back to id
  const name = row['Full Name'] || row['Name'] || row['full_name'] || row['name'] || id;

  // Extract development topics from boolean columns
  const topicsToLearn: string[] = [];
  const topicColumns = [
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
  ];

  topicColumns.forEach(topic => {
    if (row[topic] && row[topic].trim() && row[topic] !== '0') {
      topicsToLearn.push(topic);
    }
  });

  // Check if there's an "Other" topic specified
  const otherTopicValue = row["Other (please specify in the next slide)_1"];
  if (otherTopicValue && otherTopicValue.trim()) {
    topicsToLearn.push(`Other: ${otherTopicValue.trim()}`);
  }

  // Collect life experiences from boolean columns
  const lifeExperiences: string[] = [];
  const lifeExperienceColumns = [
    "Returning from maternity/paternity/parental leave",
    "Navigating menopause or andropause",
    "Career break / sabbatical",
    "Relocation to a new country",
    "Career change or industry switch",
    "Managing health challenges (physical or mental)",
    "Stepping into leadership for the first time",
    "Working towards a promotion",
    "Thinking about an internal move"
  ];

  lifeExperienceColumns.forEach(experience => {
    if (row[experience] && row[experience].trim() && row[experience] !== '0') {
      lifeExperiences.push(experience);
    }
  });

  // Check if there's an "Other" life experience specified
  const otherExperienceValue = row["You picked Other - we'd love to hear more. What experience would you add?"];
  if (otherExperienceValue && otherExperienceValue.trim()) {
    lifeExperiences.push(`Other: ${otherExperienceValue.trim()}`);
  }

  // Build goals text from motivation and expectations
  const motivationKey = Object.keys(row).find(key =>
    key.includes("Why would you like to join the mentorship program?")
  );
  const motivation = motivationKey ? row[motivationKey] : '';

  const mainReason = row["What's the main reason you'd like a mentor?"] || '';

  const expectationsKey = Object.keys(row).find(key =>
    key.includes("What expectations do you have for the mentorship program")
  );
  const expectations = expectationsKey ? row[expectationsKey] : '';

  const goalsText = [motivation, mainReason, expectations]
    .filter(text => text.trim())
    .join(' ');

  // Find exact column names from the row keys (fix operator precedence: || before ?:)
  const roleKey = Object.keys(row).find(key => key.toLowerCase().includes('current role'));
  let roleValue = row["What's your current role at Mews?"] || (roleKey ? row[roleKey] : '');

  const expKey = Object.keys(row).find(key => key.toLowerCase().includes('years of work experience'));
  let experienceValue = row["How many years of work experience do you have?"] || (expKey ? row[expKey] : '');

  const locKey = Object.keys(row).find(key => key.toLowerCase().includes('where are you based'));
  let locationValue = row["Where are you based (location/time zone)?"] || (locKey ? row[locKey] : '');

  // Content-based validation to detect misaligned columns (e.g. extra survey columns shifting data)
  const locationPattern = /\b(UTC|GMT|CET|CEST|EST|PST|CST|MST|EET|WET|AEST|JST|IST|BST|NZST|HKT|SGT|europe|america|asia|africa|pacific|australia|prague|london|berlin|paris|amsterdam|barcelona|lisbon|vienna|dublin|new york|san francisco|los angeles|chicago|toronto|tokyo|sydney|singapore|hong kong|mumbai|dubai|cairo|time.?zone|central\s+europe|eastern\s+europe|western\s+europe)\b/i;
  const experiencePattern = /^(0[-–]2|3[-–]5|6[-–]10|10\+|15\+|\d+[-–]\d+|\d+\s*\+)/;

  // Detect if role column actually contains location data
  if (roleValue && locationPattern.test(roleValue) && !locationValue) {
    console.log(`Column misalignment detected: role "${roleValue}" looks like location, swapping`);
    locationValue = roleValue;
    roleValue = '';
  }

  // Detect if role column actually contains experience data
  if (roleValue && experiencePattern.test(roleValue.trim()) && !experienceValue) {
    console.log(`Column misalignment detected: role "${roleValue}" looks like experience, swapping`);
    experienceValue = roleValue;
    roleValue = '';
  }

  // Detect if experience column actually contains location data
  if (experienceValue && locationPattern.test(experienceValue) && !locationValue) {
    console.log(`Column misalignment detected: experience "${experienceValue}" looks like location, swapping`);
    locationValue = experienceValue;
    experienceValue = '';
  }

  // If role is still empty, check other columns for job-title-like data
  if (!roleValue) {
    const emailKey = Object.keys(row).find(key => key.toLowerCase().includes('work email') || key.toLowerCase().includes('email'));
    if (emailKey) {
      const emailVal = row[emailKey];
      if (emailVal && !emailVal.includes('@') && emailVal.length > 2) {
        console.log(`Found role in email column: "${emailVal}"`);
        roleValue = emailVal;
      }
    }
  }

  // If experience is still empty, scan columns for experience-like values
  if (!experienceValue) {
    for (const [key, value] of Object.entries(row)) {
      if (value && experiencePattern.test(value.trim())) {
        const lk = key.toLowerCase();
        if (!lk.includes('current role') && !lk.includes('where are you based') && !lk.includes('#') && !lk.includes('full name')) {
          console.log(`Found experience in column "${key}": "${value}"`);
          experienceValue = value;
          break;
        }
      }
    }
  }

  // Find department column with flexible matching
  const deptKey = Object.keys(row).find(key => {
    const lk = key.toLowerCase();
    return lk.includes('department') || lk.includes('team') || lk.includes('business unit');
  });
  const departmentValue = deptKey ? row[deptKey] : '';

  // Find job grade column with flexible matching
  const gradeKey = Object.keys(row).find(key => {
    const lk = key.toLowerCase();
    return lk.includes('job grade') || lk.includes('job_grade') || lk.includes('grade') || lk.includes('band');
  });
  const jobGradeValue = gradeKey ? row[gradeKey] : '';

  // Find email column with flexible matching
  const menteeEmailKey = Object.keys(row).find(key => {
    const lk = key.toLowerCase();
    return lk === 'email' || lk === 'work email' || lk === 'email address' || lk.includes('e-mail');
  });
  const menteeEmailValue = menteeEmailKey ? row[menteeEmailKey] : '';

  const result = {
    id,
    name,
    pronouns: row["Do you want to share your pronouns?"] || '',
    role: roleValue,
    experience_years: experienceValue,
    location_timezone: locationValue,
    department: departmentValue,
    job_grade: jobGradeValue,
    email: menteeEmailValue && menteeEmailValue.includes('@') ? menteeEmailValue.trim() : undefined,

    // Store life experiences as collected array
    life_experiences: lifeExperiences,

    // Store topics as collected array
    topics_to_learn: topicsToLearn,

    // Preferences
    motivation,
    main_reason: mainReason,
    preferred_mentor_style: Object.keys(row).find(key => key.includes("What kind of mentor style"))
      ? row[Object.keys(row).find(key => key.includes("What kind of mentor style"))!] : '',
    preferred_mentor_energy: row["What kind of mentor energy would help you thrive?"] || '',
    feedback_preference: row["How do you prefer to receive feedback?"] || '',
    mentor_experience_importance: row["How important is it to you that your mentor has prior mentoring experience?"] || '',
    what_not_wanted: row["What do you NOT want in a mentor?"] || '',
    meeting_frequency: row["How often would you ideally like to meet with a mentor?"] || '',
    desired_qualities: Object.keys(row).find(key => key.includes("What qualities would you like in a mentor"))
      ? row[Object.keys(row).find(key => key.includes("What qualities would you like in a mentor"))!] : '',
    expectations,

    // Computed fields
    goals_text: goalsText,
    seniority_band: mapExperienceToSeniority(row["How many years of work experience do you have?"] || ''),
    languages: ['English'] // Default to English
  };

  console.log('Parsed mentee data:', {
    id: result.id,
    role: result.role,
    experience_years: result.experience_years,
    location_timezone: result.location_timezone,
    life_experiences: result.life_experiences,
    topics_to_learn: result.topics_to_learn,
    meeting_frequency: result.meeting_frequency,
    availableColumns: Object.keys(row) // Show ALL column names for debugging
  });

  return result;
}

// Parse capacity from a row, with flexible column name matching
function parseCapacity(row: Record<string, string>, defaultCapacity: number): number {
  const capacityKey = Object.keys(row).find(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('capacity') ||
           lowerKey.includes('how many mentees') ||
           lowerKey.includes('how many people') ||
           lowerKey.includes('number of mentees') ||
           lowerKey.includes('mentee slots') ||
           lowerKey.includes('max mentees') ||
           (lowerKey.includes('how many') && lowerKey.includes('mentor'));
  });

  if (capacityKey) {
    const value = row[capacityKey].trim();
    console.log(`[parseCapacity] Column: "${capacityKey}", Raw value: "${value}"`);

    // Handle range values like "1-2", "0-1", "2-3" — take the higher number
    const rangeMatch = value.match(/^(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const high = parseInt(rangeMatch[2], 10);
      const result = Math.max(high, 1); // At least 1 if they signed up
      console.log(`[parseCapacity] Range detected, using: ${result}`);
      return result;
    }

    // Handle "3+" style
    const plusMatch = value.match(/^(\d+)\s*\+/);
    if (plusMatch) {
      return parseInt(plusMatch[1], 10);
    }

    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      console.log(`[parseCapacity] Parsed: ${parsed}`);
      return parsed;
    }

    console.log(`[parseCapacity] Could not parse value, using default: ${defaultCapacity}`);
  } else {
    console.log(`[parseCapacity] No capacity column found in: ${Object.keys(row).slice(0, 5).join(', ')}...`);
  }

  return defaultCapacity;
}

// Parse mentor data from CSV row
export function parseMentorRow(row: Record<string, string>): MentorData | null {
  const id = row['#'] || row['id'];
  if (!id) return null;

  // Extract name from "Full Name" or "Name" column, fall back to id
  const name = row['Full Name'] || row['Name'] || row['full_name'] || row['name'] || id;

  // Extract mentoring topics with flexible matching
  const topicsToMentor: string[] = [];

  // First try exact matches
  DEVELOPMENT_TOPICS.forEach(topic => {
    if (row[topic] && row[topic].trim()) {
      topicsToMentor.push(topic);
    }
  });

  // If no exact matches, try flexible matching
  if (topicsToMentor.length === 0) {
    Object.keys(row).forEach(columnName => {
      const value = row[columnName];
      if (value && value.trim()) {
        const lowerColumn = columnName.toLowerCase();

        // Look for columns that contain development topics keywords
        if (lowerColumn.includes('topic') ||
            lowerColumn.includes('skill') ||
            lowerColumn.includes('area') ||
            lowerColumn.includes('mentor') ||
            lowerColumn.includes('expertise') ||
            lowerColumn.includes('development')) {

          // Try to match the value to our predefined topics
          DEVELOPMENT_TOPICS.forEach(topic => {
            const lowerTopic = topic.toLowerCase();
            const lowerValue = value.toLowerCase();

            if (lowerValue.includes(lowerTopic.split(' ')[0]) || // Match first word
                lowerTopic.includes(lowerValue) ||
                lowerValue.includes('leadership') && lowerTopic.includes('leadership') ||
                lowerValue.includes('communication') && lowerTopic.includes('communication') ||
                lowerValue.includes('technical') && lowerTopic.includes('technical') ||
                lowerValue.includes('management') && lowerTopic.includes('management')) {

              if (!topicsToMentor.includes(topic)) {
                topicsToMentor.push(topic);
              }
            }
          });
        }
      }
    });
  }

  // Fallback: if still no topics found, extract from any text field that looks relevant
  if (topicsToMentor.length === 0) {
    Object.values(row).forEach(value => {
      if (value && value.length > 10) { // Only check substantial text
        const lowerValue = value.toLowerCase();

        DEVELOPMENT_TOPICS.forEach(topic => {
          const keywords = topic.toLowerCase().split(/[&\/\s]+/);
          const hasKeywords = keywords.some(keyword =>
            keyword.length > 2 && lowerValue.includes(keyword)
          );

          if (hasKeywords && !topicsToMentor.includes(topic)) {
            topicsToMentor.push(topic);
          }
        });
      }
    });
  }

  // Build bio text
  const motivation = row["💡 Motivation\n\nWhat do you hope to gain from being a mentor?"] ||
                    row["motivation"] || '';
  const expectations = row["🙌 Expectations\n\nWhat expectations do you have for the mentorship program? "] ||
                      row["expectations"] || '';

  const bioText = [motivation, expectations]
    .filter(text => text.trim())
    .join(' ');

  // Parse preferred mentee levels
  const preferredLevels: string[] = [];
  if (row["Early-career"]) preferredLevels.push("Early-career");
  if (row["Mid-level"]) preferredLevels.push("Mid-level");
  if (row["Senior stretch role"]) preferredLevels.push("Senior stretch role");

  // Find role column with flexible matching
  const roleKey = Object.keys(row).find(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('current role') ||
           lowerKey.includes('role at') ||
           lowerKey.includes('your role') ||
           key === "role";
  });

  // Find experience column with flexible matching
  const experienceKey = Object.keys(row).find(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('years of work experience') ||
           lowerKey.includes('work experience') ||
           lowerKey.includes('experience') ||
           key === "experience_years";
  });

  // Find location column with flexible matching
  const locationKey = Object.keys(row).find(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('where are you based') ||
           lowerKey.includes('location') ||
           lowerKey.includes('time zone') ||
           key === "location_timezone";
  });

  // Extract raw values
  let mentorRole = roleKey ? row[roleKey] : '';
  let mentorExperience = experienceKey ? row[experienceKey] : '';
  let mentorLocation = locationKey ? row[locationKey] : '';

  // Content-based validation to detect misaligned columns (same as mentee parser)
  const mentorLocationPattern = /\b(UTC|GMT|CET|CEST|EST|PST|CST|MST|EET|WET|AEST|JST|IST|BST|NZST|HKT|SGT|europe|america|asia|africa|pacific|australia|prague|london|berlin|paris|amsterdam|barcelona|lisbon|vienna|dublin|new york|san francisco|los angeles|chicago|toronto|tokyo|sydney|singapore|hong kong|mumbai|dubai|cairo|time.?zone|central\s+europe|eastern\s+europe|western\s+europe)\b/i;
  const mentorExperiencePattern = /^(0[-–]2|3[-–]5|6[-–]10|10\+|15\+|\d+[-–]\d+|\d+\s*\+)/;

  if (mentorRole && mentorLocationPattern.test(mentorRole) && !mentorLocation) {
    console.log(`Mentor column misalignment: role "${mentorRole}" looks like location, swapping`);
    mentorLocation = mentorRole;
    mentorRole = '';
  }
  if (mentorRole && mentorExperiencePattern.test(mentorRole.trim()) && !mentorExperience) {
    console.log(`Mentor column misalignment: role "${mentorRole}" looks like experience, swapping`);
    mentorExperience = mentorRole;
    mentorRole = '';
  }
  if (mentorExperience && mentorLocationPattern.test(mentorExperience) && !mentorLocation) {
    console.log(`Mentor column misalignment: experience "${mentorExperience}" looks like location, swapping`);
    mentorLocation = mentorExperience;
    mentorExperience = '';
  }

  // If role is still empty, check email column for job-title-like data
  if (!mentorRole) {
    const emailKey = Object.keys(row).find(key => key.toLowerCase().includes('work email') || key.toLowerCase().includes('email'));
    if (emailKey) {
      const emailVal = row[emailKey];
      if (emailVal && !emailVal.includes('@') && emailVal.length > 2) {
        console.log(`Found mentor role in email column: "${emailVal}"`);
        mentorRole = emailVal;
      }
    }
  }

  // If experience is still empty, scan for experience-like values
  if (!mentorExperience) {
    for (const [key, value] of Object.entries(row)) {
      if (value && mentorExperiencePattern.test(value.trim())) {
        const lk = key.toLowerCase();
        if (!lk.includes('current role') && !lk.includes('where are you based') && !lk.includes('#') && !lk.includes('full name')) {
          console.log(`Found mentor experience in column "${key}": "${value}"`);
          mentorExperience = value;
          break;
        }
      }
    }
  }

  // Find department column with flexible matching
  const mentorDeptKey = Object.keys(row).find(key => {
    const lk = key.toLowerCase();
    return lk.includes('department') || lk.includes('team') || lk.includes('business unit');
  });
  const mentorDepartment = mentorDeptKey ? row[mentorDeptKey] : '';

  // Find job grade column with flexible matching
  const mentorGradeKey = Object.keys(row).find(key => {
    const lk = key.toLowerCase();
    return lk.includes('job grade') || lk.includes('job_grade') || lk.includes('grade') || lk.includes('band');
  });
  const mentorJobGrade = mentorGradeKey ? row[mentorGradeKey] : '';

  // Find email column with flexible matching
  const mentorEmailKey = Object.keys(row).find(key => {
    const lk = key.toLowerCase();
    return lk === 'email' || lk === 'work email' || lk === 'email address' || lk.includes('e-mail');
  });
  const mentorEmailValue = mentorEmailKey ? row[mentorEmailKey] : '';

  return {
    id,
    name,
    pronouns: row["Do you want to share your pronouns?"],
    role: mentorRole,
    experience_years: mentorExperience,
    location_timezone: mentorLocation,
    department: mentorDepartment,
    job_grade: mentorJobGrade,
    email: mentorEmailValue && mentorEmailValue.includes('@') ? mentorEmailValue.trim() : undefined,

    // Life experiences
    returning_from_leave: !!row["Returning from maternity/paternity/parental leave"],
    navigating_menopause: !!row["Navigating menopause or andropause"],
    career_break: !!row["Career break / sabbatical"],
    relocation: !!row["Relocation to a new country"],
    career_change: !!row["Career change or industry switch"],
    health_challenges: !!row["Managing health challenges (physical or mental)"],
    stepping_into_leadership: !!row["Stepping into leadership for the first time"],
    promotions: !!row["Promotions"] || !!row["Working towards a promotion"],
    internal_moves: !!row["Internal moves"] || !!row["Thinking about an internal move"],
    other_experience: row["You picked Other - we'd love to hear more. What experience would you add?_1"],

    topics_to_mentor: topicsToMentor,

    // Mentoring approach
    has_mentored_before: row["Have you mentored before?"] === "1",
    mentoring_style: row["🤝 Your mentoring style\n\nEvery mentor is unique - this helps us match your style with a mentee who'll thrive with you.\n\nHow would you describe your preferred mentoring style? "] || '',
    meeting_style: row["What type of meeting style do you usually prefer?"] || '',
    mentor_energy: row["How would you describe your energy as a mentor? "] || '',
    feedback_style: row["What's your feedback style?"] || '',
    preferred_mentee_levels: preferredLevels,
    topics_not_to_mentor: row["Are there any topics you would prefer NOT to mentor on? "]?.split(',').map(t => t.trim()) || [],
    meeting_frequency: row["How often would you ideally like to meet with a mentee?"] || '',
    motivation,
    expectations,

    // Computed fields
    bio_text: bioText,
    capacity_remaining: parseCapacity(row, 1),
    seniority_band: mapExperienceToSeniority(row["How many years of work experience do you have?"] || ''),
    languages: [] // TODO: Extract from text or add to CSV
  };
}

// Parse Excel file to array of row objects
async function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
    raw: false,  // Convert all values to strings
    defval: ''   // Default value for empty cells
  });

  return jsonData;
}

// Check if file is an Excel format
function isExcelFile(file: File): boolean {
  const excelTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ];
  const excelExtensions = ['.xlsx', '.xls'];

  return excelTypes.includes(file.type) ||
         excelExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

// Main data import function
export async function importMentoringData(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mentees: MenteeData[] = [];
  const mentors: MentorData[] = [];

  try {
    let rows: Record<string, string>[];

    // Handle Excel files differently from CSV
    if (isExcelFile(file)) {
      console.log('Parsing Excel file...');
      rows = await parseExcelFile(file);
    } else {
      console.log('Parsing CSV file...');
      const text = await file.text();
      rows = parseCSV(text);
    }

    console.log('Parsed rows:', rows.length, 'First row keys:', rows[0] ? Object.keys(rows[0]).slice(0, 5) : 'none');

    if (rows.length === 0) {
      errors.push("No data found in file");
      return { mentees, mentors, errors, warnings };
    }

    // Process each row
    rows.forEach((row, index) => {
      const rowType = identifyRowType(row);

      if (rowType === 'mentee' || rowType === 'both') {
        const mentee = parseMenteeRow(row);
        if (mentee) {
          // Validate required fields
          if (!mentee.role) {
            warnings.push(`Row ${index + 2}: Mentee missing role`);
          }
          if (mentee.topics_to_learn.length === 0) {
            warnings.push(`Row ${index + 2}: Mentee has no development topics selected`);
          }
          mentees.push(mentee);
        } else {
          warnings.push(`Row ${index + 2}: Could not parse mentee data`);
        }
      }

      if (rowType === 'mentor' || rowType === 'both') {
        const mentor = parseMentorRow(row);
        if (mentor) {
          // Validate required fields
          if (!mentor.role) {
            warnings.push(`Row ${index + 2}: Mentor missing role`);
          }
          if (mentor.topics_to_mentor.length === 0) {
            warnings.push(`Row ${index + 2}: Mentor has no mentoring topics selected`);
          }
          mentors.push(mentor);
        } else {
          warnings.push(`Row ${index + 2}: Could not parse mentor data`);
        }
      }

      if (rowType === 'unknown') {
        warnings.push(`Row ${index + 2}: Could not identify as mentor or mentee`);
      }
    });

    if (mentees.length === 0 && mentors.length === 0) {
      errors.push("No valid mentor or mentee data found");
    }

  } catch (error) {
    errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { mentees, mentors, errors, warnings };
}

// ============================================================================
// ANALYTICS CSV PARSERS
// ============================================================================

export interface CSVParseResult<T> {
  data: T[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse Session Log CSV
 * Expected columns: mentor_id, mentee_id, cohort_id, meeting_date, duration_minutes, status, notes, mentor_rating, mentee_rating
 */
export function parseSessionCSV(csvText: string): CSVParseResult<CreateSessionInput> {
  const rows = parseCSV(csvText);
  const data: CreateSessionInput[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push('No data found in CSV');
    return { data, errors, warnings };
  }

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase());
  const requiredCols = ['mentor_id', 'mentee_id', 'cohort_id', 'meeting_date'];
  const missingCols = requiredCols.filter(col =>
    !headers.some(h => h.replace(/\s+/g, '_').includes(col))
  );
  if (missingCols.length > 0) {
    errors.push(`Missing required columns: ${missingCols.join(', ')}`);
    return { data, errors, warnings };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row + 0-index

    // Find values with flexible column name matching
    const mentorId = findColumnValue(row, ['mentor_id']);
    const menteeId = findColumnValue(row, ['mentee_id']);
    const cohortId = findColumnValue(row, ['cohort_id']);
    const meetingDate = findColumnValue(row, ['meeting_date', 'date', 'scheduled_datetime']);
    const durationStr = findColumnValue(row, ['duration_minutes', 'duration']);
    const statusStr = findColumnValue(row, ['status']);
    const notes = findColumnValue(row, ['notes']);
    const mentorRatingStr = findColumnValue(row, ['mentor_rating']);
    const menteeRatingStr = findColumnValue(row, ['mentee_rating']);

    if (!mentorId || !menteeId || !cohortId) {
      errors.push(`Row ${rowNum}: Missing mentor_id, mentee_id, or cohort_id`);
      continue;
    }

    if (!meetingDate) {
      errors.push(`Row ${rowNum}: Missing meeting_date`);
      continue;
    }

    // Validate and normalize date
    const parsedDate = new Date(meetingDate);
    if (isNaN(parsedDate.getTime())) {
      errors.push(`Row ${rowNum}: Invalid date "${meetingDate}"`);
      continue;
    }

    // Validate status
    const validStatuses: SessionStatus[] = ['scheduled', 'completed', 'cancelled', 'no_show'];
    const status = statusStr?.toLowerCase().replace(/[\s-]/g, '_') as SessionStatus;
    if (statusStr && !validStatuses.includes(status)) {
      warnings.push(`Row ${rowNum}: Unknown status "${statusStr}", defaulting to "completed"`);
    }

    const duration = durationStr ? parseInt(durationStr, 10) : 60;
    if (durationStr && isNaN(duration)) {
      warnings.push(`Row ${rowNum}: Invalid duration "${durationStr}", defaulting to 60`);
    }

    const session: CreateSessionInput = {
      mentor_id: mentorId,
      mentee_id: menteeId,
      cohort_id: cohortId,
      title: `Session - ${parsedDate.toLocaleDateString()}`,
      scheduled_datetime: parsedDate.toISOString(),
      duration_minutes: isNaN(duration) ? 60 : duration,
      status: validStatuses.includes(status) ? status : 'completed',
      notes: notes || undefined,
    };

    // Attach ratings as extra metadata (caller will use updateSession for these)
    const mentorRating = mentorRatingStr ? parseFloat(mentorRatingStr) : undefined;
    const menteeRating = menteeRatingStr ? parseFloat(menteeRatingStr) : undefined;

    if (mentorRating !== undefined && !isNaN(mentorRating)) {
      (session as Record<string, unknown>)['_mentor_rating'] = Math.min(Math.max(mentorRating, 1), 5);
    }
    if (menteeRating !== undefined && !isNaN(menteeRating)) {
      (session as Record<string, unknown>)['_mentee_rating'] = Math.min(Math.max(menteeRating, 1), 5);
    }

    data.push(session);
  }

  return { data, errors, warnings };
}

/**
 * Parse Survey/Feedback CSV
 * Expected columns: respondent_id, respondent_type, cohort_id, survey_date, satisfaction_score, nps_score, would_recommend
 */
export function parseSurveyCSV(csvText: string): CSVParseResult<CreateMetricSnapshotInput> {
  const rows = parseCSV(csvText);
  const data: CreateMetricSnapshotInput[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push('No data found in CSV');
    return { data, errors, warnings };
  }

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase());
  const requiredCols = ['cohort_id'];
  const missingCols = requiredCols.filter(col =>
    !headers.some(h => h.replace(/\s+/g, '_').includes(col))
  );
  if (missingCols.length > 0) {
    errors.push(`Missing required columns: ${missingCols.join(', ')}`);
    return { data, errors, warnings };
  }

  // Aggregate scores per cohort + date combination
  const aggregator = new Map<string, {
    cohortId: string;
    date: string;
    satisfaction: number[];
    nps: number[];
    recommend: number[];
  }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const cohortId = findColumnValue(row, ['cohort_id']);
    const surveyDate = findColumnValue(row, ['survey_date', 'date']);
    const satisfactionStr = findColumnValue(row, ['satisfaction_score', 'satisfaction']);
    const npsStr = findColumnValue(row, ['nps_score', 'nps']);
    const recommendStr = findColumnValue(row, ['would_recommend', 'recommend']);

    if (!cohortId) {
      errors.push(`Row ${rowNum}: Missing cohort_id`);
      continue;
    }

    const date = surveyDate || new Date().toISOString().split('T')[0];
    const key = `${cohortId}:${date}`;

    if (!aggregator.has(key)) {
      aggregator.set(key, { cohortId, date, satisfaction: [], nps: [], recommend: [] });
    }
    const agg = aggregator.get(key)!;

    if (satisfactionStr) {
      const val = parseFloat(satisfactionStr);
      if (!isNaN(val)) agg.satisfaction.push(val);
      else warnings.push(`Row ${rowNum}: Invalid satisfaction_score "${satisfactionStr}"`);
    }

    if (npsStr) {
      const val = parseFloat(npsStr);
      if (!isNaN(val)) agg.nps.push(val);
      else warnings.push(`Row ${rowNum}: Invalid nps_score "${npsStr}"`);
    }

    if (recommendStr) {
      const val = recommendStr.toLowerCase();
      if (['yes', '1', 'true'].includes(val)) agg.recommend.push(1);
      else if (['no', '0', 'false'].includes(val)) agg.recommend.push(0);
      else {
        const numVal = parseFloat(recommendStr);
        if (!isNaN(numVal)) agg.recommend.push(numVal);
      }
    }
  }

  // Create metric snapshots from aggregated data
  for (const agg of aggregator.values()) {
    if (agg.satisfaction.length > 0) {
      const avg = agg.satisfaction.reduce((a, b) => a + b, 0) / agg.satisfaction.length;
      data.push({
        cohort_id: agg.cohortId,
        metric_name: 'satisfaction_score',
        actual_value: Math.round(avg * 10) / 10,
        snapshot_date: agg.date,
        notes: `Imported from survey CSV (${agg.satisfaction.length} responses)`,
      });
    }

    if (agg.nps.length > 0) {
      const avg = agg.nps.reduce((a, b) => a + b, 0) / agg.nps.length;
      data.push({
        cohort_id: agg.cohortId,
        metric_name: 'nps_score',
        actual_value: Math.round(avg * 10) / 10,
        snapshot_date: agg.date,
        notes: `Imported from survey CSV (${agg.nps.length} responses)`,
      });
    }

    if (agg.recommend.length > 0) {
      const rate = (agg.recommend.reduce((a, b) => a + b, 0) / agg.recommend.length) * 100;
      data.push({
        cohort_id: agg.cohortId,
        metric_name: 'would_recommend_rate',
        actual_value: Math.round(rate * 10) / 10,
        snapshot_date: agg.date,
        notes: `Imported from survey CSV (${agg.recommend.length} responses)`,
      });
    }
  }

  return { data, errors, warnings };
}

/**
 * Parse VIP Score CSV
 * Expected columns: person_id, person_type, cohort_id, engagement_score, session_score, response_score, feedback_score
 */
export function parseVIPScoreCSV(csvText: string): CSVParseResult<CreateVIPScoreInput> {
  const rows = parseCSV(csvText);
  const data: CreateVIPScoreInput[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push('No data found in CSV');
    return { data, errors, warnings };
  }

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase());
  const requiredCols = ['person_id', 'person_type'];
  const missingCols = requiredCols.filter(col =>
    !headers.some(h => h.replace(/\s+/g, '_').includes(col))
  );
  if (missingCols.length > 0) {
    errors.push(`Missing required columns: ${missingCols.join(', ')}`);
    return { data, errors, warnings };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const personId = findColumnValue(row, ['person_id']);
    const personTypeStr = findColumnValue(row, ['person_type', 'type']);
    const cohortId = findColumnValue(row, ['cohort_id']);
    const engagementStr = findColumnValue(row, ['engagement_score', 'engagement']);
    const sessionStr = findColumnValue(row, ['session_score', 'session']);
    const responseStr = findColumnValue(row, ['response_score', 'response']);
    const feedbackStr = findColumnValue(row, ['feedback_score', 'feedback']);

    if (!personId) {
      errors.push(`Row ${rowNum}: Missing person_id`);
      continue;
    }

    // Validate person type
    const validTypes: PersonType[] = ['mentor', 'mentee'];
    const personType = personTypeStr?.toLowerCase() as PersonType;
    if (!validTypes.includes(personType)) {
      errors.push(`Row ${rowNum}: Invalid person_type "${personTypeStr}" (must be "mentor" or "mentee")`);
      continue;
    }

    // Parse scores (0-25 each)
    const parseScore = (val: string | undefined, name: string): number => {
      if (!val) return 0;
      const num = parseFloat(val);
      if (isNaN(num)) {
        warnings.push(`Row ${rowNum}: Invalid ${name} "${val}", defaulting to 0`);
        return 0;
      }
      if (num < 0 || num > 25) {
        warnings.push(`Row ${rowNum}: ${name} ${num} out of range (0-25), clamping`);
      }
      return Math.min(Math.max(num, 0), 25);
    };

    data.push({
      person_id: personId,
      person_type: personType,
      cohort_id: cohortId || undefined,
      engagement_score: parseScore(engagementStr, 'engagement_score'),
      session_score: parseScore(sessionStr, 'session_score'),
      response_score: parseScore(responseStr, 'response_score'),
      feedback_score: parseScore(feedbackStr, 'feedback_score'),
    });
  }

  return { data, errors, warnings };
}

/**
 * Helper: find a value from a row using flexible column name matching.
 * Tries each candidate key, matching case-insensitively with underscores/spaces normalized.
 */
function findColumnValue(row: Record<string, string>, candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase().replace(/[\s_-]+/g, '_');

    // Exact match first
    if (row[candidate] !== undefined && row[candidate].trim()) {
      return row[candidate].trim();
    }

    // Flexible match
    for (const key of Object.keys(row)) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, '_');
      if (normalizedKey === normalized || normalizedKey.includes(normalized)) {
        if (row[key] !== undefined && row[key].trim()) {
          return row[key].trim();
        }
      }
    }
  }

  return undefined;
}

// ============================================================================
// SESSION LOG CSV PARSER (for MS Forms / external form exports)
// ============================================================================

export interface SessionLogRow {
  respondent_name: string;
  date: string;
  duration_minutes: number;
  rating: number;
  raw_row_index: number;
}

export interface SessionLogMatch extends SessionLogRow {
  pair: ResolvedPair;
}

export interface SessionLogUnmatched extends SessionLogRow {
  error: string;
  candidates: ResolvedPair[];
}

export interface SessionLogParseResult {
  matched: SessionLogMatch[];
  unmatched: SessionLogUnmatched[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse a session log CSV from MS Forms or similar external form.
 * Columns expected: name/respondent, date, duration, rating.
 * Automatically resolves respondent names to mentor-mentee pairs using active cohorts.
 */
export function parseSessionLogCSV(
  csvText: string,
  cohorts: Cohort[]
): SessionLogParseResult {
  const rows = parseCSV(csvText);
  const matched: SessionLogMatch[] = [];
  const unmatched: SessionLogUnmatched[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push('No data found in CSV');
    return { matched, unmatched, errors, warnings };
  }

  // Check for required-ish columns (name + date at minimum)
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, '_'));
  const hasName = headers.some(h =>
    ['name', 'respondent', 'full_name', 'respondent_name', 'your_name', 'your_full_name'].some(c => h.includes(c))
  );
  const hasDate = headers.some(h =>
    ['date', 'session_date', 'meeting_date', 'when'].some(c => h.includes(c))
  );

  if (!hasName) {
    errors.push('Missing name column. Expected one of: name, respondent, full_name, respondent_name');
    return { matched, unmatched, errors, warnings };
  }
  if (!hasDate) {
    errors.push('Missing date column. Expected one of: date, session_date, meeting_date');
    return { matched, unmatched, errors, warnings };
  }

  const VALID_DURATIONS = [15, 30, 45, 60, 90, 120];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row + 0-index

    const name = findColumnValue(row, ['respondent_name', 'your_name', 'your_full_name', 'full_name', 'respondent', 'name']);
    const dateStr = findColumnValue(row, ['session_date', 'meeting_date', 'date', 'when', 'when_did_you_meet']);
    const durationStr = findColumnValue(row, ['duration_minutes', 'duration', 'how_long', 'length']);
    const ratingStr = findColumnValue(row, ['rating', 'score', 'how_was_it', 'how_did_it_go']);

    if (!name) {
      errors.push(`Row ${rowNum}: Missing respondent name`);
      continue;
    }

    if (!dateStr) {
      errors.push(`Row ${rowNum}: Missing date for "${name}"`);
      continue;
    }

    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) {
      errors.push(`Row ${rowNum}: Invalid date "${dateStr}" for "${name}"`);
      continue;
    }

    // Default duration to 60 if not provided
    let duration = 60;
    if (durationStr) {
      const parsed = parseInt(durationStr, 10);
      if (!isNaN(parsed)) {
        // Snap to nearest valid duration
        duration = VALID_DURATIONS.reduce((prev, curr) =>
          Math.abs(curr - parsed) < Math.abs(prev - parsed) ? curr : prev
        );
        if (duration !== parsed) {
          warnings.push(`Row ${rowNum}: Duration ${parsed} snapped to ${duration} minutes`);
        }
      }
    } else {
      warnings.push(`Row ${rowNum}: No duration provided for "${name}", defaulting to 60 minutes`);
    }

    // Default rating to 3 if not provided
    let rating = 3;
    if (ratingStr) {
      const parsed = parseInt(ratingStr, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        rating = parsed;
      } else {
        warnings.push(`Row ${rowNum}: Invalid rating "${ratingStr}" for "${name}", defaulting to 3`);
      }
    } else {
      warnings.push(`Row ${rowNum}: No rating provided for "${name}", defaulting to 3`);
    }

    const logRow: SessionLogRow = {
      respondent_name: name,
      date: parsedDate.toISOString(),
      duration_minutes: duration,
      rating,
      raw_row_index: i,
    };

    // Resolve name to pair
    const result = resolvePairByName(name, cohorts);

    if (result.resolved) {
      matched.push({ ...logRow, pair: result.resolved });
    } else {
      unmatched.push({
        ...logRow,
        error: result.error || 'No match found',
        candidates: result.candidates,
      });
    }
  }

  return { matched, unmatched, errors, warnings };
}