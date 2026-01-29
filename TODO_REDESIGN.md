# SkillPoint Profile-Centric Redesign - Implementation TODO

## 🎯 **OVERVIEW**
This document tracks the complete redesign of SkillPoint from a program-centric mentoring app to a profile-centric growth platform with multiple programs (mentoring + cross-exposure).

**Timeline**: 20 weeks (5 phases × 4 weeks each)
**Team**: 2 full-stack engineers, 1 designer, 1 PM
**Status**: Planning Complete ✅ | Implementation Starting 🚀

---

## 📊 **PHASE 1: FOUNDATION (Weeks 1-4)** ✅ **COMPLETE**

### **Week 1-2: Database Schema Creation** ✅

#### **Core Tables** ✅
- [x] Create `user_profiles` table ✅
- [x] Create `programs` table ✅
- [x] Create `program_cohorts` table ✅
- [x] Create `program_participants` table ✅
- [x] Create `growth_events` table ✅
- [x] Create `skills` table ✅
- [x] Create `user_skill_progress` table ✅
- [x] Create `badges` table ✅
- [x] Create `user_badges` table ✅
- [x] Create `growth_recommendations` table ✅

#### **Cross-Exposure Tables** ✅
- [x] Create `host_offerings` table ✅
- [x] Create `shadow_bookings` table ✅
- [x] Create `host_availability_blocks` table ✅

#### **Update Existing Tables** ✅
- [x] Add `program_type` field to `survey_templates` table ✅
- [x] Add `growth_event_id` field to `sessions` table ✅

#### **Database Cleanup** ✅
- [x] Export backup of current `mentees` table ✅
- [x] Export backup of current `mentors` table ✅
- [ ] Drop `mentees` table ⏳ (pending data migration)
- [ ] Drop `mentors` table ⏳ (pending data migration)

#### **RLS Policies** ✅
- [x] Add RLS policies for `user_profiles` ✅
- [x] Add RLS policies for `program_participants` ✅
- [x] Add RLS policies for `growth_events` ✅
- [x] Add RLS policies for `skills` and `user_skill_progress` ✅
- [x] Add RLS policies for `badges` and `user_badges` ✅
- [x] Add RLS policies for `host_offerings`, `shadow_bookings`, `host_availability_blocks` ✅

### **Week 3: Service Layer Creation** ✅

#### **New Services** ✅
- [x] Create `src/lib/userProfileService.ts` ✅
- [x] Create `src/lib/growthEventsService.ts` ✅
- [x] Create `src/lib/programCohortService.ts` ✅
- [x] Create `src/lib/skillsService.ts` ✅
- [x] Create `src/lib/crossExposureService.ts` ✅
- [x] Create `src/lib/badgeService.ts` ✅
- [x] Create `src/lib/growthRecommendationsService.ts` ✅
- [x] Create `src/lib/analyticsService.ts` ✅

#### **Update Existing Services** (Optional - Phase 2)
- [ ] Update `src/lib/matchingEngine.ts` ⏳ (can wait)
- [ ] Update `src/lib/supabaseService.ts` ⏳ (can wait)

### **Week 4: Context & Types Update** ✅

#### **Update Contexts** ✅
- [x] Create `src/contexts/UserContext.new.tsx` ✅
  - Multi-program support
  - Role checking helpers
  - Program participation tracking

#### **Update Types** ✅
- [x] Create `src/types/database.types.ts` ✅
  - All new table types
  - Full TypeScript support

#### **Testing & Validation** ✅
- [x] Test database schema creation ✅
- [x] Create seed data script ✅
- [x] Load seed data successfully ✅
  - 8 sample users
  - 25 skills
  - 1 mentoring cohort with participants
  - Growth events, skill progress, host offerings
- [x] Initialize badges (9 default badges) ✅
- [x] Test all services ✅
  - User profiles ✅
  - Program participation ✅
  - Growth timeline ✅
  - Skills progress ✅
  - Badge system ✅
  - Host offerings ✅

---

## 📱 **PHASE 2: EMPLOYEE EXPERIENCE (Weeks 5-8)** 🚧 **IN PROGRESS**

### **Week 5-6: Growth Journey Dashboard** ✅ **COMPLETE**

#### **New Pages**
- [x] Create `src/pages/GrowthJourneyHome.tsx` ✅
  - [x] 3-column layout (summary | timeline | insights)
  - [x] User profile summary card
  - [x] Programs quick access card
  - [x] Skills progress widget
  - [x] Recent badges widget
  - [ ] Upcoming events widget (skipped for now)

