# Mentee Recommendations Feature

## Overview
This feature adds dynamic, stage-based recommendations to the mentee dashboard with completion tracking. Recommendations change based on the mentee's current match status and can be checked off as completed.

## What Changed

### 1. Database Schema
**New Table: `mentee_recommendations`**
- Tracks recommendations for each mentee
- Links recommendations to specific match stages
- Stores completion status and timestamps
- Location: `database_migration_mentee_recommendations.sql`

**Key fields:**
- `mentee_id` - Links to the mentee
- `recommendation_key` - Unique identifier for each recommendation type
- `stage` - Which match status this recommendation applies to (unassigned, awaiting_match, match_pending, matched)
- `is_completed` - Boolean tracking completion
- `completed_at` - Timestamp of completion

### 2. Service Layer
**New Service: `recommendationsService.ts`**

Functions:
- `initializeRecommendationsForMentee()` - Creates recommendations for a mentee's current stage
- `getRecommendationsForMentee()` - Fetches active and completed recommendations
- `completeRecommendation()` - Marks a recommendation as done
- `uncompleteRecommendation()` - Unmarks a recommendation
- `getRecommendationStats()` - Gets completion statistics
- `updateRecommendationsForStageChange()` - Updates when mentee status changes

**Recommendation Templates:**
Different recommendations appear for each stage:

**Unassigned Stage:**
- Complete your profile
- Review your learning goals
- Set your expectations

**Awaiting Match Stage:**
- Clarify your mentoring goals
- Prepare availability
- Gather context

**Match Pending Stage:**
- Review mentor recommendations
- Prepare your questions
- Share your preference

**Matched Stage:**
- Introduce yourself
- Schedule your kickoff session
- Prepare session topics
- Agree on meeting cadence

### 3. UI Updates
**MenteeDashboard Component (`MenteeDashboard.tsx`)**

New features:
- Dynamic recommendations based on current match status
- Checkbox interface for marking items complete
- Separate sections for active and completed items
- Visual feedback with icons, strikethrough for completed items
- Optimistic UI updates for instant feedback
- Toast notifications on completion

**Visual Design:**
- Active items: Full opacity, no strikethrough, primary icon color
- Completed items: Reduced opacity, strikethrough text, muted icon color
- Hover states for better interactivity
- Smooth transitions between states

### 4. Type Definitions
Updated `database.ts` to include:
- `mentee_recommendations` table schema
- New enum for `match_status`

## How It Works

1. **Initialization**: When a mentee views their dashboard, recommendations are automatically created for their current match stage if they don't already exist.

2. **Display**: The dashboard shows recommendations specific to the mentee's current stage (unassigned, awaiting_match, match_pending, or matched).

3. **Completion**: Mentees can check off recommendations using checkboxes. Completed items move to a "Completed" section below active items.

4. **Persistence**: Completion status is saved to the database, so it persists across sessions.

5. **Stage Transitions**: As a mentee progresses through stages (e.g., from awaiting_match to matched), they see new relevant recommendations.

## Migration Steps

1. **Run the database migration:**
   ```bash
   # Connect to your Supabase database and run:
   psql -f database_migration_mentee_recommendations.sql
   ```

2. **Verify the table was created:**
   ```sql
   SELECT * FROM mentee_recommendations LIMIT 5;
   ```

3. **Test the feature:**
   - Log in as a mentee
   - View the dashboard
   - Check off a recommendation
   - Refresh the page to verify persistence

## Future Enhancements

Potential additions:
- Custom recommendations from mentors or program managers
- Deadline/due dates for recommendations
- Progress tracking across all stages
- Email notifications for new recommendations
- Recommendation insights/analytics for program managers
- Ability to add notes when completing recommendations
- Integration with action items system
- Recommendation suggestions based on mentee behavior

## Technical Notes

- Uses optimistic UI updates for instant feedback
- Upsert strategy prevents duplicate recommendations
- Automatic timestamp management with database triggers
- Indexes on key fields for query performance
- Icons dynamically loaded from lucide-react
- Toast notifications for user feedback