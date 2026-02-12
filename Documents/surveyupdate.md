# Survey-to-Database Alignment for Revamped Mentoring Survey

## Context

The mentoring survey has been significantly revamped. The new survey introduces a **capability-based model** (30 capabilities, proficiency ratings, practice scenarios) replacing the old **topic-category model** (~10 broad topics, life experiences). This document maps every new survey question to database fields, identifies gaps, and outlines the work to align the import pipeline.

**Reconciled with actual MS Forms Excel export** (`Sample Data/Mentoring Q2 Survey Response.xlsx`) — 44 columns, verified against live data.

---

## 1. Full Survey → Database Field Mapping

> Column numbers (Col 0–43) reference the actual Excel export.

### MS Forms Metadata (Col 0–5) — not stored in app DB

| Col | Header | Action |
|---|---|---|
| 0 | ID | Ignore (MS Forms internal) |
| 1 | Start time | Ignore |
| 2 | Completion time | Ignore |
| 3 | Email | → `email` (existing field) |
| 4 | Name | → `name` (existing field, split first/last) |
| 5 | Last modified time | Ignore |

### Screening (Col 6–8)

| Col | Survey Question | DB Field | Action |
|---|---|---|---|
| 6 | Can you commit to ~6–10 hours total across ~5 months? | *(none — hard filter)* | If "No" → exclude from matching. MS Forms blocks submission anyway. |
| 7 | I understand mentoring is NOT a substitute for line management | *(none — hard filter)* | Same |
| 8 | I understand places are limited and matching is based on fit + quality | *(none — hard filter)* | Same |

### Shared Bio Fields (Col 9–14)

| Col | Survey Question | Current DB Field | Status | Action |
|---|---|---|---|---|
| 9 | What is your current level at Mews? (S1–LT) | `seniority_band` (computed from `experience_years`) | ⚠️ Indirect | Store directly in `seniority_band` |
| 10 | Role title | `role` | ✅ Exists | Update parser header matching |
| 11 | Please select your function | `industry` (loosely) | ⚠️ Mismatch | Repurpose `industry` → store function |
| 12 | Preferred time-zone | `location_timezone` | ✅ Exists | Update parser for new labels: "Europe - (CET / CEST)" etc. |
| 13 | Bio: "can you provide a little context about your role and focus at Mews" | *(none)* | ❌ Missing | **Add `bio` text column** to both tables |
| 14 | I want to participate as: (Mentee/Mentor/Both) | Auto-detected | ⚠️ Implicit | Parser should use this column explicitly for role detection |

### Mentee Section (Col 15–27)

| Col | Survey Question | Current DB Field | Status | Action |
|---|---|---|---|---|
| 15 | Pick your PRIMARY capability to build (choose 1) | `topics_to_learn[0]` | ⚠️ Structural change | **Add `primary_capability` text** |
| 16 | Domain expertise detail (primary, conditional) | *(none)* | ❌ Missing | **Add `primary_capability_detail` text** |
| 17 | Pick your SECONDARY capability to build (optional, choose 1) | `topics_to_learn[1]` | ⚠️ Structural change | **Add `secondary_capability` text** |
| 18 | Domain expertise detail (secondary, conditional) | *(none)* | ❌ Missing | **Add `secondary_capability_detail` text** |
| 19 | Rate proficiency in PRIMARY capability (1–4) | *(none)* | ❌ Missing | **Add `primary_proficiency` integer** |
| 20 | Rate proficiency in SECONDARY capability (1–4) | *(none)* | ❌ Missing | **Add `secondary_proficiency` integer** |
| 21 | Your mentoring goal (structured format) | `motivation` / `expectations` | ⚠️ Different concept | **Add `mentoring_goal` text** |
| 22 | Choose exactly 2 practice scenarios | *(none)* | ❌ Missing | **Add `practice_scenarios` text[]** |
| ~~23~~ | ~~Describe ONE real situation you will bring to session 1~~ | — | **REMOVING** | Question being removed from survey before go-live. No DB column needed. |
| 24 | What kind of mentor help do you want most? (pick 2) | `mentor_qualities` | ⚠️ Similar | Repurpose or **add `mentor_help_wanted` text[]** |
| 25 | Are you open to being mentored by a first-time mentor? | `mentor_experience_importance` | ✅ Same concept | Update parser header |
| 26 | Session style preference | `preferred_style` | ✅ Same concept | Update parser header |
| 27 | Feedback style preference | `feedback_preference` | ✅ Same concept | Update parser header |