- [x] Create `src/pages/SkillsPortfolioPage.tsx` ✅
  - [x] Tabs: Current Skills | In Development | Timeline
  - [x] Skills grouped by proficiency level
  - [x] Skill progression chart (progress bars)
  - [x] Evidence events per skill

- [x] Create `src/pages/UnifiedProfilePage.tsx` ✅
  - [x] Editable profile form
  - [x] Sections: Basic Info | Bio | Program History
  - [x] Save/Cancel buttons
  - [x] Program history is read-only

#### **New Components**
- [x] Create `src/components/growth/GrowthTimeline.tsx` ✅
  - [x] Filter buttons (All | Mentoring | Cross-Exposure | Badges | Reflections)
  - [ ] Time range selector (future enhancement)
  - [ ] Infinite scroll or pagination (future enhancement)
  - [x] Empty state

- [x] Create `src/components/growth/GrowthEventCard.tsx` ✅
  - [x] Event icon based on type
  - [x] Title, description, date
  - [x] Related user display
  - [x] Skills badges
  - [x] Rating stars
  - [x] Reflection toggle (collapsible)

- [x] Create `src/components/growth/SkillsProgressWidget.tsx` ✅
  - [x] Current skills being developed
  - [x] Progress bars with evidence count
  - [x] Link to full portfolio

- [x] Create `src/components/growth/BadgesShowcase.tsx` ✅
  - [x] Grid of badge icons
  - [x] Tooltips with descriptions
  - [x] Earned date

- [x] Create `src/components/growth/UserProfileSummaryCard.tsx` ✅
  - [x] Avatar, name, role
  - [x] Department, timezone
  - [x] Quick stats (events this month, skills developing, badges earned)

- [x] Create `src/components/growth/ProgramsQuickAccessCard.tsx` ✅
  - [x] List of user's programs
  - [x] Role badges (mentee, mentor, host, shadow)
  - [x] Quick links to program pages

- [ ] Create `src/components/growth/UpcomingEventsWidget.tsx` (future enhancement)

### **Week 7-8: Navigation & Routing**

#### **Update Components**
- [x] Update `src/components/Layout.tsx` ✅
  - [x] New navigation items: Growth Journey button added
  - [ ] Programs dropdown: Mentoring | Cross-Exposure (future)
  - [x] Update styling and active states

- [x] Update `src/App.tsx` ✅
  - [ ] Change `/dashboard` route to GrowthJourneyHome (keeping old dashboard for now)
  - [x] Add `/growth` route to GrowthJourneyHome ✅
  - [x] Add `/skills-portfolio` route to SkillsPortfolioPage ✅
  - [x] Add `/profile` route to UnifiedProfilePage ✅
  - [x] Add `/programs/mentoring` route ✅
  - [x] Add `/programs/cross-exposure` route ✅
  - [x] Keep existing protected route logic ✅

#### **Program Pages** ✅
- [x] Create `src/pages/MentoringProgramPage.tsx` ✅
  - [x] Show user's mentoring role(s) ✅
  - [x] If mentee: show mentor, upcoming sessions, action items ✅
  - [x] If mentor: show mentees, upcoming sessions, action items ✅
  - [x] Link to existing mentoring features ✅

- [x] Create `src/pages/CrossExposureProgramPage.tsx` ✅
  - [x] Tabs: Browse Hosts | My Bookings | Host Dashboard (if hosting) ✅
  - [x] Hub for all cross-exposure features ✅

#### **Update Signup Flow** ✅
- [x] Update `src/pages/MenteeSignup.tsx` ✅
  - [x] Save to user_profiles in addition to mentees table ✅
  - [x] Create program_participant record ✅
  - [x] Redirect to GrowthJourneyHome on completion ✅

- [x] Update `src/pages/MentorSignup.tsx` ✅
  - [x] Save to user_profiles in addition to mentors table ✅
  - [x] Create program_participant record ✅
  - [x] Redirect to GrowthJourneyHome on completion ✅

---

## 🤝 **PHASE 3: CROSS-EXPOSURE MODULE (Weeks 9-12)**

### **Week 9: Host Features** ✅ **COMPLETE**

#### **Host Offering Creation** ✅
- [x] Create `src/pages/cross-exposure/CreateHostOffering.tsx` ✅
  - [x] Form: title, description, skills offered, what shadow will do ✅
  - [x] Capacity settings: max concurrent shadows, slots per week ✅
  - [x] Availability selector component ✅
  - [x] Submit creates host_offerings record ✅

- [x] Create `src/components/cross-exposure/AvailabilitySelector.tsx` ✅
  - [x] Weekly recurring schedule UI ✅
  - [x] Day selector with time blocks ✅
  - [x] Add/remove time slots ✅
  - [x] Preview of weekly schedule ✅

