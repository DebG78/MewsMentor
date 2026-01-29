import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Search, Calendar, User, Users, Plus, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { HostOfferingCard } from '@/components/cross-exposure/HostOfferingCard'
import { HostCalendarModal } from '@/components/cross-exposure/HostCalendarModal'

interface HostOffering {
  id: string
  title: string
  description: string
  skills_offered: string[]
  max_concurrent_shadows: number
  slots_per_week: number
  is_active: boolean
  host: {
    full_name: string
    role_title: string
    department: string
  }
}

interface Booking {
  id: string
  start_datetime: string
  duration_minutes: number
  status: string
  learning_goals: string
  host?: {
    full_name: string
    role_title: string
  }
  shadow?: {
    full_name: string
    role_title: string
  }
  host_offering: {
    title: string
  }
}

export default function CrossExposureProgramPage() {
  const { userProfile, isAuthenticated } = useUser()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [newUserProfile, setNewUserProfile] = useState<any>(null)
  const [hostOfferings, setHostOfferings] = useState<HostOffering[]>([])
  const [myOfferings, setMyOfferings] = useState<HostOffering[]>([])
  const [shadowBookings, setShadowBookings] = useState<Booking[]>([])
  const [hostBookings, setHostBookings] = useState<Booking[]>([])
  const [activeTab, setActiveTab] = useState('browse')
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null)
  const [selectedOfferingTitle, setSelectedOfferingTitle] = useState('')
  const [showCalendarModal, setShowCalendarModal] = useState(false)

  useEffect(() => {
    loadCrossExposureData()
  }, [userProfile])

  async function loadCrossExposureData() {
    if (!isAuthenticated || !userProfile?.id) {
      setLoading(false)
      return
    }

    try {
      // Get user's new user_profile id
      const { data: newProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('legacy_user_id', userProfile.id)
        .single()

      if (!newProfile) {
        setLoading(false)
        return
      }

      setNewUserProfile(newProfile)

      // Load all active host offerings
      const { data: offerings } = await supabase
        .from('host_offerings')
        .select(`
          id,
          title,
          description,
          skills_offered,
          max_concurrent_shadows,
          slots_per_week,
          is_active,
          host:user_profiles!host_offerings_host_user_id_fkey (
            full_name,
            role_title,
            department
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (offerings) {
        setHostOfferings(offerings as any)
      }

      // Load my offerings (if I'm a host)
      const { data: myOfferingsData } = await supabase
        .from('host_offerings')
        .select(`
          id,
          title,
          description,
          skills_offered,
          max_concurrent_shadows,
          slots_per_week,
          is_active,
          host:user_profiles!host_offerings_host_user_id_fkey (
            full_name,
            role_title,
            department
          )
        `)
        .eq('host_user_id', newProfile.id)
        .order('created_at', { ascending: false })

      if (myOfferingsData) {
        setMyOfferings(myOfferingsData as any)
      }

      // Load my shadow bookings (where I'm the shadow)
      const { data: shadowBookingsData } = await supabase
        .from('shadow_bookings')
        .select(`
          id,
          start_datetime,
          duration_minutes,
          status,
          learning_goals,
          host:user_profiles!shadow_bookings_host_user_id_fkey (
            full_name,
            role_title
          ),
          host_offering:host_offerings (
            title
          )
        `)
        .eq('shadow_user_id', newProfile.id)
        .order('start_datetime', { ascending: false })
        .limit(10)

      if (shadowBookingsData) {
        setShadowBookings(shadowBookingsData as any)
      }

      // Load my host bookings (where I'm the host)
      const { data: hostBookingsData } = await supabase
        .from('shadow_bookings')
        .select(`
          id,
          start_datetime,
          duration_minutes,
          status,
          learning_goals,
          shadow:user_profiles!shadow_bookings_shadow_user_id_fkey (
            full_name,
            role_title
          ),
          host_offering:host_offerings (
            title
          )
        `)
        .eq('host_user_id', newProfile.id)
        .order('start_datetime', { ascending: false })
        .limit(10)

      if (hostBookingsData) {
        setHostBookings(hostBookingsData as any)
      }
    } catch (error) {
      console.error('Error loading cross-exposure data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view cross-exposure program</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading cross-exposure program...</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto p-8">
      <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Cross-Exposure Program</h1>
              <p className="text-muted-foreground">
                Shadow colleagues to learn new skills and perspectives
              </p>
            </div>
            {myOfferings.length > 0 && (
              <Button onClick={() => setActiveTab('host')}>
                <Users className="w-4 h-4 mr-2" />
                Host Dashboard
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse">
                <Search className="w-4 h-4 mr-2" />
                Browse Hosts
              </TabsTrigger>
              <TabsTrigger value="bookings" onClick={() => navigate('/cross-exposure/my-sessions')}>
                <Calendar className="w-4 h-4 mr-2" />
                My Bookings
              </TabsTrigger>
              <TabsTrigger value="host">
                <Users className="w-4 h-4 mr-2" />
                Host Dashboard
              </TabsTrigger>
            </TabsList>

            {/* Browse Hosts Tab */}
            <TabsContent value="browse" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {hostOfferings.length} active offering{hostOfferings.length !== 1 ? 's' : ''} available
                </p>
              </div>

              {hostOfferings.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No active host offerings available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Check back later or become a host yourself!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {hostOfferings.map((offering) => (
                    <Card key={offering.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-lg">{offering.title}</CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4" />
                            <span>{offering.host.full_name}</span>
                          </div>
                          <div className="text-xs mt-1">
                            {offering.host.role_title} • {offering.host.department}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {offering.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {offering.skills_offered.map((skill, idx) => (
                            <Badge key={idx} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{offering.slots_per_week} slots/week</span>
                          <span>Max {offering.max_concurrent_shadows} shadows</span>
                        </div>
                        <Button
                          className="w-full mt-4"
                          size="sm"
                          onClick={() => navigate(`/cross-exposure/offering/${offering.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details & Book
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* My Bookings Tab */}
            <TabsContent value="bookings" className="space-y-4">
              <div className="space-y-6">
                {/* As Shadow */}
                <Card>
                  <CardHeader>
                    <CardTitle>My Shadow Sessions</CardTitle>
                    <CardDescription>Sessions where you are shadowing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shadowBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No shadow bookings yet</p>
                    ) : (
                      <div className="space-y-3">
                        {shadowBookings.map((booking) => (
                          <div key={booking.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{booking.host_offering.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  with {booking.host?.full_name}
                                </p>
                              </div>
                              <Badge variant={
                                booking.status === 'confirmed' ? 'default' :
                                booking.status === 'completed' ? 'secondary' : 'outline'
                              }>
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>
                                {new Date(booking.start_datetime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-xs mt-1">{booking.duration_minutes} minutes</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* As Host */}
                {hostBookings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>My Hosting Sessions</CardTitle>
                      <CardDescription>Sessions where you are the host</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {hostBookings.map((booking) => (
                          <div key={booking.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{booking.host_offering.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  with {booking.shadow?.full_name}
                                </p>
                              </div>
                              <Badge variant={
                                booking.status === 'confirmed' ? 'default' :
                                booking.status === 'completed' ? 'secondary' : 'outline'
                              }>
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>
                                {new Date(booking.start_datetime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-xs mt-1">{booking.duration_minutes} minutes</p>
                            </div>
                            {booking.learning_goals && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                Goals: {booking.learning_goals}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Host Dashboard Tab */}
            <TabsContent value="host" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Manage your host offerings and upcoming sessions
                </p>
                <Button onClick={() => navigate('/cross-exposure/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Offering
                </Button>
              </div>

              {myOfferings.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-2">Become a Host</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Share your expertise by creating a host offering
                    </p>
                    <Button onClick={() => navigate('/cross-exposure/create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Offering
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{myOfferings.length}</p>
                          <p className="text-sm text-muted-foreground">Active Offerings</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{hostBookings.length}</p>
                          <p className="text-sm text-muted-foreground">Total Bookings</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold">
                            {hostBookings.filter(b => b.status === 'confirmed').length}
                          </p>
                          <p className="text-sm text-muted-foreground">Upcoming</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* My Offerings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">My Offerings</h3>
                    {myOfferings.map((offering) => (
                      <HostOfferingCard
                        key={offering.id}
                        offering={offering}
                        onUpdate={loadCrossExposureData}
                        onCalendarClick={(offeringId) => {
                          setSelectedOfferingId(offeringId)
                          setSelectedOfferingTitle(offering.title)
                          setShowCalendarModal(true)
                        }}
                      />
                    ))}
                  </div>

                  {/* Upcoming Host Sessions */}
                  {hostBookings.filter(b => b.status === 'confirmed').length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Upcoming Sessions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {hostBookings
                            .filter(b => b.status === 'confirmed')
                            .map((booking) => (
                              <div key={booking.id} className="p-4 border rounded-lg">
                                <p className="font-medium">{booking.shadow?.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(booking.start_datetime).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <HostCalendarModal
          offeringId={selectedOfferingId}
          offeringTitle={selectedOfferingTitle}
          isOpen={showCalendarModal}
          onClose={() => {
            setShowCalendarModal(false)
            setSelectedOfferingId(null)
            setSelectedOfferingTitle('')
          }}
        />
      </div>
  )
}