### Mentor Section (Col 28–43)

| Col | Survey Question | Current DB Field | Status | Action |
|---|---|---|---|---|
| 28 | Why do you want to mentor, and what do you hope to get out of it? | *(none)* | ❌ **NEW question** | **Add `mentor_motivation` text**. Feeds semantic matching. |
| 29 | How many mentees can you take? | `capacity_remaining` | ⚠️ Text format | Parse text→number ("One"→1, "Two"→2, etc.) → `capacity_remaining` |
| 30 | Is this your first time mentoring (formally)? | `has_mentored_before` (boolean) | ⚠️ Richer answer | **Add `mentoring_experience` text** (keep boolean for compat) |
| 31 | First-time support needed (pick up to 2, conditional) | *(none)* | ❌ Missing | **Add `first_time_support` text[]** |
| 32 | Pick your PRIMARY capability you feel strongest mentoring on (choose 1) | `topics_to_mentor[0]` | ⚠️ Structural | **Add `primary_capability` text** |
| 33 | Domain expertise detail (primary, conditional) | *(none)* | ❌ Missing | **Add `primary_capability_detail` text** |
| 34 | Pick your SECONDARY capabilities (multi-select, plural) | `topics_to_mentor[1]` | ⚠️ Structural | **Add `secondary_capabilities` text[]** ← ARRAY, multi-select |
| 35 | Domain expertise detail (secondary, conditional) | *(none)* | ❌ Missing | **Add `secondary_capability_detail` text** |
| 36 | Rate proficiency in PRIMARY capability (1–5) | *(none)* | ❌ Missing | **Add `primary_proficiency` integer** |
| 37 | Practice scenarios you're strongest supporting (pick up to 4) | *(none)* | ❌ Missing | **Add `practice_scenarios` text[]** |
| 38 | Most useful "hard-earned lesson" | *(none)* | ❌ Missing | **Add `hard_earned_lesson` text** |
| 39 | What do you naturally bring to mentoring sessions? (pick 3) | `mentoring_style` | ⚠️ Different concept | **Add `natural_strengths` text[]** |
| 40 | Session Style | `meeting_style` | ✅ Same concept | Update parser header |
| 41 | Capabilities you do NOT want to mentor on (multi-select) | `topics_not_to_mentor` | ✅ Same concept | Update parser |
| 42 | Practice scenarios you prefer NOT to support (multi-select) | *(none)* | ❌ Missing | **Add `excluded_scenarios` text[]** |
| 43 | Anything else that would make a match not work for you? | *(none)* | ❌ Missing | **Add `match_exclusions` text** |

### Questions removed from survey (were in earlier plan, NOT in actual Excel)

| Question | Action |
|---|---|
| ~~Mentor real example~~ ("Share ONE real example where you handled one of the scenarios above really well") | **Removed from survey entirely**. No DB column needed. |
| ~~Mentor secondary proficiency~~ ("Rate proficiency in SECONDARY capability") | **Removed**. Only primary proficiency asked. |
| ~~Mentor feedback style~~ | **Not in Excel**. Only mentee has feedback style (Col 27). |
| ~~Open to multiple (Yes/No/Depends)~~ | Replaced by direct "How many mentees" (Col 29). Simplified. |

---

## 2. Summary of New DB Columns Needed

### Mentees table — 9 new columns
| Column | Type | Nullable | Excel Col |
|---|---|---|---|
| `bio` | text | yes | 13 |
| `primary_capability` | text | yes | 15 |
| `primary_capability_detail` | text | yes | 16 |
| `secondary_capability` | text | yes | 17 |
| `secondary_capability_detail` | text | yes | 18 |
| `primary_proficiency` | integer | yes | 19 |
| `secondary_proficiency` | integer | yes | 20 |
| `mentoring_goal` | text | yes | 21 |
| `practice_scenarios` | text[] | yes | 22 |

