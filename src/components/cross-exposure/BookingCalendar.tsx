import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeSlot {
  time: string
  available: boolean
}

interface BookingCalendarProps {
  availableDays: string[] // e.g., ['monday', 'wednesday', 'friday']
  availableTimeSlots: { day: string; startTime: string; endTime: string }[]
  selectedDate: Date | null
  selectedTimeSlot: string | null
  onDateSelect: (date: Date) => void
  onTimeSlotSelect: (slot: string) => void
}

export function BookingCalendar({
  availableDays,
  availableTimeSlots,
  selectedDate,
  selectedTimeSlot,
  onDateSelect,
  onTimeSlotSelect,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const fullDaysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const isDateAvailable = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (date < today) return false

    const dayOfWeek = fullDaysOfWeek[date.getDay()]
    return availableDays.includes(dayOfWeek)
  }

  const getTimeSlotsForDate = (date: Date) => {
    if (!date) return []

    const dayOfWeek = fullDaysOfWeek[date.getDay()]
    return availableTimeSlots
      .filter(slot => slot.day === dayOfWeek)
      .map(slot => ({
        time: `${slot.startTime} - ${slot.endTime}`,
        available: true,
      }))
  }

  const days = getDaysInMonth(currentMonth)
  const timeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : []

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Select a Date
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} />
              }

              const isAvailable = isDateAvailable(date)
              const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
              const isToday = date.toDateString() === new Date().toDateString()

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => isAvailable && onDateSelect(date)}
                  disabled={!isAvailable}
                  className={cn(
                    'aspect-square p-2 text-sm rounded-lg transition-colors',
                    isAvailable
                      ? 'hover:bg-accent cursor-pointer'
                      : 'text-muted-foreground/30 cursor-not-allowed',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                    isToday && !isSelected && 'border-2 border-primary'
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-primary" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>Selected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-3">
          <h3 className="font-semibold">Available Time Slots</h3>
          {timeSlots.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                No available time slots for this date
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {timeSlots.map(slot => (
                <Button
                  key={slot.time}
                  variant={selectedTimeSlot === slot.time ? 'default' : 'outline'}
                  onClick={() => onTimeSlotSelect(slot.time)}
                  disabled={!slot.available}
                  className="justify-start"
                >
                  {slot.time}
                  {selectedTimeSlot === slot.time && (
                    <Badge variant="secondary" className="ml-auto">
                      Selected
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
