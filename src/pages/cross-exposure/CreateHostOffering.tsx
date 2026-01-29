import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { GrowthSidebar } from '@/components/growth/GrowthSidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { AvailabilitySelector } from '@/components/cross-exposure/AvailabilitySelector'
import { ArrowLeft, Plus, X } from 'lucide-react'

interface TimeSlot {
  id: string
  day: string
  startTime: string
  endTime: string
}

export default function CreateHostOffering() {
  const navigate = useNavigate()
  const { userProfile, isAuthenticated } = useUser()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    whatShadowWillDo: '',
    skillsOffered: [] as string[],
    maxConcurrentShadows: 2,
    slotsPerWeek: 3,
  })

  const [availability, setAvailability] = useState<TimeSlot[]>([])
  const [skillInput, setSkillInput] = useState('')

  const addSkill = () => {
    if (skillInput.trim() && !formData.skillsOffered.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skillsOffered: [...formData.skillsOffered, skillInput.trim()],
      })
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skillsOffered: formData.skillsOffered.filter(s => s !== skill),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated || !userProfile?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a host offering',
        variant: 'destructive',
      })
      return
    }

    if (formData.skillsOffered.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one skill',
        variant: 'destructive',
      })
      return
    }

    if (availability.length === 0) {
      toast({
        title: 'Error',
        description: 'Please set your availability',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Get user's new user_profile id
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('legacy_user_id', userProfile.id)
        .single()

      if (!newProfile) {
        throw new Error('User profile not found')
      }

      // Create host offering
      const { data: offering, error: offeringError } = await supabase
        .from('host_offerings')
        .insert({
          host_user_id: newProfile.id,
          title: formData.title,
          description: formData.description,
          what_shadow_will_do: formData.whatShadowWillDo,
          skills_offered: formData.skillsOffered,
          max_concurrent_shadows: formData.maxConcurrentShadows,
          slots_per_week: formData.slotsPerWeek,
          is_active: true,
        })
        .select()
        .single()

      if (offeringError) throw offeringError

      // Create availability blocks
      const availabilityBlocks = availability.map(slot => ({
        host_offering_id: offering.id,
        day_of_week: slot.day.toLowerCase(),
        start_time: slot.startTime,
        end_time: slot.endTime,
      }))

      const { error: availabilityError } = await supabase
        .from('host_availability_blocks')
        .insert(availabilityBlocks)

      if (availabilityError) throw availabilityError

      toast({
        title: 'Success!',
        description: 'Your host offering has been created',
      })

      navigate('/programs/cross-exposure')
    } catch (error) {
      console.error('Error creating host offering:', error)
      toast({
        title: 'Error',
        description: 'Failed to create host offering. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to create a host offering</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <GrowthSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/programs/cross-exposure')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create Host Offering</h1>
              <p className="text-muted-foreground">
                Share your expertise by offering shadowing opportunities
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Tell shadows what you're offering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Offering Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Shadow a Product Manager"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this shadowing experience is about..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatShadowWillDo">What Shadow Will Do *</Label>
                  <Textarea
                    id="whatShadowWillDo"
                    placeholder="Describe what the shadow will observe and participate in..."
                    value={formData.whatShadowWillDo}
                    onChange={e => setFormData({ ...formData, whatShadowWillDo: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skills Offered *</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                    />
                    <Button type="button" onClick={addSkill}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.skillsOffered.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skillsOffered.map(skill => (
                        <Badge key={skill} variant="secondary" className="gap-2">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Capacity Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Capacity Settings</CardTitle>
                <CardDescription>Set limits on your shadowing capacity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxConcurrent">Max Concurrent Shadows</Label>
                    <Input
                      id="maxConcurrent"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.maxConcurrentShadows}
                      onChange={e =>
                        setFormData({ ...formData, maxConcurrentShadows: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of shadows at the same time
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slotsPerWeek">Slots Per Week</Label>
                    <Input
                      id="slotsPerWeek"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.slotsPerWeek}
                      onChange={e =>
                        setFormData({ ...formData, slotsPerWeek: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum shadowing sessions per week
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <AvailabilitySelector value={availability} onChange={setAvailability} />

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/programs/cross-exposure')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Host Offering'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