### Mentors table — 13 new columns
| Column | Type | Nullable | Excel Col | Notes |
|---|---|---|---|---|
| `bio` | text | yes | 13 | Shared with mentee |
| `mentor_motivation` | text | yes | 28 | **NEW** — "Why do you want to mentor" |
| `mentoring_experience` | text | yes | 30 | Richer than boolean `has_mentored_before` |
| `first_time_support` | text[] | yes | 31 | Conditional on first-time |
| `primary_capability` | text | yes | 32 | Single strongest capability |
| `primary_capability_detail` | text | yes | 33 | Domain detail for primary |
| `secondary_capabilities` | text[] | yes | 34 | **Multi-select array** — additional capabilities |
| `secondary_capability_detail` | text | yes | 35 | Domain detail if "Domain Expertise" in secondary |
| `primary_proficiency` | integer | yes | 36 | Self-rated on primary only |
| `practice_scenarios` | text[] | yes | 37 | |
| `hard_earned_lesson` | text | yes | 38 | |
| `natural_strengths` | text[] | yes | 39 | |
| `excluded_scenarios` | text[] | yes | 42 | |
| `match_exclusions` | text | yes | 43 | |

### New tables for messaging
| Table | Purpose |
|---|---|
| `message_templates` | Admin-configurable message templates per type/phase/cohort |
| `message_log` | Delivery tracking for all automated messages |

### New column on sessions table
| Column | Type | Purpose |
|---|---|---|
| `journey_phase` | text | Tracks which mentoring phase a session belongs to |

---

## 3. Fields Becoming Obsolete

These DB fields exist but the new survey no longer collects them:

| Field | Table(s) | Reason |
|---|---|---|
| `life_experiences` + boolean flags | Both | Life experience questions fully removed |
| `experience_years` | Both | Replaced by direct level (Col 9 → `seniority_band`) |
| `languages` | Both | Not asked in new survey |
| `meeting_frequency` | Both | Program is now fixed schedule |
| `preferred_energy` / `mentor_energy` | Mentee / Mentor | Not asked |
| `main_reason` | Mentee | Absorbed into structured `mentoring_goal` |
| `unwanted_qualities` | Mentee | Not asked |
| `other_experience(s)` | Both | Not asked |

**Recommendation:** Keep old columns (nullable) for backward compat with existing cohorts. New cohorts will leave them null.

---

## 4. Matching Algorithm — New Design

### Survey structure (verified from Excel export)
- **Mentees**: 1 primary capability (choose 1) + 1 optional secondary (choose 1) — narrow focus
- **Mentors**: 1 primary capability (choose 1) + **multiple secondary capabilities (multi-select)** — breadth
- This is asymmetric by design: mentors offer breadth via multi-select secondary, mentees focus on depth

The sample data shows a mentor selecting 1 primary + 5 secondary capabilities. This gives plenty of matching surface area.

### Capability clusters
The 30 capabilities group into **~5-8 theme families** (e.g. "Communication", "Leadership", "Technical"). This enables fuzzy matching: if no exact capability match exists, a same-cluster match is a meaningful partial score. Cluster definitions are configurable.

### New scoring weights

| Component | Weight | Fields | Notes |
|---|---|---|---|
| **Capability Match** | 45% | Mentee: `primary_capability`, `secondary_capability`. Mentor: `primary_capability`, `secondary_capabilities[]`, `practice_scenarios` | **Tiered scoring** — see breakdown below |
| **Semantic Similarity** | 30% | Mentee: `mentoring_goal` + `bio`. Mentor: `mentor_motivation` + `hard_earned_lesson` + `bio` | Goal text + motivation + lesson is powerful for tie-breaking and nuance |
| **Domain Match** | 5% | `primary_capability_detail`, `secondary_capability_detail` | Text similarity on the domain expertise free-text fields |
| **Seniority Fit** | 10% | `seniority_band` (S1–LT, directly from survey Col 9) | Mentor should be >=1 level above mentee |
| **Timezone Bonus** | 5% | `location_timezone` | Same TZ = full bonus, <=2h diff = partial, >2h = zero |
| **Capacity Penalty** | -10% | `capacity_remaining` | Applied when mentor has only 1 slot left |

