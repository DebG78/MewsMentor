import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { GrowthSidebar } from '@/components/growth/GrowthSidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User, Save, X, MapPin, Languages, Target, Briefcase,
  Calendar, CheckCircle, Clock, AlertTriangle, BookOpen
} from 'lucide-react'

export default function UnifiedProfilePage() {
  const { userProfile: oldUserProfile, isAuthenticated } = useUser()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [skillsCount, setSkillsCount] = useState(0)
  const [eventsCount, setEventsCount] = useState(0)

  const [formData, setFormData] = useState({
    full_name: '',
    role_title: '',
    department: '',
    location_timezone: '',
    bio: '',
    languages: [] as string[],
    experience_years: 0,
    current_skills: [] as string[],
    target_skills: [] as string[],
  })

  useEffect(() => {
    loadProfileData()
  }, [oldUserProfile])

  async function loadProfileData() {
    if (!isAuthenticated || !oldUserProfile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('legacy_user_id', oldUserProfile.id)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }

      setUserProfile(profile)
      setFormData({
        full_name: profile.full_name || '',
        role_title: profile.role_title || '',
        department: profile.department || '',
        location_timezone: profile.location_timezone || '',
        bio: profile.bio || '',
        languages: profile.languages || [],
        experience_years: profile.experience_years || 0,
        current_skills: profile.current_skills || [],
        target_skills: profile.target_skills || [],
      })

      // Get program participation
      const { data: userPrograms } = await supabase
        .from('program_participants')
        .select(`*, cohort:program_cohorts(name, status, start_date, end_date)`)
        .eq('user_id', profile.id)
      setPrograms(userPrograms || [])

      // Get skills count
      const { count: skillsTotal } = await supabase
        .from('user_skill_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      setSkillsCount(skillsTotal || 0)

      // Get events count
      const { count: eventsTotal } = await supabase
        .from('growth_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      setEventsCount(eventsTotal || 0)
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!userProfile) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          role_title: formData.role_title,
          department: formData.department,
          location_timezone: formData.location_timezone,
          bio: formData.bio,
          languages: formData.languages,
          experience_years: formData.experience_years,
          current_skills: formData.current_skills,
          target_skills: formData.target_skills,
        })
        .eq('id', userProfile.id)

      if (error) throw error

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      })

      setIsEditing(false)
      await loadProfileData()
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setIsEditing(false)
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        role_title: userProfile.role_title || '',
        department: userProfile.department || '',
        location_timezone: userProfile.location_timezone || '',
        bio: userProfile.bio || '',
        languages: userProfile.languages || [],
        experience_years: userProfile.experience_years || 0,
        current_skills: userProfile.current_skills || [],
        target_skills: userProfile.target_skills || [],
      })
    }
  }

  function getProfileCompleteness() {
    const requiredFields = ['full_name', 'role_title', 'department', 'location_timezone', 'bio']
    const completed = requiredFields.filter(field => formData[field as keyof typeof formData])
    return Math.round((completed.length / requiredFields.length) * 100)
  }

  const completeness = getProfileCompleteness()
  const daysSinceCreated = userProfile?.created_at
    ? Math.floor((Date.now() - new Date(userProfile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <GrowthSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-64 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="flex min-h-screen">
        <GrowthSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Card>
              <CardContent className="text-center py-12">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Profile not found</h3>
                <p className="text-sm text-muted-foreground">Please contact your administrator</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const initials = formData.full_name.split(' ').map((n) => n[0]).join('').toUpperCase()

  return (
    <div className="flex min-h-screen">
      <GrowthSidebar />

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-5xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Profile</h1>
              <p className="text-muted-foreground">Manage your personal information and preferences</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={completeness === 100 ? 'default' : 'secondary'}>
                {completeness}% Complete
              </Badge>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Completeness Alert */}
          {completeness < 100 && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your profile is {completeness}% complete. Complete missing fields for a better experience.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>Your core profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={userProfile.profile_image_url} alt={formData.full_name} />
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role_title">Role / Title</Label>
                    <Input
                      id="role_title"
                      value={formData.role_title}
                      onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location_timezone">Location / Timezone</Label>
                    <Input
                      id="location_timezone"
                      value={formData.location_timezone}
                      onChange={(e) => setFormData({ ...formData, location_timezone: e.target.value })}
                      disabled={!isEditing}
                      className="mt-1"
                      placeholder="e.g., America/Los_Angeles"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience_years">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Skills & Expertise
                </CardTitle>
                <CardDescription>Your current and target skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current_skills">Current Skills</Label>
                  {isEditing ? (
                    <Textarea
                      id="current_skills"
                      value={formData.current_skills.join(', ')}
                      onChange={(e) => setFormData({
                        ...formData,
                        current_skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      })}
                      className="mt-1"
                      placeholder="Enter skills separated by commas"
                      rows={3}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.current_skills.length > 0 ? (
                        formData.current_skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary">{skill}</Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No skills specified</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="target_skills">Skills to Learn</Label>
                  {isEditing ? (
                    <Textarea
                      id="target_skills"
                      value={formData.target_skills.join(', ')}
                      onChange={(e) => setFormData({
                        ...formData,
                        target_skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      })}
                      className="mt-1"
                      placeholder="Enter skills separated by commas"
                      rows={3}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.target_skills.length > 0 ? (
                        formData.target_skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline">{skill}</Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No target skills specified</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Languages & Communication
                </CardTitle>
                <CardDescription>Languages you speak</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="languages">Languages</Label>
                {isEditing ? (
                  <Input
                    id="languages"
                    value={formData.languages.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      languages: e.target.value.split(',').map(l => l.trim()).filter(l => l)
                    })}
                    className="mt-1"
                    placeholder="Languages you speak (comma separated)"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.languages.length > 0 ? (
                      formData.languages.map((lang, idx) => (
                        <Badge key={idx} variant="outline">{lang}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No languages specified</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  About Me
                </CardTitle>
                <CardDescription>Tell others about yourself</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1 min-h-[120px]"
                  placeholder="Share a bit about yourself, your interests, and goals..."
                />
              </CardContent>
            </Card>

            {/* Profile Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{daysSinceCreated}</p>
                    <p className="text-sm text-muted-foreground">Days since joining</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{completeness}%</p>
                    <p className="text-sm text-muted-foreground">Profile complete</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">{skillsCount}</p>
                    <p className="text-sm text-muted-foreground">Skills tracked</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Target className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold">{eventsCount}</p>
                    <p className="text-sm text-muted-foreground">Growth events</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Program History */}
            <Card>
              <CardHeader>
                <CardTitle>Program History</CardTitle>
                <CardDescription>Your participation in programs (read-only)</CardDescription>
              </CardHeader>
              <CardContent>
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not enrolled in any programs yet</p>
                ) : (
                  <div className="space-y-3">
                    {programs.map((participation: any) => (
                      <div key={participation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{participation.cohort.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {participation.role_in_program}
                            </Badge>
                            <Badge variant={participation.status === 'active' ? 'default' : 'outline'} className="text-xs">
                              {participation.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {participation.cohort.start_date && (
                            <div>Started: {new Date(participation.cohort.start_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}