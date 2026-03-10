# Phase 1 Integration Guide

Quick reference for integrating the new Phase 1 services into your UI.

---

## 🔄 Step-by-Step Integration

### Step 1: Run Database Migrations

```sql
-- In Supabase SQL Editor, run in order:
1. database/phase1_foundation_migration.sql
2. database/seed_data.sql
```

### Step 2: Initialize Badges

```typescript
// Run once, either in a migration script or admin panel
import { initializeBadges } from '@/lib/badgeService'

await initializeBadges()
```

### Step 3: Replace UserContext

```bash
# Backup old context
mv src/contexts/UserContext.tsx src/contexts/UserContext.old.tsx

# Use new context
mv src/contexts/UserContext.new.tsx src/contexts/UserContext.tsx
```

### Step 4: Update Imports

Find and replace across your codebase:
- Old: `from '@/types/database'`
- New: `from '@/types/database.types'` (for new tables)

---

## 📚 Common Patterns

### User Authentication & Profile

```typescript
import { useUser } from '@/contexts/UserContext'
import { getUserProfile, updateUserProfile } from '@/lib/userProfileService'

function ProfilePage() {
  const { userProfile, refreshProfile } = useUser()

  const handleUpdate = async (updates) => {
    await updateUserProfile(userProfile.id, updates)
    await refreshProfile()
  }

  return (
    <div>
      <h1>{userProfile.full_name}</h1>
      <p>{userProfile.role_title} at {userProfile.department}</p>
    </div>
  )
}
```

### Recording a Growth Event

```typescript
import { createGrowthEvent } from '@/lib/growthEventsService'
import { updateSkillProgress } from '@/lib/skillsService'
import { evaluateBadges } from '@/lib/badgeService'

async function recordMentoringSession(sessionData) {
  // 1. Create growth event
  const event = await createGrowthEvent({
    user_id: sessionData.userId,
    program_cohort_id: sessionData.cohortId,
    event_type: 'mentoring_session',
    title: sessionData.title,
    description: sessionData.notes,
    event_date: sessionData.date,
    related_user_id: sessionData.mentorId,
    skills_developed: sessionData.skills,
    rating: sessionData.rating,
    reflection: sessionData.reflection
  })

  // 2. Update skill progress (auto-levels up!)
  if (sessionData.skills?.length > 0) {
    await updateSkillProgress(sessionData.userId, sessionData.skills, event.id)
  }

  // 3. Check for new badges
  const newBadges = await evaluateBadges(sessionData.userId)
  if (newBadges.length > 0) {
    // Show celebration modal
    showBadgeEarnedModal(newBadges)
  }

  return event
}
```

### Growth Timeline Display

```typescript
import { getGrowthTimelineWithProfiles } from '@/lib/growthEventsService'
import { useState, useEffect } from 'react'

function GrowthTimeline({ userId }) {
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    const loadEvents = async () => {
      const timeline = await getGrowthTimelineWithProfiles(userId, {
        eventType: filter,
        limit: 50
      })
      setEvents(timeline)
    }
    loadEvents()
  }, [userId, filter])

  return (
    <div>
      <FilterButtons onFilterChange={setFilter} />
      {events.map(event => (
        <GrowthEventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
```

### Skills Portfolio

```typescript
import { getUserSkillsByProficiency } from '@/lib/skillsService'

function SkillsPortfolio({ userId }) {
  const [skillsByLevel, setSkillsByLevel] = useState(null)

  useEffect(() => {
    const loadSkills = async () => {
      const skills = await getUserSkillsByProficiency(userId)
      setSkillsByLevel(skills)
    }
    loadSkills()
  }, [userId])

  return (
    <div>
      <h2>Expert ({skillsByLevel?.expert?.length})</h2>
      {skillsByLevel?.expert?.map(s => (
        <SkillBadge key={s.id} skill={s.skill} level="expert" />
      ))}

      <h2>Proficient ({skillsByLevel?.proficient?.length})</h2>
      {skillsByLevel?.proficient?.map(s => (
        <SkillBadge key={s.id} skill={s.skill} level="proficient" />
      ))}

      {/* ... practicing, learning */}
    </div>
  )
}
```

### Badge Showcase