#### **Host Dashboard** ✅
- [x] Host Dashboard integrated into CrossExposureProgramPage ✅
  - [x] Stats cards: active offerings, upcoming bookings, total shadows hosted ✅
  - [x] My Offerings section ✅
  - [x] Upcoming bookings list ✅
  - [x] Link to create new offering ✅

- [x] Create `src/components/cross-exposure/HostOfferingCard.tsx` ✅
  - [x] Display offering details ✅
  - [x] Edit/Delete buttons ✅
  - [x] Toggle active/inactive ✅
  - [x] "Manage Calendar" button ✅

- [x] Create `src/components/cross-exposure/HostCalendarModal.tsx` ✅
  - [x] Calendar view with booked dates ✅
  - [x] Day detail view showing bookings ✅
  - [x] Cancel booking functionality ✅
  - [x] View shadow details per booking ✅

### **Week 10: Shadow Features** ✅ **COMPLETE**

#### **Shadow Marketplace** ✅
- [x] Create `src/pages/cross-exposure/ShadowMarketplace.tsx` ✅
  - [x] Filter bar: department, skill, availability ✅
  - [x] Offerings grid ✅
  - [x] Search functionality ✅
  - [x] Empty state ✅

- [x] Create `src/components/cross-exposure/OfferingCard.tsx` ✅
  - [x] Host name, role, department ✅
  - [x] Offering title and description preview ✅
  - [x] Skills offered badges ✅
  - [x] Slots available indicator ✅
  - [x] Click to view details ✅

#### **Offering Detail & Booking** ✅
- [x] Create `src/pages/cross-exposure/OfferingDetail.tsx` ✅
  - [x] Full offering details (left column) ✅
  - [x] Booking calendar (right column) ✅
  - [x] Date selector ✅
  - [x] Available time slots for selected date ✅
  - [x] Booking form: learning goals, skills to develop ✅
  - [x] Confirm booking button ✅

- [x] Create `src/components/cross-exposure/BookingCalendar.tsx` ✅
  - [x] Calendar component ✅
  - [x] Highlight dates with availability ✅
  - [x] Disable past dates and blocked dates ✅
  - [x] Time slot selector for chosen date ✅

- [x] Create `src/components/cross-exposure/BookingForm.tsx` ✅
  - [x] Learning goals textarea ✅
  - [x] Skills to develop multiselect ✅
  - [x] Duration display ✅
  - [x] Submit handler ✅

### **Week 11: Booking Management**

#### **My Bookings**
- [ ] Create `src/pages/cross-exposure/MyShadowSessions.tsx`
  - [ ] Tabs: As Shadow | As Host
  - [ ] Filter: Upcoming | Completed
  - [ ] List of bookings
  - [ ] Stats summary

- [ ] Create `src/components/cross-exposure/BookingCard.tsx`
  - [ ] Shadow/Host name and role
  - [ ] Date, time, duration
  - [ ] Learning goals / offering title
  - [ ] Status badge
  - [ ] Actions: View details, Cancel (if upcoming), Add feedback (if completed)

- [ ] Create `src/components/cross-exposure/BookingDetailModal.tsx`
  - [ ] Full booking information
  - [ ] Shadow goals
  - [ ] Host offering details
  - [ ] Meeting logistics (if any)
  - [ ] Cancel booking option

### **Week 12: Completion & Feedback**

#### **Booking Completion Flow**
- [ ] Create `src/components/cross-exposure/CompleteBookingModal.tsx`
  - [ ] Rating (1-5 stars)
  - [ ] Reflection/feedback textarea
  - [ ] Skills actually developed multiselect
  - [ ] Submit creates growth events for both shadow and host

- [ ] Update `crossExposureService.ts`
  - [ ] completeBooking function
  - [ ] Creates growth_event for shadow (type: 'cross_exposure_shadow')
  - [ ] Creates growth_event for host (type: 'cross_exposure_host')
  - [ ] Updates shadow_bookings.status to 'completed'
  - [ ] Saves feedback and ratings

#### **Notifications**
- [ ] Add notification when shadow books
- [ ] Add notification when booking is cancelled
- [ ] Add reminder 1 day before booking
- [ ] Add prompt to complete feedback after booking ends

#### **Admin Cross-Exposure Management** ✅ **COMPLETE (Oct 2025)**
- [x] Admin can view all host offerings ✅
- [x] Admin can activate/deactivate/delete offerings ✅
- [x] Admin can view all bookings with filters ✅
- [x] Admin has analytics dashboard for cross-exposure ✅
- [x] Stats: active hosts, shadows, sessions, hours ✅
- [x] Insights: top skills, departments, active hosts ✅

