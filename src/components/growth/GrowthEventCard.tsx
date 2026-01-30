import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'

export interface GrowthEvent {
  id: string
  user_id: string
  event_type: string
  title: string
  description?: string
  event_date: string
  skills_developed?: string[]
  reflection?: string
  rating?: number
  related_user?: {
    full_name: string
    role_title: string
  }
  event_data?: Record<string, any>
}

interface GrowthEventCardProps {
  event: GrowthEvent
}

const EVENT_ICONS: Record<string, string> = {
  mentoring_session: '🤝',
  badge_earned: '🏆',
  skill_milestone: '⚡',
  reflection: '💭',
  goal_completed: '🎯',
  program_joined: '🚀',
  program_completed: '🎉',
}

const EVENT_COLORS: Record<string, string> = {
  mentoring_session: 'bg-blue-100 text-blue-800',
  badge_earned: 'bg-yellow-100 text-yellow-800',
  skill_milestone: 'bg-orange-100 text-orange-800',
  reflection: 'bg-gray-100 text-gray-800',
  goal_completed: 'bg-teal-100 text-teal-800',
  program_joined: 'bg-indigo-100 text-indigo-800',
  program_completed: 'bg-pink-100 text-pink-800',
}

export function GrowthEventCard({ event }: GrowthEventCardProps) {
  const [showReflection, setShowReflection] = useState(false)

  const icon = EVENT_ICONS[event.event_type] || '📌'
  const colorClass = EVENT_COLORS[event.event_type] || 'bg-gray-100 text-gray-800'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-3xl mt-1">{icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(event.event_date), 'MMM d, yyyy')}
              </p>
              {event.related_user && (
                <p className="text-sm text-muted-foreground mt-1">
                  with <span className="font-medium">{event.related_user.full_name}</span>
                  {event.related_user.role_title && (
                    <span className="text-xs"> • {event.related_user.role_title}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className={colorClass}>
            {event.event_type.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}

        {event.skills_developed && event.skills_developed.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.skills_developed.map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {event.rating && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-yellow-500">
                {i < event.rating! ? '★' : '☆'}
              </span>
            ))}
          </div>
        )}

        {event.reflection && (
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReflection(!showReflection)}
              className="text-xs -ml-2"
            >
              {showReflection ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {showReflection ? 'Hide' : 'Show'} Reflection
            </Button>
            {showReflection && (
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                {event.reflection}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}