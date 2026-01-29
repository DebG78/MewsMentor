import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { getUserSkillsProgress } from '@/lib/skillsService'
import { getGrowthTimeline } from '@/lib/growthEventsService'
import { BookOpen, TrendingUp, Clock } from 'lucide-react'

const PROFICIENCY_COLORS: Record<string, string> = {
  learning: 'bg-blue-100 text-blue-800',
  practicing: 'bg-yellow-100 text-yellow-800',
  proficient: 'bg-green-100 text-green-800',
  expert: 'bg-purple-100 text-purple-800',
}

const PROFICIENCY_PROGRESS: Record<string, number> = {
  learning: 25,
  practicing: 50,
  proficient: 75,
  expert: 100,
}

export default function SkillsPortfolioPage() {
  const { userProfile: oldUserProfile, isAuthenticated } = useUser()
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState<any[]>([])
  const [skillEvents, setSkillEvents] = useState<any[]>([])

  useEffect(() => {
    loadSkillsData()
  }, [oldUserProfile])

  async function loadSkillsData() {
    if (!isAuthenticated || !oldUserProfile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Get user from new system
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('legacy_user_id', oldUserProfile.id)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }

      // Get skills progress
      const userSkills = await getUserSkillsProgress(profile.id)
      setSkills(userSkills)

      // Get all growth events with skills
      const timeline = await getGrowthTimeline(profile.id)
      const eventsWithSkills = timeline.filter((e: any) => e.skills_developed && e.skills_developed.length > 0)
      setSkillEvents(eventsWithSkills)
    } catch (error) {
      console.error('Error loading skills data:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupedByProficiency = {
    expert: skills.filter(s => s.proficiency_level === 'expert'),
    proficient: skills.filter(s => s.proficiency_level === 'proficient'),
    practicing: skills.filter(s => s.proficiency_level === 'practicing'),
    learning: skills.filter(s => s.proficiency_level === 'learning'),
  }

  if (loading) {
    return (
      <div className="overflow-auto">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Skills Portfolio</h1>
            <p className="text-muted-foreground">Track your skill development journey</p>
          </div>

          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Current Skills
              </TabsTrigger>
              <TabsTrigger value="development" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                In Development
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Current Skills Tab */}
            <TabsContent value="current" className="space-y-6 mt-6">
              {Object.entries(groupedByProficiency).map(([level, skillsList]) => {
                if (skillsList.length === 0) return null

                return (
                  <Card key={level}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className={PROFICIENCY_COLORS[level]}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Badge>
                        <span className="text-lg">({skillsList.length} skills)</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {skillsList.map((skill: any) => (
                          <div key={skill.id} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{skill.skill.name}</h3>
                              <span className="text-sm text-muted-foreground">
                                {skill.evidence_count} evidence
                              </span>
                            </div>
                            <Progress value={PROFICIENCY_PROGRESS[skill.proficiency_level]} className="h-2" />
                            {skill.skill.category && (
                              <Badge variant="outline" className="text-xs">
                                {skill.skill.category}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {skills.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No skills tracked yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Skills will appear here as you log growth events
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* In Development Tab */}
            <TabsContent value="development" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Currently Developing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {skills
                      .filter(s => s.proficiency_level === 'learning' || s.proficiency_level === 'practicing')
                      .map((skill: any) => (
                        <div key={skill.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{skill.skill.name}</h3>
                              <Badge className={`${PROFICIENCY_COLORS[skill.proficiency_level]} mt-1`}>
                                {skill.proficiency_level}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{skill.evidence_count}</div>
                              <div className="text-xs text-muted-foreground">evidence points</div>
                            </div>
                          </div>
                          <Progress value={PROFICIENCY_PROGRESS[skill.proficiency_level]} className="h-2" />
                          <div className="text-sm text-muted-foreground">
                            {skill.proficiency_level === 'learning' && '2 more evidence to reach Practicing'}
                            {skill.proficiency_level === 'practicing' && '5 total evidence to reach Proficient'}
                          </div>
                        </div>
                      ))}

                    {skills.filter(s => s.proficiency_level === 'learning' || s.proficiency_level === 'practicing').length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4" />
                        <p>No skills currently in development</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skill Development Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {skillEvents.map((event: any) => (
                      <div key={event.id} className="p-4 border-l-4 border-primary pl-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{event.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.event_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          {event.rating && (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className="text-yellow-500 text-sm">
                                  {i < event.rating ? '★' : '☆'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {event.skills_developed.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                        )}
                      </div>
                    ))}

                    {skillEvents.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4" />
                        <p>No skill development events yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
  )
}