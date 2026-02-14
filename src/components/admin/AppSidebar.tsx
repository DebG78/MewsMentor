import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Target,
  Users,
  Clock,
  Calendar,
  BarChart3,
  UserCog,
  LogOut,
  Settings,
  Settings2,
  BookOpen,
  TrendingUp,
  Gauge,
  Crown,
  GraduationCap,
  Moon,
  Sun,
  GitCompareArrows,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navGroups = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Mentoring Program',
    icon: Target,
    items: [
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
        title: 'Runbook',
        href: '/admin/mentoring/runbook',
        icon: BookOpen,
      },
    ],
  },
  {
    label: 'Analytics',
    icon: TrendingUp,
    items: [
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
    label: 'People',
    icon: UserCog,
    items: [
      {
        title: 'All Profiles',
        href: '/admin/people/profiles',
        icon: Users,
      },
    ],
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
      },
    ],
  },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useUser()
  const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = () => {
    logout()
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    })
    navigate('/')
  }

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  const isGroupActive = (items: { href: string }[]) => {
    return items.some(item => isActive(item.href))
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MewsMentor</span>
                  <span className="truncate text-xs text-muted-foreground">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          // Single-item groups render directly without collapsible
          if (group.items.length === 1) {
            const item = group.items[0]
            const Icon = item.icon
            return (
              <SidebarGroup key={group.label}>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link to={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            )
          }

          // Multi-item groups use collapsible
          const GroupIcon = group.icon
          return (
            <SidebarGroup key={group.label}>
              <SidebarMenu>
                <Collapsible
                  defaultOpen={isGroupActive(group.items)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={group.label}>
                        <GroupIcon />
                        <span>{group.label}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.items.map((item) => {
                          const Icon = item.icon
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(item.href)}
                              >
                                <Link to={item.href}>
                                  <Icon />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
              {theme === 'light' ? <Moon /> : <Sun />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Account">
                  <UserCog />
                  <span>Account</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width]">
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
