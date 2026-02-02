import {
  MenteeData,
  MentorData,
  ImportResult,
  DataValidationError,
  DEVELOPMENT_TOPICS,
  EXPERIENCE_MAPPING
} from "@/types/mentoring";

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
export function identifyRowType(row: Record<string, string>): 'mentee' | 'mentor' | 'unknown' {
  const keys = Object.keys(row);

  // Check for mentee indicators based on actual CSV headers
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
           lowerKey.includes('mentorship program') ||
           lowerKey.includes('mentee');
  });

  // Check for mentor indicators based on actual CSV headers
  const hasMentorFields = keys.some(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('have you mentored before') ||
           lowerKey.includes('your mentoring style') ||
           lowerKey.includes('what do you hope to gain from being a mentor') ||
           lowerKey.includes('early-career') ||
           lowerKey.includes('mid-level') ||
           lowerKey.includes('senior stretch role') ||
           lowerKey.includes('what type of meeting style') ||
           lowerKey.includes('how would you describe your energy as a mentor') ||
           lowerKey.includes('mentor') && !lowerKey.includes('mentee');
  });

  // If we don't find specific indicators, check the data content patterns
  if (!hasMenteeFields && !hasMentorFields) {
    // Look for role column with flexible matching
    const hasRoleColumn = keys.some(key => {
      const lowerKey = key.toLowerCase();
      return lowerKey.includes('current role') ||
             lowerKey.includes('role at') ||
             lowerKey.includes('your role') ||
             lowerKey.includes('position');
    });

    // Look for mentee content patterns - someone who wants to learn
    const hasLearningContent = Object.values(row).some(value => {
      if (!value) return false;
      const lowerValue = value.toLowerCase();
      return lowerValue.includes('learn') ||
             lowerValue.includes('guidance') ||
             lowerValue.includes('development') ||
             lowerValue.includes('skill') ||
             lowerValue.includes('grow') ||
             lowerValue.includes('improve');
    });

    // Look for motivation/development fields
    const hasMotivationField = keys.some(key => {
      const lowerKey = key.toLowerCase();
      return lowerKey.includes('motivation') ||
             lowerKey.includes('why') ||
             lowerKey.includes('goal') ||
             lowerKey.includes('development');
    });

    // If we have a role column and learning/motivation content, assume mentee
    if (hasRoleColumn && (hasLearningContent || hasMotivationField)) {
      return 'mentee';
    }

    // If we can't determine from structure, default to mentee if row has substantial data
    const hasSubstantialData = Object.values(row).filter(v => v && v.trim().length > 0).length >= 3;
    if (hasSubstantialData) {
      return 'mentee';
    }
  }

  if (hasMenteeFields) return 'mentee';
  if (hasMentorFields) return 'mentor';
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

  // Find exact column names from the row keys
  const roleValue = row["What's your current role at Mews?"] ||
                   Object.keys(row).find(key => key.toLowerCase().includes('current role'))
                   ? row[Object.keys(row).find(key => key.toLowerCase().includes('current role'))!] : '';

  const experienceValue = row["How many years of work experience do you have?"] ||
                         Object.keys(row).find(key => key.toLowerCase().includes('years of work experience'))
                         ? row[Object.keys(row).find(key => key.toLowerCase().includes('years of work experience'))!] : '';

  const locationValue = row["Where are you based (location/time zone)?"] ||
                       Object.keys(row).find(key => key.toLowerCase().includes('where are you based'))
                       ? row[Object.keys(row).find(key => key.toLowerCase().includes('where are you based'))!] : '';

  const result = {
    id,
    pronouns: row["Do you want to share your pronouns?"] || '',
    role: roleValue,
    experience_years: experienceValue,
    location_timezone: locationValue,

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

// Parse mentor data from CSV row
export function parseMentorRow(row: Record<string, string>): MentorData | null {
  const id = row['#'] || row['id'];
  if (!id) return null;

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

  return {
    id,
    pronouns: row["Do you want to share your pronouns?"],
    role: roleKey ? row[roleKey] : '',
    experience_years: experienceKey ? row[experienceKey] : '',
    location_timezone: locationKey ? row[locationKey] : '',

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
    capacity_remaining: 3, // Default capacity, can be updated
    seniority_band: mapExperienceToSeniority(row["How many years of work experience do you have?"] || ''),
    languages: [] // TODO: Extract from text or add to CSV
  };
}

// Main data import function
export async function importMentoringData(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mentees: MenteeData[] = [];
  const mentors: MentorData[] = [];

  try {
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      errors.push("No data found in file");
      return { mentees, mentors, errors, warnings };
    }

    // Process each row
    rows.forEach((row, index) => {
      const rowType = identifyRowType(row);

      if (rowType === 'mentee') {
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
      } else if (rowType === 'mentor') {
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
      } else {
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