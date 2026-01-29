import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  BookOpen,
  User,
  Users,
  Eye,
  Target,
  Award,
} from 'lucide-react'

const navItems = [
  {
    title: 'Growth Journey',
    href: '/growth',
    icon: TrendingUp,
    description: 'Your learning timeline',
  },
  {
    title: 'Skills Portfolio',
    href: '/skills-portfolio',
    icon: BookOpen,
    description: 'Track your skills',
  },
  {
    title: 'Programs',
    href: '/programs',
    icon: Users,
    description: 'Your programs',
    children: [
      {
        title: 'Mentoring',
        href: '/programs/mentoring',
        icon: Target,
      },
      {
        title: 'Cross-Exposure',
        href: '/programs/cross-exposure',
        icon: Eye,
      },
    ],
  },
  {
    title: 'Badges',
    href: '/badges',
    icon: Award,
    description: 'Your achievements',
  },
]

export function GrowthSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="w-64 border-r bg-card/50 min-h-screen p-4 space-y-2">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-1">Your Growth</h2>
        <p className="text-sm text-muted-foreground">Track your development</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          const hasChildren = item.children && item.children.length > 0

          return (
            <div key={item.href}>
              {hasChildren ? (
                <div
                  className={cn(
                    'w-full justify-start px-4 py-2 flex items-center text-sm font-medium text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span>{item.title}</span>
                </div>
              ) : (
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => navigate(item.href)}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span>{item.title}</span>
                </Button>
              )}

              {item.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = location.pathname === child.href

                    return (
                      <Button
                        key={child.href}
                        variant={isChildActive ? 'secondary' : 'ghost'}
                        size="sm"
                        className={cn(
                          'w-full justify-start',
                          isChildActive && 'bg-primary/10 text-primary'
                        )}
                        onClick={() => navigate(child.href)}
                      >
                        <ChildIcon className="w-3 h-3 mr-2" />
                        <span className="text-sm">{child.title}</span>
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}