---

## 🎛️ **PHASE 4: GROWTH ANALYTICS (Weeks 13-16)**

### **Week 13-14: Analytics Dashboard**

#### **Admin Growth Analytics**
- [ ] Create `src/pages/admin/GrowthAnalyticsDashboard.tsx`
  - [ ] Date range picker (default: last 3 months)
  - [ ] KPI cards: employees in programs, growth events, skills developed, cross-department connections
  - [ ] Tabs: Overview | Skills Development | Program Participation | Cross-Silo | Growth Stories

- [ ] Create `src/components/admin/analytics/OrganizationOverview.tsx`
  - [ ] Growth events over time chart
  - [ ] Program distribution pie chart
  - [ ] Most active departments table
  - [ ] Completion rates chart

- [ ] Create `src/components/admin/analytics/SkillsDevelopmentAnalytics.tsx`
  - [ ] Top skills being developed (bar chart)
  - [ ] Skills by category (pie chart)
  - [ ] Skills gap analysis
  - [ ] Skill progression trends over time

- [ ] Create `src/components/admin/analytics/ProgramParticipationAnalytics.tsx`
  - [ ] Mentoring metrics: active pairs, sessions, completion rate
  - [ ] Cross-exposure metrics: bookings, hours shadowed, hosts active
  - [ ] Program overlap Venn diagram (users in multiple programs)

- [ ] Create `src/components/admin/analytics/CrossSiloConnectionsGraph.tsx`
  - [ ] Department interaction heatmap
  - [ ] Network graph (departments as nodes)
  - [ ] Cross-functional mobility paths

### **Week 15-16: Analytics Services & Queries**

#### **Analytics Service Implementation**
- [ ] Implement `getGrowthAnalytics(dateRange)` in analyticsService
  - [ ] Query total participants across all programs
  - [ ] Calculate participation rate (participants / total employees)
  - [ ] Count growth events in date range
  - [ ] Extract unique skills being developed
  - [ ] Calculate cross-department connections

- [ ] Implement `getSkillsDevelopmentAnalytics(dateRange)`
  - [ ] Top 20 skills by evidence count
  - [ ] Group skills by category
  - [ ] Calculate skill progression trends

- [ ] Implement `getProgramParticipationStats(dateRange)`
  - [ ] Mentoring stats (from program_participants + growth_events)
  - [ ] Cross-exposure stats (from shadow_bookings)
  - [ ] Program overlap (users in both programs)

- [ ] Implement `getCrossDepartmentConnections(dateRange)`
  - [ ] Query growth_events with related_user_id
  - [ ] Build department → department interaction matrix
  - [ ] Count connections per pair

#### **Data Export**
- [ ] Add CSV export button to each analytics view
- [ ] Implement exportAnalyticsToCSV(type, dateRange)
- [ ] Generate downloadable CSV files

#### **Admin Dashboard Updates**
- [ ] Update `src/pages/admin/AdminDashboard.tsx`
  - [ ] Add top-level "Growth Analytics" link
  - [ ] Keep existing "Program Management" section
  - [ ] Add navigation between analytics and programs

---

## 🎉 **PHASE 5: DELIGHT FEATURES (Weeks 17-20)**

### **Week 17-18: Badges System**

#### **Badge Definitions**
- [ ] Create badge definitions in `badgeService.ts`
  - [ ] Milestone badges: "First Steps", "Program Graduate"
  - [ ] Skill badges: "Skill Champion"
  - [ ] Engagement badges: "Active Learner", "Reflective Practitioner", "Cross-Functional Explorer"
  - [ ] Impact badges: "Great Mentor", "Generous Host"

- [ ] Implement badge criteria logic
  - [ ] Event count criteria
  - [ ] Skills proficiency criteria
  - [ ] Rating criteria
  - [ ] Department diversity criteria

#### **Badge Evaluation Engine**
- [ ] Implement `evaluateBadges(userId)` in badgeService
  - [ ] Check all badge criteria for user
  - [ ] Award badges that are newly earned
  - [ ] Create badge_earned growth event
  - [ ] Send notification to user

- [ ] Add badge evaluation trigger
  - [ ] Call evaluateBadges after each growth event creation
  - [ ] Call for both user_id and related_user_id

#### **Badge Display Components**
- [ ] Update `src/components/growth/BadgesShowcase.tsx`
  - [ ] Query user_badges table
  - [ ] Display badge grid with icons
  - [ ] Tooltips with badge name, description, earned date
  - [ ] Progress indicators for almost-earned badges

