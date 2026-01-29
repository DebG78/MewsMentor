import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users } from 'lucide-react'

interface UserProfileSummaryCardProps {
  userProfile: {
    full_name: string
    role_title?: string
    department?: string
    location_timezone?: string
    profile_image_url?: string
    email: string
  }
  stats?: {
    eventsThisMonth: number
    skillsDeveloping: number
    badgesEarned: number
  }
}

export function UserProfileSummaryCard({ userProfile, stats }: UserProfileSummaryCardProps) {
  const initials = userProfile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={userProfile.profile_image_url} alt={userProfile.full_name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{userProfile.full_name}</h3>
            {userProfile.role_title && (
              <p className="text-sm text-muted-foreground">{userProfile.role_title}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {userProfile.department && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{userProfile.department}</span>
            </div>
          )}
          {userProfile.location_timezone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{userProfile.location_timezone}</span>
            </div>
          )}
        </div>

        {stats && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium text-sm">This Month</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{stats.eventsThisMonth}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{stats.skillsDeveloping}</div>
                <div className="text-xs text-muted-foreground">Skills</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{stats.badgesEarned}</div>
                <div className="text-xs text-muted-foreground">Badges</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}