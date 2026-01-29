import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GrowthEventCard, GrowthEvent } from './GrowthEventCard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GrowthTimelineProps {
  events: GrowthEvent[]
  isLoading?: boolean
}

type FilterType = 'all' | 'mentoring' | 'cross-exposure' | 'badges' | 'reflections'

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All Events',
  mentoring: 'Mentoring',
  'cross-exposure': 'Cross-Exposure',
  badges: 'Badges',
  reflections: 'Reflections',
}

export function GrowthTimeline({ events, isLoading }: GrowthTimelineProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true
    if (filter === 'mentoring') return event.event_type === 'mentoring_session'
    if (filter === 'cross-exposure')
      return event.event_type.startsWith('cross_exposure')
    if (filter === 'badges') return event.event_type === 'badge_earned'
    if (filter === 'reflections') return event.event_type === 'reflection'
    return true
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Growth Timeline</h2>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mentoring">Mentoring</TabsTrigger>
            <TabsTrigger value="cross-exposure">Cross-Exposure</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="reflections">Reflections</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No events yet</p>
            <p className="text-sm mt-2">
              {filter === 'all'
                ? 'Your growth journey will appear here.'
                : `No ${FILTER_LABELS[filter].toLowerCase()} events yet.`}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <GrowthEventCard key={event.id} event={event} />
          ))
        )}
      </div>

      {filteredEvents.length > 0 && filteredEvents.length >= 10 && (
        <div className="text-center pt-4">
          <Button variant="outline">Load More</Button>
        </div>
      )}
    </div>
  )
}