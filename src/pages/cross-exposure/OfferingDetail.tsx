import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { GrowthSidebar } from '@/components/growth/GrowthSidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, User, Mail, Briefcase, MapPin, Calendar, Users, Target } from 'lucide-react'
import { BookingCalendar } from '@/components/cross-exposure/BookingCalendar'
import { BookingForm } from '@/components/cross-exposure/BookingForm'

interface HostOffering {
  id: string
  title: string
  description: string
  what_shadow_will_do: string
  skills_offered: string[]
  max_concurrent_shadows: number
  slots_per_week: number
  host: {
    id: string
    full_name: string
    role_title: string
    department: string
    location_timezone: string
  }
}

interface AvailabilityBlock {
  day_of_week: string
  start_time: string
  end_time: string
}

export default function OfferingDetail() {
  const { offeringId } = useParams<{ offeringId: string }>()
  const navigate = useNavigate()
  const { userProfile, isAuthenticated } = useUser()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [offering, setOffering] = useState<HostOffering | null>(null)
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (offeringId) {
      loadOfferingDetails()
    }
  }, [offeringId])

  const loadOfferingDetails = async () => {
    if (!offeringId) return

    setLoading(true)
    try {
      // Load offering
      const { data: offeringData, error: offeringError } = await supabase
        .from('host_offerings')
        .select(`
          id,
          title,
          description,
          what_shadow_will_do,
          skills_offered,
          max_concurrent_shadows,
          slots_per_week,
          host:user_profiles!host_offerings_host_user_id_fkey (
            id,
            full_name,
            role_title,
            department,
            location_timezone
          )
        `)
        .eq('id', offeringId)
        .eq('is_active', true)
        .single()

      if (offeringError) throw offeringError

      setOffering(offeringData as any)

      // Load availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('host_availability_blocks')
        .select('day_of_week, start_time, end_time')
        .eq('host_offering_id', offeringId)

      if (availabilityError) throw availabilityError

      setAvailability(availabilityData || [])
    } catch (error) {
      console.error('Error loading offering:', error)
      toast({
        title: 'Error',
        description: 'Failed to load offering details',
        variant: 'destructive',
      })
      navigate('/cross-exposure/marketplace')
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = async (bookingData: { learningGoals: string; skillsToDevelop: string[] }) => {
    if (!offering || !selectedDate || !selectedTimeSlot || !userProfile?.id) {
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

      // Parse selected time slot
      const [startTime, endTime] = selectedTimeSlot.split(' - ')

      // Create datetime for the booking
      const bookingDateTime = new Date(selectedDate)
      const [hours, minutes] = startTime.split(':')
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

      // Calculate duration
      const [endHours, endMinutes] = endTime.split(':')
      const endDateTime = new Date(selectedDate)
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0)
      const durationMinutes = (endDateTime.getTime() - bookingDateTime.getTime()) / (1000 * 60)

      // Create booking
      const { error: bookingError } = await supabase.from('shadow_bookings').insert({
        host_offering_id: offering.id,
        host_user_id: offering.host.id,
        shadow_user_id: newProfile.id,
        start_datetime: bookingDateTime.toISOString(),
        duration_minutes: durationMinutes,
        status: 'confirmed',
        learning_goals: bookingData.learningGoals,
        skills_to_develop: bookingData.skillsToDevelop,
      })

      if (bookingError) throw bookingError

      toast({
        title: 'Booking Confirmed!',
        description: 'Your shadowing session has been booked successfully',
      })

      navigate('/programs/cross-exposure')
    } catch (error) {
      console.error('Error creating booking:', error)
      toast({
        title: 'Error',
        description: 'Failed to create booking. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view this offering</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <GrowthSidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading offering details...</p>
        </div>
      </div>
    )
  }

  if (!offering) {
    return (
      <div className="flex min-h-screen">
        <GrowthSidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>Offering not found</p>
        </div>
      </div>
    )
  }

  const availableDays = [...new Set(availability.map(a => a.day_of_week))]
  const availableTimeSlots = availability.map(a => ({
    day: a.day_of_week,
    startTime: a.start_time,
    endTime: a.end_time,
  }))

  return (
    <div className="flex min-h-screen">
      <GrowthSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/cross-exposure/marketplace')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{offering.title}</h1>
              <p className="text-muted-foreground">Shadow a colleague to learn new skills</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Offering Details */}
            <div className="space-y-6">
              {/* Host Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Your Host
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{offering.host.full_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{offering.host.role_title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {offering.host.department} • {offering.host.location_timezone}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Offering Description */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{offering.description}</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      What You'll Do
                    </h4>
                    <p className="text-sm text-muted-foreground">{offering.what_shadow_will_do}</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Skills You'll Learn</h4>
                    <div className="flex flex-wrap gap-2">
                      {offering.skills_offered.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Slots Per Week</p>
                      <div className="flex items-center gap-2 font-medium">
                        <Calendar className="w-4 h-4" />
                        <span>{offering.slots_per_week}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Max Shadows</p>
                      <div className="flex items-center gap-2 font-medium">
                        <Users className="w-4 h-4" />
                        <span>{offering.max_concurrent_shadows}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Booking */}
            <div className="space-y-6">
              <BookingCalendar
                availableDays={availableDays}
                availableTimeSlots={availableTimeSlots}
                selectedDate={selectedDate}
                selectedTimeSlot={selectedTimeSlot}
                onDateSelect={setSelectedDate}
                onTimeSlotSelect={setSelectedTimeSlot}
              />

              <BookingForm
                selectedDate={selectedDate}
                selectedTimeSlot={selectedTimeSlot}
                offeringSkills={offering.skills_offered}
                onSubmit={handleBooking}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
