import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'

interface UserBadge {
  id: string
  earned_at: string
  badge: {
    name: string
    description: string
    icon: string
    badge_type: string
  }
}

interface BadgesShowcaseProps {
  badges: UserBadge[]
}

export function BadgesShowcase({ badges }: BadgesShowcaseProps) {
  if (badges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-sm">No badges earned yet.</p>
            <p className="text-xs mt-1">Keep participating to unlock achievements!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Badges ({badges.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-4 gap-4">
            {badges.map((userBadge) => (
              <Tooltip key={userBadge.id}>
                <TooltipTrigger>
                  <div className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="text-4xl">{userBadge.badge.icon}</div>
                    <span className="text-xs font-medium text-center line-clamp-2">
                      {userBadge.badge.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{userBadge.badge.name}</p>
                    <p className="text-xs text-muted-foreground">{userBadge.badge.description}</p>
                    <p className="text-xs text-muted-foreground pt-1 border-t">
                      Earned {format(new Date(userBadge.earned_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}