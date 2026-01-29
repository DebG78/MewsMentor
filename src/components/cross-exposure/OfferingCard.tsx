import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Users, Calendar, Eye } from 'lucide-react'

interface OfferingCardProps {
  offering: {
    id: string
    title: string
    description: string
    skills_offered: string[]
    max_concurrent_shadows: number
    slots_per_week: number
    host: {
      full_name: string
      role_title: string
      department: string
    }
  }
  onViewDetails: (offeringId: string) => void
}

export function OfferingCard({ offering, onViewDetails }: OfferingCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
      <CardHeader className="flex-1">
        <CardTitle className="text-lg">{offering.title}</CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <User className="w-4 h-4" />
            <span className="font-medium">{offering.host.full_name}</span>
          </div>
          <div className="text-xs mt-1 space-y-1">
            <p>{offering.host.role_title}</p>
            <p className="text-muted-foreground">{offering.host.department}</p>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">{offering.description}</p>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Skills You'll Learn:</p>
          <div className="flex flex-wrap gap-2">
            {offering.skills_offered.slice(0, 4).map((skill, idx) => (
              <Badge key={idx} variant="secondary">
                {skill}
              </Badge>
            ))}
            {offering.skills_offered.length > 4 && (
              <Badge variant="outline">+{offering.skills_offered.length - 4} more</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{offering.slots_per_week} slots/week</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Max {offering.max_concurrent_shadows} shadows</span>
          </div>
        </div>

        <Button className="w-full" onClick={() => onViewDetails(offering.id)}>
          <Eye className="w-4 h-4 mr-2" />
          View Details & Book
        </Button>
      </CardContent>
    </Card>
  )
}