### Capability Match — tiered scoring (within the 45% bucket)

| Match type | Score | Example |
|---|---|---|
| Mentee primary = Mentor **primary** | **100%** | Both: "Strategic Thinking & Execution" |
| Mentee primary = one of Mentor **secondary** | **80%** | Mentee wants "Empathy", mentor has it in secondary list |
| Mentee primary in **same cluster** as Mentor primary | **55%** | Same theme family |
| Mentee primary in **same cluster** as Mentor secondary | **40%** | Cluster match on secondary |
| Mentee **secondary** matches Mentor primary or any secondary | **+15% bonus** | Secondary goal also covered |
| **Practice scenario overlap** | **+10% bonus** | Mentee's 2 scenarios overlap with mentor's up-to-4 |
| No capability or cluster match | **0%** | Semantic similarity becomes the only signal |

### Removed from old algorithm
- ~~Language (5% + hard filter)~~ — removed entirely, everyone speaks English
- ~~Industry (15%)~~ — removed, everyone is at Mews

### Hard filters (exclude before scoring)

| Filter | Logic | Source |
|---|---|---|
| **Commitment check** | If either person answered No to any screening question → exclude | Form blocks them anyway, but safety net |
| **Domain expertise detail required** | If mentee picked "Domain Expertise" but left detail empty → flag + lower score | Don't hard-exclude, but penalise |
| **Geographic hard block** | If timezone difference >6 hours → don't match | Replaces old 3h soft limit |
| **Capacity exhausted** | Mentor at max capacity → exclude | Already exists, keep |
| **Excluded scenarios** | If mentee's scenarios overlap with mentor's excluded scenarios → don't match | New hard filter |
| **Match exclusions** | If mentor's free-text flags something → flag for manual review | Admin review, not auto-scored |

---

## 5. Other Affected Areas

### Profile Display (ManualMatchingBoard, MenteeProfile, MentorProfile)
- Update to show new fields (bio, capabilities, proficiency, practice scenarios, goal)
- Remove or hide obsolete fields for new cohorts

### Analytics (PeopleAnalytics)
- Topic demand/supply charts → Capability demand/supply
- Life experience distribution chart → Remove or skip for new cohorts
- New chart opportunities: proficiency distribution, practice scenario coverage

### CSV Parser (dataParser.ts)
- Clean break: replace old parser with new survey column mappings
- MS Forms full question text as column headers
- Multi-select: `value.split(';').filter(Boolean)` — confirmed semicolons with trailing semicolon
- Handle "Both" respondents (one row → split into mentee + mentor records)

### TypeScript Types
- Update `MenteeData` and `MentorData` interfaces in `src/types/mentoring.ts`
- Update `Database` types in `src/types/database.ts`

---

## 6. Implementation Phases

### Phase A: Database & Types
1. Write Supabase migration (new columns + new tables)
2. Update `src/types/database.ts` with new columns + new tables
3. Update `src/types/mentoring.ts` with new interface fields

### Phase B: CSV Parser (clean break)
4. Replace `parseMenteeRow()` with new column mappings (Col 15–27)
5. Replace `parseMentorRow()` with new column mappings (Col 28–43)
6. Use Col 14 for explicit role detection
7. Multi-select: `split(';').filter(Boolean)`
8. Col 29 capacity: text→number ("One"→1, etc.)
9. Populate legacy arrays for backward compat

### Phase C: Database Service
10. Update `supabaseService.ts` to persist all new fields

### Phase D: Matching Algorithm
11. New scoring weights (Capability 45%, Semantic 30%, Domain 5%, Seniority 10%, TZ 5%, Capacity -10%)
12. Remove language + industry scoring
13. Tiered capability matching with cluster support
14. Update embedding text builder
15. New hard filters

### Phase E: UI Updates
16. Update profile previews and components
17. Update analytics charts
18. Show cohort_id + "Copy Webhook URL" button

### Phase F: Survey Ingestion Webhook
19. New edge function `import-survey-response` (mirrors `log-session` pattern)
20. Cohort_id as required URL parameter
21. Shared field-mapping module for CSV parser + webhook

### Phase G: Automated Messaging via Zapier

Three automated messaging flows triggered by events. All messages flow through Zapier webhooks to Slack.

