# MewsMentor Help Guide

## Table of Contents

1. [Uploading Data](#uploading-data)
2. [Mentee Spreadsheet Columns](#mentee-spreadsheet-columns)
3. [Mentor Spreadsheet Columns](#mentor-spreadsheet-columns)
4. [How Matching Works](#how-matching-works)
5. [Matching Modes](#matching-modes)
6. [AI-Enhanced Matching](#ai-enhanced-matching)

---

## Uploading Data

MewsMentor accepts CSV (.csv) and Excel (.xlsx, .xls) files. You can upload mentee and mentor data as separate files or combined into one file.

### How does it know if a row is a mentee or mentor?

The parser identifies rows using these methods (in priority order):

1. **"Role Type" column** (most reliable) — values: `mentee`, `mentor`, or `both`
2. **Header-based detection** — if no "Role Type" column exists, it checks for columns unique to mentor surveys (e.g., "Have you mentored before?") or mentee surveys (e.g., "What's the main reason you'd like a mentor?")
3. **Fallback** — rows with at least 3 non-empty fields default to mentee

### Required columns

Every row must have:

| Column | Description |
|--------|-------------|
| `#` or `id` | A unique identifier for the person (e.g., row number, employee ID) |

### Optional but recommended

| Column | Description |
|--------|-------------|
| `Full Name` or `Name` | The person's display name. If absent, the ID is used as the name. |

---

## Mentee Spreadsheet Columns

### Profile Information

These columns use flexible matching — the parser looks for keywords in the column header.

| Column | Matching keywords | Description |
|--------|-------------------|-------------|
| Role | "current role" | Current job role |
| Experience | "years of work experience" | e.g., "3-5", "6-10", "10+" |
| Location | "where are you based", "location", "time zone" | Location or timezone |
| Pronouns | "Do you want to share your pronouns?" | Optional pronouns |

### Development Topics (boolean columns)

These should be column headers with a value of `1`, `true`, or any non-empty text to indicate selection:

- Career growth & progression
- Leadership & management
- Technical / product knowledge
- Customer success & client relationships
- Communication & soft skills
- Cross-functional collaboration
- Strategic thinking & vision
- Change management / navigating transformation
- Diversity, equity & inclusion
- Work-life balance & wellbeing
- Other (please specify in the next slide)_1

### Life Experiences (boolean columns)

- Returning from maternity/paternity/parental leave
- Navigating menopause or andropause
- Career break / sabbatical
- Relocation to a new country
- Career change or industry switch
- Managing health challenges (physical or mental)
- Stepping into leadership for the first time
- Working towards a promotion
- Thinking about an internal move
- You picked Other - we'd love to hear more. What experience would you add?

### Preferences & Goals (text columns)

| Column | Used for |
|--------|----------|
| Why would you like to join the mentorship program? | Motivation — used in goals text for matching |
| What's the main reason you'd like a mentor? | Main reason — used in goals text for matching |
| What expectations do you have for the mentorship program | Expectations — used in goals text for matching |
| What kind of mentor style do you think would help you most | Preferred mentor style |
| What kind of mentor energy would help you thrive? | Preferred mentor energy |
| How do you prefer to receive feedback? | Feedback preference |
| How important is it to you that your mentor has prior mentoring experience? | Mentor experience importance |
| What do you NOT want in a mentor? | Dealbreakers |
| How often would you ideally like to meet with a mentor? | Meeting frequency |
| What qualities would you like in a mentor | Desired mentor qualities — used in AI matching |

---

## Mentor Spreadsheet Columns

### Profile Information

Same flexible matching as mentee columns:

| Column | Matching keywords | Description |
|--------|-------------------|-------------|
| Role | "current role", "role at", "your role" | Current job role |
| Experience | "years of work experience", "experience" | e.g., "3-5", "6-10", "10+" |
| Location | "where are you based", "location", "time zone" | Location or timezone |
| Pronouns | "Do you want to share your pronouns?" | Optional pronouns |
| Capacity | "capacity", "how many mentees", "number of mentees", "max mentees" | How many mentees this mentor can take. Defaults to 1 if not specified. |

### Topics to Mentor (boolean columns)

Same topic list as mentees — indicates which areas this mentor can coach on.

### Preferred Mentee Levels (boolean columns)

- Early-career
- Mid-level
- Senior stretch role

### Life Experiences (boolean columns)

Same as mentee life experiences, plus:
- Promotions
- Internal moves

### Mentoring Approach (text columns)

| Column | Used for |
|--------|----------|
| Have you mentored before? | Value "1" = yes |
| Your mentoring style / How would you describe your preferred mentoring style? | Mentoring style — used in AI matching |
| What type of meeting style do you usually prefer? | Meeting style preference |
| How would you describe your energy as a mentor? | Mentor energy |
| What's your feedback style? | Feedback style |
| Are there any topics you would prefer NOT to mentor on? | Topics to avoid (comma-separated) |
| How often would you ideally like to meet with a mentee? | Meeting frequency |
| What do you hope to gain from being a mentor? | Motivation — used in bio text for matching |
| What expectations do you have for the mentorship program? | Expectations — used in bio text for matching |

---

## How Matching Works

### Step 1: Hard Filters

Before scoring, pairs are filtered out if they fail any of these:

| Filter | Threshold | What it does |
|--------|-----------|--------------|
| Language overlap | At least 1 shared language | Removes pairs with no common language |
| Timezone difference | Maximum 3 hours apart | Removes pairs too far apart in timezones |
| Mentor capacity | Must be > 0 | Removes mentors who are already full |

### Step 2: Feature Scoring

Each mentee-mentor pair is scored on 7 features:

| Feature | Weight | Max Points | How it's calculated |
|---------|--------|------------|---------------------|
| **Topics Overlap** | 40% | 40 pts | Jaccard similarity between mentee's topics to learn and mentor's topics to mentor. If mentee wants "Leadership" and "Communication" and mentor offers "Leadership" and "Technical", overlap = 1/3 = 33% |
| **Goals Alignment** | 20% | 20 pts | Keyword-based: compares mentee's goals text (motivation + main reason + expectations) with mentor's bio text + topics. With AI enabled, this uses OpenAI embeddings (cosine similarity) for much better semantic understanding |
| **Industry Overlap** | 15% | 15 pts | Currently always 100% (all Mews employees = same industry) |
| **Seniority Fit** | 10% | 10 pts | Compares experience levels. Mentor should ideally be more senior. Mentor less senior than mentee scores 50%. |
| **Timezone Overlap** | 5% | 5 pts | Binary: 100% if within 2 hours, 0% otherwise |
| **Language Match** | 5% | 5 pts | Binary: 100% if they share the mentee's primary language, 0% otherwise |
| **Capacity Penalty** | -10% | -10 pts | Applied when mentor has only 1 slot remaining, to spread mentees across mentors |

### Score Formula

```
Total Score = 40 × topics + 20 × goals + 15 × industry + 10 × seniority
            + 5 × timezone + 5 × language - 10 × capacity_penalty
```

Score is clamped between 0 and 100.

### Step 3: Tie-Breaking

When two mentors have the same total score for a mentee, ties are broken in this order:

1. Higher topics overlap wins
2. Higher goals alignment wins
3. Higher remaining capacity wins (spreads load)
4. Mentor name alphabetically (A-Z)

### Experience Level Mapping

The mentee/mentor experience years are mapped to seniority bands:

| Experience | Band | Score |
|------------|------|-------|
| 0-2 years | IC1 | 1 |
| 3-5 years | IC2 | 2 |
| 6-10 years | IC3 | 3 |
| 10+ years | IC4 | 4 |

---

## Matching Modes

### Batch Mode

- Assigns one mentor to each mentee automatically
- Goes through mentees and picks the best available mentor
- Decreases mentor capacity after each assignment
- Good for quick, automated matching

### Top 3 Mode

- Generates the top 3 mentor recommendations for each mentee
- Does NOT auto-assign — you review and manually select
- Mentor capacity is NOT decreased (all mentors remain available for all mentees)
- Shows a mentor-centric view where you can see which mentees are recommended for each mentor

---

## AI-Enhanced Matching

When AI matching is enabled (via OpenAI integration), the matching process is enhanced in two ways:

### 1. AI Embeddings (Goals Alignment)

Instead of simple keyword matching for the "Goals Alignment" feature (20% of the score), the system:

1. Builds a text summary of each mentee's goals (motivation, main reason, expectations, topics, desired qualities)
2. Builds a text summary of each mentor's offering (bio, motivation, expectations, topics, mentoring style)
3. Sends these to OpenAI's `text-embedding-3-small` model to generate 1536-dimension vectors
4. Compares vectors using cosine similarity

This captures semantic meaning — e.g., a mentee wanting "career growth advice" will match well with a mentor offering "professional development guidance" even though they don't share the same keywords.

Embeddings are cached in the database per cohort, so re-running matching doesn't re-call OpenAI.

### 2. AI Match Explanations

After matching, you can click "AI Explain Match" on any pair to get a 2-3 sentence human-readable explanation of why they were matched, generated by GPT-4o-mini. These are also cached.

### Fallback

If the AI service is unavailable, matching falls back to keyword-based similarity automatically. You'll see a notification when this happens.
