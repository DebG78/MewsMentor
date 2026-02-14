import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Target,
  Users,
  Clock,
  Calendar,
  BarChart3,
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
  ChevronsUpDown,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const mentoringItems = [
  { title: 'Cohorts', href: '/admin/mentoring/cohorts', icon: Users },
  { title: 'Matching Models', href: '/admin/mentoring/matching-models', icon: Settings2 },
  { title: 'Unassigned', href: '/admin/mentoring/unassigned', icon: Clock },
  { title: 'Sessions', href: '/admin/mentoring/sessions', icon: Calendar },
  { title: 'Runbook', href: '/admin/mentoring/runbook', icon: BookOpen },
]

const analyticsItems = [
  { title: 'Success Metrics', href: '/admin/analytics/metrics', icon: Gauge },
  { title: 'VIP Management', href: '/admin/analytics/vip', icon: Crown },
  { title: 'People Analytics', href: '/admin/people/analytics', icon: BarChart3 },
  { title: 'Cohort Comparison', href: '/admin/analytics/compare', icon: GitCompareArrows },
  { title: 'Match Quality', href: '/admin/analytics/match-quality', icon: Sparkles },
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
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">MewsMentor</span>
                  <span className="truncate text-xs opacity-60">Admin</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <SidebarMenu>
            {/* Home — direct link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/admin')}
                tooltip="Home"
              >
                <Link to="/admin">
                  <LayoutDashboard />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Mentoring Program — collapsible */}
            <Collapsible
              defaultOpen={isGroupActive(mentoringItems)}
              className="group/mentoring"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Mentoring Program">
                    <Target />
                    <span>Mentoring Program</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/mentoring:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {mentoringItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={isActive(item.href)}>
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

            {/* Analytics — collapsible */}
            <Collapsible
              defaultOpen={isGroupActive(analyticsItems)}
              className="group/analytics"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Analytics">
                    <TrendingUp />
                    <span>Analytics</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/analytics:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {analyticsItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton asChild isActive={isActive(item.href)}>
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

            {/* All Profiles — direct link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/admin/people/profiles')}
                tooltip="All Profiles"
              >
                <Link to="/admin/people/profiles">
                  <Users />
                  <span>All Profiles</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Settings — direct link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/admin/settings')}
                tooltip="Settings"
              >
                <Link to="/admin/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Account"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Admin</span>
                    <span className="truncate text-xs opacity-60">Admin</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : (
                    <Sun className="mr-2 h-4 w-4" />
                  )}
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