**Architecture:**
```
App event → Edge Function → Zapier Webhook → Slack (DM or channel)
```

- Zapier webhook URL stored as Supabase secret (`ZAPIER_SLACK_WEBHOOK_URL`)
- Slack mentoring channel stored as Supabase secret (`SLACK_MENTORING_CHANNEL`)

#### G1: Welcome DMs on cohort activation

**Trigger**: Admin clicks "Mark Active" on a cohort
**Flow**:
1. `updateCohort()` updates status to `active`
2. Frontend calls new edge function: `POST /functions/v1/send-welcome-messages?cohort_id={ID}`
3. Edge function loads full cohort (mentees, mentors, matches)
4. Queries `message_templates` for welcome templates
5. For each matched pair: generates personalized welcome DMs
6. POSTs each message to Zapier webhook
7. Returns success/failure counts

**Welcome DM content** (personalized):
- Partner's name and primary capability
- The capability they matched on
- Session style + feedback preferences
- Link to mentoring guide / resources
- "Set up your first session within 2 weeks"

#### G2: Channel announcement on cohort activation

Bundled into same edge function call as G1.
- "Cohort [name] is now live with [N] mentor-mentee pairs!"
- Links to resources

#### G3: Next-steps DM after session log

**Trigger**: Session logged via `log-session` edge function
**Session form change**: Add `journey_phase` dropdown to session MS Form

**Journey phases** (participant-facing, mapped from runbook stages):
| Phase label (in MS Form) | Internal key | Maps to |
|---|---|---|
| Getting Started | `getting_started` | Launch |
| Building | `building` | Between Launch and Midpoint |
| Midpoint Check-in | `midpoint` | Midpoint |
| Wrapping Up | `wrapping_up` | Closure |

**Flow**:
1. Participant fills MS Form (now includes `journey_phase`)
2. Data sent to `log-session` edge function
3. Session logged as usual + `journey_phase` stored
4. After insert: look up next-steps template for that phase
5. Generate personalized DM → POST to Zapier → Slack DM

**Example messages by phase**:
- **Getting Started**: "Great first session! Schedule your next within 2 weeks. Focus on {PRIMARY_CAPABILITY}."
- **Building**: "Session logged! Keep the momentum — your next milestone is the midpoint check-in."
- **Midpoint Check-in**: "Reflect: what's working? What needs adjusting? Fill out the midpoint survey: {SURVEY_LINK}"
- **Wrapping Up**: "Final session logged! Please complete the closing survey: {SURVEY_LINK}. Thank you!"

#### Message Templates

Admin-configurable templates stored in `message_templates` table:
- Types: `welcome_mentee`, `welcome_mentor`, `channel_announcement`, `next_steps`
- Templates use `{PLACEHOLDER}` syntax
- Cohort-specific overrides with global default fallback
- Available placeholders: `{FIRST_NAME}`, `{PRIMARY_CAPABILITY}`, `{MENTORING_GOAL}`, `{MENTOR_FIRST_NAME}`, `{MENTEE_FIRST_NAME}`, `{SHARED_CAPABILITY}`, `{COHORT_NAME}`, `{RESOURCE_LINK}`, `{SURVEY_LINK}`, etc.

#### Message Delivery Log

All messages tracked in `message_log` table (cohort_id, template_type, recipient_email, message_text, delivery_status). Visible in admin UI.

#### Key design decisions
- **Non-blocking**: If Zapier fails, the triggering action (session log, activation) still succeeds. Failures logged.
- **Opt-in activation**: Confirmation dialog before sending welcome messages on cohort activation.
- **Admin UI**: New "Message Templates" section for editing templates and viewing message history.

### Phase H: Runbook Message Hub (FUTURE)

Manual message generation from Runbook UI for ad-hoc communications. Deferred — Phase G's automated flows cover the core use cases.

---

## 7. Decisions Made

