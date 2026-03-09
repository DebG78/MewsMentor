import * as XLSX from 'xlsx';

const SHARED_COLUMNS = [
  'Name',
  'Email',
  'Business Title',
  'Compensation Grade',
  'Location Address - Country',
  'Org Level 04',
  'Org Level 05',
  'Slack User ID',
  'Tell us about your role and focus in a few lines',
  'How would you like to participate as?',
];

const MENTEE_COLUMNS = [
  'What capabilities would you like to develop through mentoring?',
  'Is there a job-specific or role-related area you would like mentoring on?',
  'What is your mentoring goal? (Using the format: I want to...)',
  'Is there a specific situation or challenge you are navigating?',
  'What kind of mentor help would you like?',
  'Are you open to being mentored by a first-time mentor?',
  'Session style preference (Mentee)',
  'Feedback style preference',
];

const MENTOR_COLUMNS = [
  'Why do you want to mentor? What do you hope to get out of it?',
  'How many mentees would you like to mentor?',
  'Is this your first time mentoring?',
  'What support would help you feel confident as a mentor?',
  'Select the capabilities you feel confident mentoring others in',
  'Is there something specific about your job or field that a mentee could benefit from?',
  'Share a meaningful impact story from your career',
  'What do you naturally bring as a mentor? (Pick up to 3)',
  'Preferred session style (Mentor)',
  'Are there topics or areas you prefer not to be matched on?',
  'Is there anything else that would make a match not work?',
];

const ALL_COLUMNS = [...SHARED_COLUMNS, ...MENTEE_COLUMNS, ...MENTOR_COLUMNS];

const SAMPLE_ROWS: Record<string, string>[] = [
  {
    'Name': 'Jane Smith',
    'Email': 'jane.smith@example.com',
    'Business Title': 'Product Manager',
    'Compensation Grade': 'L5 Mid IC',
    'Location Address - Country': 'United Kingdom',
    'Org Level 04': 'Product',
    'Org Level 05': 'Product Strategy',
    'Slack User ID': 'U01ABC123',
    'Tell us about your role and focus in a few lines': 'I lead product strategy for our B2B platform, focusing on customer retention and expansion.',
    'How would you like to participate as?': 'Mentee',
    'What capabilities would you like to develop through mentoring?': 'Strategic thinking, stakeholder management',
    'Is there a job-specific or role-related area you would like mentoring on?': 'Moving from feature-level to portfolio-level product thinking',
    'What is your mentoring goal? (Using the format: I want to...)': 'I want to develop confidence in presenting product strategy to senior leadership.',
    'Is there a specific situation or challenge you are navigating?': 'Preparing for a Director-level role transition',
    'What kind of mentor help would you like?': 'Accountability partner;Sounding board;Career guidance',
    'Are you open to being mentored by a first-time mentor?': 'Yes, I am open to it',
    'Session style preference (Mentee)': 'Mix of structured and informal',
    'Feedback style preference': 'Direct and honest',
  },
  {
    'Name': 'Carlos Rodriguez',
    'Email': 'carlos.rodriguez@example.com',
    'Business Title': 'Senior Engineering Manager',
    'Compensation Grade': 'L3 Sr. Manager',
    'Location Address - Country': 'Spain',
    'Org Level 04': 'Engineering',
    'Org Level 05': 'Platform Engineering',
    'Slack User ID': 'U02DEF456',
    'Tell us about your role and focus in a few lines': 'I manage 3 engineering teams building our core platform services. 12 years in tech, 5 in management.',
    'How would you like to participate as?': 'Mentor',
    'Why do you want to mentor? What do you hope to get out of it?': 'I want to give back and help others navigate the IC-to-manager transition.',
    'How many mentees would you like to mentor?': 'Two',
    'Is this your first time mentoring?': 'I have mentored before',
    'What support would help you feel confident as a mentor?': 'Conversation guides;Peer mentor community',
    'Select the capabilities you feel confident mentoring others in': 'Leadership & management;Technical architecture;Cross-functional collaboration',
    'Is there something specific about your job or field that a mentee could benefit from?': 'Building and scaling engineering teams, navigating org changes',
    'Share a meaningful impact story from your career': 'Helped a junior engineer grow into a tech lead within 18 months.',
    'What do you naturally bring as a mentor? (Pick up to 3)': 'Active listening;Honest feedback;Strategic thinking',
    'Preferred session style (Mentor)': 'Structured with agenda',
    'Are there topics or areas you prefer not to be matched on?': 'Frontend-specific technical mentoring',
    'Is there anything else that would make a match not work?': '',
  },
];