```typescript
import { getUserBadges, getBadgeProgress } from '@/lib/badgeService'

function BadgeShowcase({ userId }) {
  const [earnedBadges, setEarnedBadges] = useState([])
  const [progressBadges, setProgressBadges] = useState([])

  useEffect(() => {
    const loadBadges = async () => {
      const earned = await getUserBadges(userId)
      const progress = await getBadgeProgress(userId)
      setEarnedBadges(earned)
      setProgressBadges(progress)
    }
    loadBadges()
  }, [userId])

  return (
    <div>
      <h2>Earned Badges ({earnedBadges.length})</h2>
      <div className="badge-grid">
        {earnedBadges.map(ub => (
          <Badge key={ub.id} badge={ub.badge} earnedAt={ub.earned_at} />
        ))}
      </div>

      <h2>In Progress</h2>
      {progressBadges.map(pb => (
        <ProgressBadge
          key={pb.badge.id}
          badge={pb.badge}
          progress={pb.progress}
          target={pb.target}
        />
      ))}
    </div>
  )
}
```

### Cross-Exposure Marketplace

```typescript
import { getHostOfferings } from '@/lib/crossExposureService'

function ShadowMarketplace() {
  const [offerings, setOfferings] = useState([])
  const [filters, setFilters] = useState({ isActive: true })

  useEffect(() => {
    const loadOfferings = async () => {
      const data = await getHostOfferings(filters)
      setOfferings(data)
    }
    loadOfferings()
  }, [filters])

  return (
    <div>
      <SearchBar onSearch={setFilters} />
      <div className="offerings-grid">
        {offerings.map(offering => (
          <OfferingCard
            key={offering.id}
            offering={offering}
            host={offering.host_profile}
          />
        ))}
      </div>
    </div>
  )
}
```

### Booking a Shadow Experience

```typescript
import { createShadowBooking } from '@/lib/crossExposureService'

async function bookShadowExperience(bookingData) {
  const booking = await createShadowBooking({
    host_offering_id: bookingData.offeringId,
    host_user_id: bookingData.hostId,
    shadow_user_id: bookingData.shadowId,
    booking_type: 'single',
    start_datetime: bookingData.startTime,
    end_datetime: bookingData.endTime,
    duration_hours: bookingData.duration,
    learning_goals: bookingData.goals,
    skills_to_develop: bookingData.skills,
    status: 'confirmed'
  })

  if (booking) {
    // Send confirmation email
    // Add to calendar
    // Show success message
  }

  return booking
}
```

### Completing a Shadow Experience with Feedback

```typescript
import { completeBooking } from '@/lib/crossExposureService'

async function submitShadowFeedback(bookingId, feedbackData) {
  // This auto-creates growth events for both host and shadow!
  // Also updates skill progress
  const success = await completeBooking(bookingId, {
    shadowRating: feedbackData.rating,
    shadowReflection: feedbackData.reflection,
    skillsDeveloped: feedbackData.skills
  })

  if (success) {
    // Show success message
    // Check for new badges
    await evaluateBadges(feedbackData.shadowUserId)
  }

  return success
}
```

### Analytics Dashboard

```typescript
import { getGrowthAnalytics, getSkillsDevelopmentAnalytics } from '@/lib/analyticsService'

function AdminAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [dateRange, setDateRange] = useState({
    startDate: '2025-01-01',
    endDate: '2025-03-31'
  })

  useEffect(() => {
    const loadAnalytics = async () => {
      const growth = await getGrowthAnalytics(dateRange)
      const skills = await getSkillsDevelopmentAnalytics(dateRange)
      setAnalytics({ growth, skills })
    }
    loadAnalytics()
  }, [dateRange])

  return (
    <div>
      <DateRangePicker onChange={setDateRange} />

      <KPICards>
        <KPI label="Total Participants" value={analytics?.growth.totalParticipants} />
        <KPI label="Growth Events" value={analytics?.growth.totalGrowthEvents} />
        <KPI label="Skills Developed" value={analytics?.growth.uniqueSkillsDeveloped} />
      </KPICards>

      <SkillsChart data={analytics?.skills.topSkills} />
    </div>
  )
}
```

### Recommendations Display