- **Clean break** — Only new survey format supported going forward.
- **Language filter** — Remove entirely from matching (everyone speaks English).
- **CSV multi-select format** — Confirmed: semicolons with trailing semicolon. Parser: `split(';').filter(Boolean)`.
- **"Both" respondents** — One row, split into mentee + mentor records.
- **Survey tool** — Microsoft Forms. Full question text as column headers.
- **Mentor capability structure** — 1 primary (choose 1) + multi-select secondary. NOT ranked list.
- **Capacity field** — Text answer ("One", "Two"), parser converts to integer.
- **Q18 (mentee real situation)** — Being removed from survey before go-live.
- **Messaging middleware** — Zapier for app→Slack. MS Forms ingestion middleware TBD.
- **Journey phases** — 4 participant-facing phases: Getting Started, Building, Midpoint, Wrapping Up.
- **Next-steps content** — Admin-configurable templates with cohort-specific overrides.
- **Message delivery** — Automated via Zapier webhooks (DMs + channel posts).
- **Non-blocking messaging** — Zapier failures don't block the triggering action.
- **Timezone hard block** — Any pair with >6 hour timezone difference excluded.
- **Dual ingestion** — Both webhook (real-time) and CSV bulk import supported.

---

## 8. Data Privacy Assessment

### Major GDPR risk removed
The old survey collected special category personal data (health challenges, parental leave, career breaks). The new survey has **removed all life experience questions**.

### Sensitive free-text fields

| Field | Risk | Recommendation |
|---|---|---|
| **Bio** (Col 13) | Medium | Admin-only visibility |
| **Mentoring goal** (Col 21) | Low-Medium | Fine for matched partner |
| **Mentor motivation** (Col 28) | Low | Fine for profile display |
| **Hard-earned lesson** (Col 38) | Low | Fine for profile display |
| **Match exclusions** (Col 43) | Medium | Admin-only. Never surface to participants. |

### Recommendations
1. No regulatory blockers — standard personal data protections apply.
2. Free-text fields (bio, match exclusions) visible only to admins and matched partner.
3. Mentor motivation and hard-earned lesson are non-sensitive; standard retention.
4. The biggest risk (health/life experience data) has been eliminated.

---

## 9. Verification Plan

- **CSV import**: Import sample CSV → confirm all fields parsed and stored
- **Webhook**: POST sample JSON → confirm record created/updated
- **Re-submission**: Same respondent again → confirm upsert (no duplicate)
- **"Both" role**: Both mentor + mentee → confirm records in both tables
- **Old cohort data**: Existing cohorts still load correctly
- **Matching**: New cohort → verify capability matching, hard filters, new weights
- **Profile views**: New fields display correctly
- **Analytics**: Charts reflect new data structure
- **Welcome messages**: Activate cohort → correct DMs + channel post sent via Zapier
- **Session next-steps**: Log session with phase → correct DM generated and sent
- **Template management**: Edit templates → used for message generation
- **Message log**: Messages tracked in message_log table
- **Failure handling**: Zapier failure → triggering action still succeeds, failure logged

---

## Key Files to Modify
- `database/` — New migration SQL file
- `src/types/database.ts` — DB type definitions
- `src/types/mentoring.ts` — App type definitions
- `src/lib/dataParser.ts` — CSV parsing logic
- `src/lib/supabaseService.ts` — DB insertion
- `src/lib/surveyFieldMapping.ts` — **NEW** shared mapping module
- `src/lib/matchingEngine.ts` — Matching algorithm
- `src/lib/embeddingUtils.ts` — Embedding text builder
- `src/lib/capabilityClusters.ts` — **NEW** capability cluster config
- `src/lib/messageService.ts` — **NEW** template engine + Zapier webhook calls
- `supabase/functions/import-survey-response/index.ts` — **NEW** survey ingestion webhook
- `supabase/functions/send-welcome-messages/index.ts` — **NEW** cohort activation messages
- `supabase/functions/log-session/index.ts` — Update: journey_phase + next-steps DM
- `src/pages/admin/CohortDetail.tsx` — Hook welcome messages into activation
- `src/components/CohortManagement.tsx` — Same hook for list-view activation
- `src/pages/admin/MessageTemplates.tsx` — **NEW** admin UI for templates
- `src/components/ManualMatchingBoard.tsx` — Profile previews
- `src/components/MenteeProfile.tsx` / `MentorProfile.tsx` — Profile display
- `src/pages/admin/PeopleAnalytics.tsx` — Analytics charts
