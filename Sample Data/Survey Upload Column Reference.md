# Survey Upload - Column Reference

This document describes the column names that MewsMentor recognizes when importing survey responses from Excel (.xlsx) or CSV files.

The parser uses **keyword matching** on column headers (case-insensitive). You don't need to use the exact names below -- any column header containing the listed keywords will be matched.

---

## Shared Columns (All Participants)

| Field | Required Keywords in Header | Example Column Names |
|-------|---------------------------|---------------------|
| Email | `email` | "Email", "Email Address" |
| Name | `name` | "Name", "Full Name" |
| Slack User ID | `slack` | "Slack User ID", "Slack ID" |
| Bio / Role Description | `tell us about your role` OR `role` + `focus` | "In a few lines, tell us about your role and what you're focused on" |
| Role Selection | `participate as` OR `want to participate` | "I want to participate as:" |

### Workday Enrichment Columns (V3 Format)

If these are present, the survey is auto-detected as V3 format:

| Field | Required Keywords in Header | Example Column Names |
|-------|---------------------------|---------------------|
| Job Title | `business title` OR `job title` | "Business Title", "Job Title" |
| Level / Grade | `compensation grade` OR `level` + `grade` | "Compensation Grade", "Level / Grade" |
| Country | `country` | "Country", "Location Address - Country" |
| Department | `department` OR `org level 04` | "Department", "Org Level 04" |

---

## Mentee Columns

| Field | Required Keywords in Header | Example Column Names |
|-------|---------------------------|---------------------|
| Capabilities to Develop | `capabilities` + `develop` OR `capability` + `build` | "What capabilities do you want to develop?" |
| Role-Specific Area | `job-specific` OR `role-specific` OR `role-related` + `mentoring` | "Job-specific or role-related mentoring area" |
| Mentoring Goal | `mentoring goal` OR `using the format` | "Your mentoring goal" |
| Specific Challenge | `specific situation` OR `specific challenge` | "A specific situation or challenge" |
| Mentor Help Wanted | `kind of mentor help` OR `mentor help` | "What kind of mentor help do you want?" |
| Open to First-Time Mentor | `open to` + `first-time` OR `first-time mentor` | "Are you open to a first-time mentor?" |
| Session Style | `session style` | "Session style preference" |
| Feedback Style | `feedback style` | "Feedback style preference" |

---

## Mentor Columns

| Field | Required Keywords in Header | Example Column Names |
|-------|---------------------------|---------------------|
| Mentor Motivation | `want to mentor` OR `motivation` | "Why do you want to mentor?" |
| Capacity | `how many mentees` | "How many mentees would you like to mentor this cohort?" |
| Mentoring Experience | `first time mentoring` OR `first time mentor` | "Is this your first time mentoring?" |
| Support Wanted | `support` + `feel confident` OR `what support` | "What support would help you feel confident?" |
| Capabilities Offered | `capabilities` + `confident` + `mentor` OR `confident mentoring` | "Capabilities you feel confident mentoring others in" |
| Role-Specific Offering | `benefit from` + `job` OR `job` + `field` + `mentee` | "Could a mentee benefit from your job or field?" |
| Meaningful Impact / Lesson | `meaningful impact` OR `hard-earned lesson` | "Share a meaningful impact story" |
| Natural Strengths | `naturally bring` OR `natural strengths` | "What do you naturally bring?" |
| Session Style (Mentor) | `session style` + `mentor` OR `preferred session style` | "Preferred session style (mentor)" |
| Topics Prefer Not | `prefer not` + `matched` OR `prefer not to` + `mentor` | "Topics you prefer not to mentor on" |
| Match Exclusions | `make a match not work` OR `anything else` + `match` | "Anything else that would make a match not work?" |

---

## MS Forms Branching Columns

When exporting from MS Forms, branching questions (shown only to mentees or mentors) get **generic column names** like:
- `Mentees`, `Mentees2`, `Mentees3`, ...
- `Mentors`, `Mentors8`, `Mentors10`, ...

**MewsMentor handles this automatically.** These generic columns are remapped to descriptive names based on their position. The expected order is:

### Mentee Branch (in order):
1. Role-specific mentoring area
2. Mentoring goal
3. Specific challenge
4. Mentor help wanted
5. Open to first-time mentor
6. Session style preference
7. Feedback style preference

### Mentor Branch (in order):
1. Mentor motivation
2. Mentoring experience (first time?)
3. Support to feel confident
4. Capabilities offered
5. Role-specific offering
6. Hard-earned lesson / meaningful impact
7. Natural strengths
8. Session style
9. Topics prefer not to mentor
10. Match exclusions

> **Note:** Non-branching questions (like "How many mentees would you like to mentor?") keep their full question text as the column header and are matched by keywords normally.

---

## Format Auto-Detection

The parser auto-detects which survey format is being used:

| Format | Detection Rule |
|--------|---------------|
| **V3 Simplified** (current) | Has Workday columns (Job Title / Business Title / Compensation Grade / Level + Grade) AND a "participate as" column |
| **V2 Capability** | Has a "participate as" column but no Workday columns |
| **V1 Legacy** | Neither of the above (old topic-based format with separate mentor/mentee files) |

---

## Tips

- The parser is **case-insensitive** -- "EMAIL", "Email", and "email" all work
- **Empty/overflow rows** (no Name, Email, or ID) are automatically filtered out
- **Multi-select values** should use semicolons: `"Option A;Option B;Option C"`
- The **Role Selection** column value should contain "Mentor", "Mentee", or "Both"