- [ ] Create `src/components/growth/BadgeDetailModal.tsx`
  - [ ] Full badge information
  - [ ] How to earn it (criteria)
  - [ ] Evidence (which growth event triggered it)

- [ ] Add badges to Growth Timeline
  - [ ] Show badge_earned events
  - [ ] Display badge icon prominently

### **Week 19: Smart Nudges**

#### **Nudge Generation Engine**
- [ ] Implement `generateNudges(userId)` in nudgeService
  - [ ] Check for inactivity (no events in 30 days)
  - [ ] Check for sessions without reflections
  - [ ] Check for target skills with no recent progress
  - [ ] Check for badges close to unlocking
  - [ ] Check for new programs launched

- [ ] Create nudge types
  - [ ] inactivity: "Time to get back on track!"
  - [ ] reflection_missing: "Capture your learnings"
  - [ ] skill_progress: "Practice [skill]"
  - [ ] badge_progress: "Almost there! [X] away from [badge]"
  - [ ] new_program: "New opportunity available!"

#### **Nudges Display**
- [ ] Create `src/components/growth/NudgesPanel.tsx`
  - [ ] Query generateNudges(userId)
  - [ ] Display top 2-3 nudges
  - [ ] Action buttons to act on nudges
  - [ ] Integrate into GrowthJourneyHome sidebar

- [ ] Add nudge actions
  - [ ] Link to relevant pages based on nudge type
  - [ ] Pre-fill forms where applicable
  - [ ] Track nudge click-through

### **Week 20: Recognition & Storytelling**

#### **Growth Stories Feed**
- [ ] Create `src/components/recognition/GrowthStoriesFeed.tsx`
  - [ ] Query recent badge earnings (company-wide)
  - [ ] Query public reflections (visibility = 'public')
  - [ ] Combine and sort by timestamp
  - [ ] Display as feed with avatars, names, achievements

- [ ] Add to Growth Analytics Dashboard
  - [ ] Display in "Growth Stories" tab
  - [ ] Allow admins to feature/highlight stories

- [ ] Add visibility toggle to reflections
  - [ ] Update growth_events to have visibility field
  - [ ] Allow users to make reflections public

#### **Notification System**
- [ ] Create `src/lib/notificationService.ts`
  - [ ] sendInAppNotification(userId, notification)
  - [ ] sendEmailNotification(userId, subject, body)
  - [ ] sendSlackNotification(channel, message)

- [ ] Implement weekly digest email
  - [ ] Schedule: Every Monday 9am
  - [ ] Content: Last week's growth events, badges earned, upcoming events
  - [ ] Template with HTML formatting
  - [ ] Link to Growth Journey Dashboard

#### **Slack/Teams Integration**
- [ ] Add webhook configuration to .env
  - [ ] VITE_SLACK_WEBHOOK_URL
  - [ ] VITE_TEAMS_WEBHOOK_URL

- [ ] Implement Slack posting
  - [ ] Post badge earnings to #growth-celebrations
  - [ ] Format with Slack blocks (rich formatting)
  - [ ] Include user name, badge name, badge description

- [ ] Implement weekly company digest
  - [ ] Post summary of week's activity
  - [ ] Top achievements, most active employees
  - [ ] Link to platform

#### **In-App Notifications**
- [ ] Create notification table in database (optional - can use Supabase built-in)
- [ ] Add bell icon to navigation
- [ ] Create notifications dropdown
- [ ] Mark as read functionality

---

## 🔐 **PHASE 6: PRODUCTION & SECURITY (Weeks 21-24)**

### **Week 21-22: Authentication & Security**

#### **Supabase Auth Integration**
- [ ] Replace localStorage auth with Supabase Auth
  - [ ] Set up Supabase Auth providers (email/password, Google, Microsoft)
  - [ ] Update UserContext to use Supabase Auth session
  - [ ] Implement proper signup flow with email verification
  - [ ] Implement login flow with error handling
  - [ ] Implement password reset flow
  - [ ] Add "Remember me" functionality

- [ ] Update RLS Policies
  - [ ] Restrict user_profiles to authenticated users only
  - [ ] Users can only read/update their own profile
  - [ ] Users can only see growth_events they're involved in
  - [ ] Admins can see all data (check auth.uid() is in admin list)
  - [ ] Test all RLS policies thoroughly

- [ ] Admin Role Management
  - [ ] Create admin_users table or use user metadata
  - [ ] Add is_admin check to all admin routes
  - [ ] Remove hardcoded admin credentials
  - [ ] Add admin user management interface

