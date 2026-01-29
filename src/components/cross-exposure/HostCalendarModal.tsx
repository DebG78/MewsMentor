import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Clock, User, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface Booking {
  id: string
  start_datetime: string
  duration_minutes: number
  status: string
  learning_goals: string
  shadow: {
    full_name: string
    role_title: string
  }
}

interface HostCalendarModalProps {
  offeringId: string | null
  offeringTitle: string
  isOpen: boolean
  onClose: () => void
}

export function HostCalendarModal({
  offeringId,
  offeringTitle,
  isOpen,
  onClose,
}: HostCalendarModalProps) {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && offeringId) {
      loadBookings()
    }
  }, [isOpen, offeringId])

  const loadBookings = async () => {
    if (!offeringId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
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
          )
        `)
        .eq('host_offering_id', offeringId)
        .order('start_datetime', { ascending: true })

      if (error) throw error

      setBookings(data as any)
    } catch (error) {
      console.error('Error loading bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('shadow_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      toast({
        title: 'Booking Cancelled',
        description: 'The booking has been cancelled',
      })
      loadBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      })
    }
  }

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.start_datetime) > new Date()
  )
  const pastBookings = bookings.filter(
    b => b.status === 'completed' || new Date(b.start_datetime) <= new Date()
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Calendar: {offeringTitle}</DialogTitle>
          <DialogDescription>View and manage your bookings</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Upcoming Bookings ({upcomingBookings.length})
                </h3>
                {upcomingBookings.map(booking => (
                  <Card key={booking.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <p className="font-medium">{booking.shadow.full_name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {booking.shadow.role_title}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              <span>
                                {new Date(booking.start_datetime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(booking.start_datetime).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <span>({booking.duration_minutes} min)</span>
                          </div>
                        </div>
                        <Badge>{booking.status}</Badge>
                      </div>

                      {booking.learning_goals && (
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-1">Learning Goals:</p>
                          <p className="text-sm">{booking.learning_goals}</p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Booking
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Past Bookings ({pastBookings.length})
                </h3>
                {pastBookings.map(booking => (
                  <Card key={booking.id} className="opacity-60">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <p className="font-medium">{booking.shadow.full_name}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              <span>
                                {new Date(booking.start_datetime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">{booking.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