```typescript
import { getRecommendationsForUser, completeRecommendation } from '@/lib/growthRecommendationsService'

function RecommendationsWidget({ userId }) {
  const [recommendations, setRecommendations] = useState({ active: [], completed: [] })

  useEffect(() => {
    const loadRecs = async () => {
      const recs = await getRecommendationsForUser(userId)
      setRecommendations(recs)
    }
    loadRecs()
  }, [userId])

  const handleComplete = async (recId) => {
    await completeRecommendation(recId)
    // Refresh
    const recs = await getRecommendationsForUser(userId)
    setRecommendations(recs)
  }

  return (
    <div>
      <h3>Next Steps</h3>
      {recommendations.active.map(rec => (
        <RecommendationCard
          key={rec.id}
          recommendation={rec}
          onComplete={() => handleComplete(rec.id)}
        />
      ))}
    </div>
  )
}
```

---

## 🎨 UI Component Suggestions

### GrowthEventCard
```typescript
interface GrowthEventCardProps {
  event: GrowthEvent & { related_user?: any }
}

function GrowthEventCard({ event }: GrowthEventCardProps) {
  const icon = getEventIcon(event.event_type)

  return (
    <div className="event-card">
      <div className="icon">{icon}</div>
      <div className="content">
        <h4>{event.title}</h4>
        <p>{event.description}</p>
        <div className="meta">
          <span>{formatDate(event.event_date)}</span>
          {event.related_user && (
            <span>with {event.related_user.full_name}</span>
          )}
        </div>
        {event.skills_developed && (
          <SkillBadges skills={event.skills_developed} />
        )}
        {event.rating && <Rating value={event.rating} />}
        {event.reflection && (
          <Collapsible title="Reflection">
            {event.reflection}
          </Collapsible>
        )}
      </div>
    </div>
  )
}
```

### SkillProgressBar
```typescript
interface SkillProgressBarProps {
  skill: UserSkillProgress & { skill?: Skill }
}

function SkillProgressBar({ skill }: SkillProgressBarProps) {
  const levelColors = {
    learning: 'blue',
    practicing: 'yellow',
    proficient: 'green',
    expert: 'purple'
  }

  return (
    <div className="skill-progress">
      <div className="skill-info">
        <span className="name">{skill.skill.name}</span>
        <span className="level">{skill.proficiency_level}</span>
      </div>
      <div className="progress-bar">
        <div
          className="fill"
          style={{
            width: `${(skill.evidence_count / 10) * 100}%`,
            backgroundColor: levelColors[skill.proficiency_level]
          }}
        />
      </div>
      <span className="evidence">{skill.evidence_count} evidence</span>
    </div>
  )
}
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot read properties of undefined"
**Solution:** Always check if data exists before rendering
```typescript
{userProfile?.programs?.map(...)}  // Good
{userProfile.programs.map(...)}    // Bad - will crash if null
```

### Issue: "Infinite re-render loop"
**Solution:** Add dependency arrays to useEffect
```typescript
useEffect(() => {
  loadData()
}, [userId])  // ✅ Good - only runs when userId changes
```

### Issue: "Skills not auto-updating"
**Solution:** Call updateSkillProgress after creating growth events
```typescript
const event = await createGrowthEvent(...)
await updateSkillProgress(userId, skills, event.id)  // Don't forget this!
```

### Issue: "Badges not appearing"
**Solution:** Run initializeBadges() first, then evaluateBadges(userId)
```typescript
// One-time setup
await initializeBadges()

// After each growth event
await evaluateBadges(userId)
```

---

## 📝 Migration Checklist

- [ ] Run phase1_foundation_migration.sql
- [ ] Run seed_data.sql
- [ ] Initialize badges with initializeBadges()
- [ ] Replace UserContext
- [ ] Update components to use new services
- [ ] Test user profile loading
- [ ] Test growth event creation
- [ ] Test skill progression
- [ ] Test badge awarding
- [ ] Test cross-exposure booking flow
- [ ] Test analytics dashboard
- [ ] Remove old mentee/mentor code
- [ ] Update navigation
- [ ] Deploy!

---

## 🚀 Ready to Build!

All services are ready for integration. Start with:
1. Growth Journey Dashboard (Phase 2)
2. Skills Portfolio
3. Cross-Exposure Marketplace

**Happy coding! 🎉**