#### **Security Hardening**
- [ ] Input Validation
  - [ ] Add validation for all form inputs
  - [ ] Sanitize user-generated content (descriptions, reflections)
  - [ ] Prevent SQL injection in all queries
  - [ ] Add rate limiting to API calls

- [ ] Environment Variables
  - [ ] Move all sensitive config to .env
  - [ ] Create .env.example file
  - [ ] Document all required environment variables
  - [ ] Verify no secrets in git history

- [ ] CORS & CSP
  - [ ] Configure CORS properly for production domain
  - [ ] Add Content Security Policy headers
  - [ ] Configure allowed domains for webhooks

### **Week 23: Performance Optimization**

#### **Frontend Performance**
- [ ] Code Splitting
  - [ ] Implement React.lazy for route-based code splitting
  - [ ] Split large components (admin dashboard, analytics)
  - [ ] Lazy load charts and heavy libraries

- [ ] Optimization
  - [ ] Add React.memo to expensive components
  - [ ] Optimize re-renders with useMemo/useCallback
  - [ ] Implement virtual scrolling for long lists (timeline, bookings)
  - [ ] Optimize images (compress, lazy load, use WebP)

- [ ] Caching
  - [ ] Configure TanStack Query cache properly
  - [ ] Add service worker for offline capabilities
  - [ ] Implement optimistic updates for better UX

#### **Database Performance**
- [ ] Add missing indexes
  - [ ] Index on user_profiles.email
  - [ ] Index on growth_events.user_id, event_type, event_date
  - [ ] Index on shadow_bookings.host_user_id, shadow_user_id, start_datetime
  - [ ] Index on program_participants.user_id, program_cohort_id

- [ ] Query Optimization
  - [ ] Review and optimize slow queries
  - [ ] Use database functions for complex aggregations
  - [ ] Add pagination to all list queries
  - [ ] Implement cursor-based pagination for timeline

- [ ] Database Monitoring
  - [ ] Set up Supabase performance monitoring
  - [ ] Add query logging for slow queries (>1s)
  - [ ] Set up alerts for high database load

### **Week 24: Deployment & Infrastructure**

#### **Pre-Deployment Checklist**
- [ ] Code Quality
  - [ ] Run ESLint and fix all errors
  - [ ] Run TypeScript compiler and fix all type errors
  - [ ] Remove all console.logs and debug code
  - [ ] Add error boundaries to catch runtime errors

- [ ] Environment Setup
  - [ ] Create production environment in Supabase
  - [ ] Set up production database (separate from dev)
  - [ ] Configure production environment variables
  - [ ] Set up custom domain (if applicable)

#### **Vercel Deployment**
- [ ] Initial Setup
  - [ ] Create Vercel account/project
  - [ ] Connect GitHub repository
  - [ ] Configure build settings (vite build)
  - [ ] Add all environment variables to Vercel

- [ ] Deploy Staging
  - [ ] Deploy to staging environment first
  - [ ] Test all features in staging
  - [ ] Run full QA pass
  - [ ] Test with real users (pilot group)

- [ ] Deploy Production
  - [ ] Deploy to production domain
  - [ ] Verify all environment variables are set
  - [ ] Test critical user flows
  - [ ] Monitor for errors in first 24 hours

#### **Database Backups & Monitoring**
- [ ] Set up automated database backups
  - [ ] Daily backups enabled in Supabase
  - [ ] Test restore process
  - [ ] Set up backup retention policy (30 days)

- [ ] Monitoring & Alerting
  - [ ] Set up Vercel analytics
  - [ ] Configure Sentry or similar for error tracking
  - [ ] Set up uptime monitoring (UptimeRobot or Pingdom)
  - [ ] Create alerts for critical errors
  - [ ] Set up performance monitoring (Core Web Vitals)

#### **Documentation**
- [ ] Create deployment documentation
  - [ ] Step-by-step deployment guide
  - [ ] Environment variables documentation
  - [ ] Troubleshooting guide
  - [ ] Rollback procedures

- [ ] Create user documentation
  - [ ] User guide for employees
  - [ ] Admin guide
  - [ ] FAQ document
  - [ ] Video tutorials (optional)

---

## ♿ **PHASE 7: UX POLISH & ACCESSIBILITY (Weeks 25-26)**

### **Week 25: Mobile Responsiveness**

#### **Mobile Layout**
- [ ] Test all pages on mobile devices (iOS, Android)
- [ ] Fix navigation for mobile (hamburger menu)
- [ ] Make Growth Timeline mobile-friendly
- [ ] Optimize Skills Portfolio for mobile
- [ ] Make admin dashboard usable on tablets
- [ ] Fix booking calendar for touch devices

