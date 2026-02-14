import { useLocation } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const routeLabels: Record<string, string> = {
  admin: 'Home',
  mentoring: 'Mentoring Program',
  analytics: 'Analytics',
  people: 'People',
  cohorts: 'Cohorts',
  cohort: 'Cohort Detail',
  unassigned: 'Unassigned',
  sessions: 'Sessions',
  'matching-models': 'Matching Models',
  runbook: 'Runbook',
  metrics: 'Success Metrics',
  vip: 'VIP Management',
  compare: 'Cohort Comparison',
  'match-quality': 'Match Quality',
  profiles: 'All Profiles',
  settings: 'Settings',
}

export function AdminBreadcrumb() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  // Build breadcrumb items, skipping 'admin' as root
  const crumbs: { label: string; href?: string }[] = []

  // Skip segments that are dynamic IDs (UUIDs or purely numeric)
  const isIdSegment = (s: string) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s)

  let currentPath = ''
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    currentPath += `/${segment}`

    if (segment === 'admin') continue
    if (isIdSegment(segment)) continue

    // Skip 'people' when followed by 'analytics' (it's under Analytics group)
    if (segment === 'people' && pathSegments[i + 1] === 'analytics') continue

    const label = routeLabels[segment] || segment

    crumbs.push({
      label,
      href: currentPath,
    })
  }

  if (crumbs.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1

          return (
            <BreadcrumbItem key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
