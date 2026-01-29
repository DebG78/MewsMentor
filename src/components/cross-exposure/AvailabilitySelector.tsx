import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Clock } from 'lucide-react'

interface TimeSlot {
  id: string
  day: string
  startTime: string
  endTime: string
}

interface AvailabilitySelectorProps {
  value: TimeSlot[]
  onChange: (slots: TimeSlot[]) => void
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return [`${hour}:00`, `${hour}:30`]
}).flat()

export function AvailabilitySelector({ value, onChange }: AvailabilitySelectorProps) {
  const [selectedDay, setSelectedDay] = useState<string>('Monday')
  const [startTime, setStartTime] = useState<string>('09:00')
  const [endTime, setEndTime] = useState<string>('10:00')

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: `${Date.now()}-${Math.random()}`,
      day: selectedDay,
      startTime,
      endTime,
    }

    // Validate that end time is after start time
    if (startTime >= endTime) {
      alert('End time must be after start time')
      return
    }

    onChange([...value, newSlot])
  }

  const removeTimeSlot = (id: string) => {
    onChange(value.filter(slot => slot.id !== id))
  }

  const getSlotsByDay = (day: string) => {
    return value.filter(slot => slot.day === day)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Weekly Availability
        </CardTitle>
        <CardDescription>
          Set your recurring weekly schedule for when shadows can book time with you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Time Slot Form */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Add Time Slot</h4>
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map(day => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue placeholder="Start time" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_OPTIONS.map(time => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger>
                <SelectValue placeholder="End time" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_OPTIONS.map(time => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={addTimeSlot} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Weekly Schedule Preview */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Weekly Schedule</h4>
          {value.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
              No availability set. Add time slots above.
            </p>
          ) : (
            <div className="space-y-2">
              {DAYS_OF_WEEK.map(day => {
                const slots = getSlotsByDay(day)
                if (slots.length === 0) return null

                return (
                  <div key={day} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <p className="font-medium">{day}</p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map(slot => (
                            <Badge key={slot.id} variant="secondary" className="gap-2">
                              {slot.startTime} - {slot.endTime}
                              <button
                                onClick={() => removeTimeSlot(slot.id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        {value.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{value.length}</span> time slot
              {value.length !== 1 ? 's' : ''} per week
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