#### **Touch Interactions**
- [ ] Add touch gestures where appropriate (swipe, pinch-to-zoom)
- [ ] Increase tap target sizes (min 44×44px)
- [ ] Add touch feedback (hover states → active states)
- [ ] Fix modal/dropdown positioning on mobile

#### **Responsive Tables**
- [ ] Make data tables scroll horizontally on mobile
- [ ] Add card view option for mobile
- [ ] Implement collapsible rows for complex tables

### **Week 26: Accessibility (A11y)**

#### **Keyboard Navigation**
- [ ] Test full app with keyboard only (tab, enter, escape)
- [ ] Add focus indicators to all interactive elements
- [ ] Implement skip-to-content link
- [ ] Add keyboard shortcuts for common actions
- [ ] Ensure modal focus trapping works

#### **Screen Reader Support**
- [ ] Add ARIA labels to all icons and buttons
- [ ] Add ARIA live regions for dynamic content
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)
- [ ] Add alt text to all images
- [ ] Ensure form labels are properly associated

#### **Color & Contrast**
- [ ] Test color contrast ratios (WCAG AA minimum)
- [ ] Ensure info isn't conveyed by color alone
- [ ] Add high-contrast mode option
- [ ] Test with color blindness simulators

#### **Semantic HTML**
- [ ] Use proper heading hierarchy (h1 → h6)
- [ ] Use semantic HTML5 elements (nav, main, article, aside)
- [ ] Add landmark regions (role="navigation", "main", etc.)
- [ ] Ensure proper form structure

---

## ⚡ **PHASE 8: REAL-TIME FEATURES (Weeks 27-28)**

### **Week 27: Supabase Real-Time Setup**

#### **Real-Time Subscriptions**
- [ ] Set up Supabase Realtime on required tables
  - [ ] Enable realtime on `messages` table
  - [ ] Enable realtime on `action_items` table
  - [ ] Enable realtime on `shadow_bookings` table
  - [ ] Enable realtime on `user_badges` table

- [ ] Implement real-time hooks
  - [ ] Create `useRealtimeMessages(conversationId)` hook
  - [ ] Create `useRealtimeActionItems(userId)` hook
  - [ ] Create `useRealtimeBookings(userId)` hook
  - [ ] Create `useRealtimeBadges(userId)` hook

#### **Live Messaging**
- [ ] Update MessagingHub to use real-time
  - [ ] Subscribe to new messages
  - [ ] Show "user is typing" indicator
  - [ ] Show online/offline status
  - [ ] Auto-scroll to new messages
  - [ ] Play notification sound for new messages

- [ ] Message Status Indicators
  - [ ] Show "sending" state
  - [ ] Show "sent" checkmark
  - [ ] Show "delivered" double checkmark
  - [ ] Show "read" with timestamp

### **Week 28: Real-Time Notifications**

#### **Push Notifications**
- [ ] Implement browser push notifications
  - [ ] Request notification permission
  - [ ] Send notifications for new messages
  - [ ] Send notifications for action item assignments
  - [ ] Send notifications for upcoming bookings
  - [ ] Send notifications for badge earnings

- [ ] In-App Notifications
  - [ ] Create notification bell with badge count
  - [ ] Show toast notifications for real-time events
  - [ ] Group similar notifications
  - [ ] Mark notifications as read

#### **Real-Time Dashboard Updates**
- [ ] Auto-refresh Growth Timeline when new events added
- [ ] Auto-update booking status when host approves/cancels
- [ ] Auto-show new badge when earned
- [ ] Auto-update action items when completed

---

## 🧪 **TESTING & VALIDATION**

### **Phase 1 Testing**
- [ ] Test all database tables created successfully
- [ ] Test all service functions work
- [ ] Test UserContext loads user profile correctly
- [ ] Test RLS policies (users can only see their own data)
- [ ] Create comprehensive seed data

### **Phase 2 Testing**
- [ ] Test Growth Journey Dashboard loads timeline
- [ ] Test filtering on timeline works
- [ ] Test Skills Portfolio displays correctly
- [ ] Test Unified Profile editing works
- [ ] Test navigation between all new pages

### **Phase 3 Testing**
- [ ] Test host can create offering
- [ ] Test shadow can browse and book
- [ ] Test booking confirmation flow
- [ ] Test calendar blocking works
- [ ] Test completion and feedback flow
- [ ] Test growth events are created correctly

