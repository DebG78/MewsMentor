import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Target,
  Users,
  Clock,
  Calendar,
  BarChart3,
  UserCog,
  ChevronRight,
  ChevronDown,
  LogOut,
  Settings,
  Settings2,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
  Gauge,
  Crown,
  GraduationCap,
  Moon,
  Sun,
  GitCompareArrows,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/contexts/ThemeContext'

const navItems = [
  {
    title: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Mentoring Program',
    icon: Target,
    children: [
      {
        title: 'Cohorts',
        href: '/admin/mentoring/cohorts',
        icon: Users,
      },
      {
        title: 'Matching Models',
        href: '/admin/mentoring/matching-models',
        icon: Settings2,
      },
      {
        title: 'Unassigned',
        href: '/admin/mentoring/unassigned',
        icon: Clock,
      },
      {
        title: 'Sessions',
        href: '/admin/mentoring/sessions',
        icon: Calendar,
      },
      {
        title: 'Check-ins',
        href: '/admin/mentoring/check-ins',
        icon: ClipboardCheck,
      },
      {
        title: 'Runbook',
        href: '/admin/mentoring/runbook',
        icon: BookOpen,
      },
    ],
  },
  {
    title: 'Analytics',
    icon: TrendingUp,
    children: [
      {
        title: 'Success Metrics',
        href: '/admin/analytics/metrics',
        icon: Gauge,
      },
      {
        title: 'VIP Management',
        href: '/admin/analytics/vip',
        icon: Crown,
      },
      {
        title: 'People Analytics',
        href: '/admin/people/analytics',
        icon: BarChart3,
      },
      {
        title: 'Cohort Comparison',
        href: '/admin/analytics/compare',
        icon: GitCompareArrows,
      },
      {
        title: 'Match Quality',
        href: '/admin/analytics/match-quality',
        icon: Sparkles,
      },
    ],
  },
  {
    title: 'People',
    icon: UserCog,
    children: [
      {
        title: 'All Profiles',
        href: '/admin/people/profiles',
        icon: Users,
      },
    ],
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useUser()
  const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const handleLogout = () => {
    logout()
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    })
    navigate('/')
  }

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return location.pathname === href
  }

  const isParentActive = (children?: Array<{ href: string }>) => {
    if (!children) return false
    return children.some(child => location.pathname === child.href)
  }

  return (
    <div className="w-64 border-r bg-card/50 min-h-screen pt-11 px-4 pb-4 flex flex-col">
      <div className="mb-6 border-l-4 border-primary pl-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">MewsMentor</h2>
        </div>
        <p className="text-xs text-muted-foreground">Admin</p>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedSections.includes(item.title)
          const parentActive = isParentActive(item.children)

          return (
            <div key={item.title}>
              {hasChildren ? (
                <div>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-between',
                      parentActive && 'bg-primary/10 text-primary'
                    )}
                    onClick={() => toggleSection(item.title)}
                  >
                    <div className="flex items-center">
                      <Icon className="w-4 h-4 mr-3" />
                      <span>{item.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>

                  {isExpanded && item.children && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const childActive = isActive(child.href)

                        return (
                          <Button
                            key={child.href}
                            variant={childActive ? 'secondary' : 'ghost'}
                            size="sm"
                            className={cn(
                              'w-full justify-start',
                              childActive && 'bg-primary/10 text-primary'
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
              ) : (
                <Button
                  variant={isActive(item.href) ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive(item.href) && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => item.href && navigate(item.href)}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span>{item.title}</span>
                </Button>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto pt-4">
        <Separator className="mb-4" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 mr-3" />
          ) : (
            <Sun className="w-4 h-4 mr-3" />
          )}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  )
}