function getColumnDescription(col: string): string {
  const descriptions: Record<string, string> = {
    'Name': 'Full name of the participant',
    'Email': 'Work email address (used as unique identifier)',
    'Business Title': 'Workday Business Title (e.g. Senior Software Engineer)',
    'Compensation Grade': 'Workday level (L1-L7). Used for seniority matching.',
    'Location Address - Country': 'Country for timezone matching (e.g. United Kingdom, Czech Republic)',
    'Org Level 04': 'Department from Workday (e.g. Engineering, Product, People Team)',
    'Org Level 05': 'Sub-department from Workday (e.g. Platform Engineering)',
    'Slack User ID': 'Slack member ID (e.g. U01ABC123) for automated messaging',
    'Tell us about your role and focus in a few lines': 'Short bio about their role, focus areas, and experience',
    'How would you like to participate as?': 'Role selection: Mentee, Mentor, or Both',
    'What capabilities would you like to develop through mentoring?': 'Free text: capabilities the mentee wants to build',
    'Is there a job-specific or role-related area you would like mentoring on?': 'Role-specific development area',
    'What is your mentoring goal? (Using the format: I want to...)': 'Mentoring goal statement used for matching',
    'Is there a specific situation or challenge you are navigating?': 'Current challenge or transition they need help with',
    'What kind of mentor help would you like?': 'Multi-select (semicolons): e.g. Accountability partner;Sounding board',
    'Are you open to being mentored by a first-time mentor?': 'Whether they accept a first-time mentor',
    'Session style preference (Mentee)': 'Preferred meeting style (structured, informal, mixed)',
    'Feedback style preference': 'How they prefer to receive feedback',
    'Why do you want to mentor? What do you hope to get out of it?': 'Mentor motivation and goals',
    'How many mentees would you like to mentor?': 'Mentor capacity (One, Two, Three, or number)',
    'Is this your first time mentoring?': 'Mentoring experience level',
    'What support would help you feel confident as a mentor?': 'Multi-select: support resources wanted',
    'Select the capabilities you feel confident mentoring others in': 'Multi-select (semicolons): capabilities they can mentor on',
    'Is there something specific about your job or field that a mentee could benefit from?': 'Role-specific mentoring offering',
    'Share a meaningful impact story from your career': 'Story demonstrating their mentoring strengths',
    'What do you naturally bring as a mentor? (Pick up to 3)': 'Multi-select: natural mentor strengths',
    'Preferred session style (Mentor)': 'Preferred meeting style as a mentor',
    'Are there topics or areas you prefer not to be matched on?': 'Topics to exclude from matching',
    'Is there anything else that would make a match not work?': 'Additional matching exclusions',
  };
  return descriptions[col] || '';
}

function getColumnExamples(col: string): string {
  const examples: Record<string, string> = {
    'Name': 'Jane Smith',
    'Email': 'jane.smith@company.com',
    'Business Title': 'Senior Product Manager',
    'Compensation Grade': 'L4 Senior',
    'Location Address - Country': 'Czech Republic',
    'Org Level 04': 'Engineering',
    'Org Level 05': 'Platform',
    'Slack User ID': 'U01ABC123',
    'How would you like to participate as?': 'Mentee / Mentor / Both',
    'How many mentees would you like to mentor?': 'Two',
    'What kind of mentor help would you like?': 'Accountability partner;Sounding board',
  };
  return examples[col] || '';
}

export function downloadUploadTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Upload Template with sample data
  const templateData = SAMPLE_ROWS.map(row => {
    const ordered: Record<string, string> = {};
    for (const col of ALL_COLUMNS) {
      ordered[col] = row[col] || '';
    }
    return ordered;
  });

  const ws = XLSX.utils.json_to_sheet(templateData, { header: ALL_COLUMNS });
  ws['!cols'] = ALL_COLUMNS.map(col => ({
    wch: Math.min(Math.max(col.length, 20), 50),
  }));
  XLSX.utils.book_append_sheet(wb, ws, 'Upload Template');

  // Sheet 2: Column Reference
  const referenceData = [
    ...SHARED_COLUMNS.map((col, i) => ({
      '#': i + 1,
      'Column Name': col,
      'Section': 'Shared (Everyone)',
      'Required': ['Name', 'Email', 'How would you like to participate as?'].includes(col) ? 'Yes' : 'Recommended',
      'Description': getColumnDescription(col),
      'Example Values': getColumnExamples(col),
    })),
    ...MENTEE_COLUMNS.map((col, i) => ({
      '#': SHARED_COLUMNS.length + i + 1,
      'Column Name': col,
      'Section': 'Mentee Questions',
      'Required': col.includes('mentoring goal') ? 'Yes (if mentee)' : 'Recommended',
      'Description': getColumnDescription(col),
      'Example Values': getColumnExamples(col),
    })),
    ...MENTOR_COLUMNS.map((col, i) => ({
      '#': SHARED_COLUMNS.length + MENTEE_COLUMNS.length + i + 1,
      'Column Name': col,
      'Section': 'Mentor Questions',
      'Required': col.includes('How many mentees') ? 'Yes (if mentor)' : 'Recommended',
      'Description': getColumnDescription(col),
      'Example Values': getColumnExamples(col),
    })),
  ];

  const wsRef = XLSX.utils.json_to_sheet(referenceData);
  wsRef['!cols'] = [
    { wch: 4 },
    { wch: 60 },
    { wch: 20 },
    { wch: 18 },
    { wch: 60 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRef, 'Column Reference');

  // Sheet 3: Valid Values
  const validValuesData = [
    { Field: 'How would you like to participate as?', 'Valid Values': 'Mentee, Mentor, Both (Mentee and Mentor)' },
    { Field: 'Compensation Grade', 'Valid Values': 'L1 SVP/VP, L2 Director, L3 Sr. Manager, L4 Senior, L5 Mid IC, L6 Junior IC, L7 Entry level' },
    { Field: 'Multi-select fields (separated by ;)', 'Valid Values': 'Option A;Option B;Option C (use semicolons to separate multiple choices)' },
    { Field: 'How many mentees would you like?', 'Valid Values': 'One, Two, Three, or a number (1, 2, 3)' },
    { Field: 'Is this your first time mentoring?', 'Valid Values': 'Yes, this is my first time / I have mentored before / I have helped others informally' },
    { Field: 'Are you open to a first-time mentor?', 'Valid Values': 'Yes, I am open to it / No, I prefer an experienced mentor' },
  ];

  const wsValid = XLSX.utils.json_to_sheet(validValuesData);
  wsValid['!cols'] = [
    { wch: 50 },
    { wch: 80 },
  ];
  XLSX.utils.book_append_sheet(wb, wsValid, 'Valid Values');

  XLSX.writeFile(wb, 'MewsMentor_Upload_Template.xlsx');
}