### **Phase 4 Testing**
- [ ] Test analytics queries return correct data
- [ ] Test charts render properly
- [ ] Test date range filtering works
- [ ] Test CSV export downloads correctly
- [ ] Test analytics with large datasets (performance)

### **Phase 5 Testing**
- [ ] Test badge criteria evaluation
- [ ] Test badges are awarded automatically
- [ ] Test nudges are generated correctly
- [ ] Test growth stories feed updates
- [ ] Test notification sending (email, Slack)

---

## 🎛️ **ADMIN DASHBOARD ENHANCEMENTS (Oct 2025)** ✅ **COMPLETE**

### **Admin Dashboard Redesign** ✅
- [x] Created program-based navigation structure ✅
- [x] Built AdminSidebar component with hierarchical menu ✅
- [x] Created AdminLayout with admin/user toggle ✅
- [x] Moved from tabbed interface to sidebar navigation ✅
- [x] Added logout to sidebar ✅
- [x] Added Settings to admin nav ✅

### **Admin Pages Created** ✅
- [x] AdminOverview - Dashboard with program stats ✅
- [x] MentoringCohorts - Cohort management ✅
- [x] MentoringUnassigned - Holding area ✅
- [x] MentoringSessions - Session analytics ✅
- [x] MentoringMessages - Automated messages ✅
- [x] CrossExposureOfferings - View/manage all host offerings ✅
- [x] CrossExposureBookings - View/manage all bookings ✅
- [x] CrossExposureAnalytics - Program metrics and insights ✅
- [x] PeopleProfiles - All participants ✅
- [x] PeopleAnalytics - Growth analytics (placeholder) ✅

### **Cross-Exposure Admin Features** ✅
- [x] View all host offerings with search/filter ✅
- [x] Activate/deactivate offerings ✅
- [x] Delete offerings ✅
- [x] View all bookings with status filter ✅
- [x] Stats dashboard (total, active, inactive) ✅
- [x] Analytics dashboard with:
  - [x] Active hosts and shadows count ✅
  - [x] Total sessions and hours ✅
  - [x] Top skills offered ✅
  - [x] Top departments ✅
  - [x] Most active hosts ✅
  - [x] Participation and completion rates ✅

### **Service Layer Updates** ✅
- [x] Added `getAllHostOfferings()` to crossExposureService ✅
- [x] Added `getAllBookings()` to crossExposureService ✅
- [x] Both functions include proper joins and data flattening ✅

---

## 📊 **PROGRESS TRACKING**

**Current Phase**: Phase 3 Week 9-10 Complete ✅ | Admin Features Added 🎉
**Next Milestone**: Complete Phase 3 Week 11-12 - Booking Management & Completion
**Phase 1 Completed**: 2025-09-30
**Phase 2 Completed**: 2025-09-30
**Phase 3 Week 9-10 Completed**: 2025-10-01
**Admin Dashboard Redesign**: 2025-10-25
**Last Updated**: 2025-10-25

---

## 🎯 **SUCCESS CRITERIA**

### **Phase 1 Complete When:** ✅ **DONE - 2025-09-30**
- ✅ All database tables exist
- ✅ All services implemented and tested
- ✅ UserContext works with new schema
- ✅ Seed data created and loaded
- ✅ Badges initialized
- ✅ All services tested and verified

### **Phase 2 Complete When:**
- ✅ Growth Journey Dashboard functional
- ✅ Skills Portfolio shows data
- ✅ Unified Profile editable
- ✅ Navigation works seamlessly

### **Phase 3 Complete When:**
- ✅ Host can create offerings
- ✅ Shadow can book experiences
- ✅ Bookings complete with feedback
- ✅ Growth events created automatically

### **Phase 4 Complete When:**
- ✅ Analytics dashboard shows all metrics
- ✅ Charts render correctly
- ✅ Export to CSV works
- ✅ Admins can see cross-program insights

### **Phase 5 Complete When:**
- ✅ Badges auto-awarded
- ✅ Nudges displayed and actionable
- ✅ Growth stories feed live
- ✅ Notifications working (email + Slack)

---

## 📝 **NOTES & DECISIONS**

- **Clean slate approach**: Since minimal test data exists, we're dropping old tables and creating fresh schema
- **No migration scripts needed**: Starting fresh means no complex data migrations
- **Cross-exposure is marketplace**: Open self-service booking with admin visibility, not cohort-based
- **Mentoring stays cohort-based**: Existing mentoring structure remains (admin creates cohorts, runs matching)
- **Growth events are universal**: All milestones (mentoring, cross-exposure, badges) are growth_events
- **Skills tracked automatically**: Growth events auto-update skill progression

---

**Ready to begin Phase 1! 🚀**