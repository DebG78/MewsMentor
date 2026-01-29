import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { GrowthSidebar } from '@/components/growth/GrowthSidebar'
import { GrowthTimeline } from '@/components/growth/GrowthTimeline'
import { UserProfileSummaryCard } from '@/components/growth/UserProfileSummaryCard'
import { ProgramsQuickAccessCard } from '@/components/growth/ProgramsQuickAccessCard'
import { SkillsProgressWidget } from '@/components/growth/SkillsProgressWidget'
import { BadgesShowcase } from '@/components/growth/BadgesShowcase'
import { getUserProgramParticipation } from '@/lib/userProfileService'
import { getGrowthTimeline } from '@/lib/growthEventsService'
import { getUserSkillsProgress } from '@/lib/skillsService'
import { getUserBadges } from '@/lib/badgeService'
import { supabase } from '@/lib/supabase'
import { startOfMonth } from 'date-fns'

export default function GrowthJourneyHome() {
  const { userProfile: oldUserProfile, isAuthenticated } = useUser()
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [stats, setStats] = useState({
    eventsThisMonth: 0,
    skillsDeveloping: 0,
    badgesEarned: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [oldUserProfile])

  async function loadDashboardData() {
    if (!isAuthenticated || !oldUserProfile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      console.log('Looking up user with legacy_user_id:', oldUserProfile.id)

      // Get user from new system by legacy_user_id
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('legacy_user_id', oldUserProfile.id)
        .single()

      if (error || !profile) {
        console.error('User not found in new system:', error)
        console.log('Please run the SQL migration to map your user ID')
        setLoading(false)
        return
      }

      console.log('Found user profile:', profile)
      setUserProfile(profile)

      // Get program participation
      const userPrograms = await getUserProgramParticipation(profile.id)
      setPrograms(userPrograms)

      // Get growth timeline
      const timeline = await getGrowthTimeline(profile.id)
      setEvents(timeline)

      // Get skills progress
      const userSkills = await getUserSkillsProgress(profile.id)
      setSkills(userSkills)

      // Get badges
      const userBadges = await getUserBadges(profile.id)
      setBadges(userBadges)

      // Calculate stats
      const thisMonth = startOfMonth(new Date())
      const eventsThisMonth = timeline.filter(
        (e: any) => new Date(e.event_date) >= thisMonth
      ).length

      setStats({
        eventsThisMonth,
        skillsDeveloping: userSkills.length,
        badgesEarned: userBadges.length,
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Welcome to SkillPoint!</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find your profile in the new system yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your administrator or complete your profile setup.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Navigation Sidebar */}
      <GrowthSidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Growth Journey</h1>
            <p className="text-muted-foreground">Track your learning and development</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Profile & Programs */}
            <div className="lg:col-span-1 space-y-6">
              <UserProfileSummaryCard userProfile={userProfile} stats={stats} />
              <ProgramsQuickAccessCard programs={programs} />
            </div>

            {/* Center - Timeline */}
            <div className="lg:col-span-2">
              <GrowthTimeline events={events} isLoading={loading} />
            </div>

            {/* Right Sidebar - Skills & Badges */}
            <div className="lg:col-span-1 space-y-6">
              <SkillsProgressWidget skills={skills} />
              <BadgesShowcase badges={badges} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}