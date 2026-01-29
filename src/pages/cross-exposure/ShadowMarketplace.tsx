import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'
import { GrowthSidebar } from '@/components/growth/GrowthSidebar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { Search, Filter, Package } from 'lucide-react'
import { OfferingCard } from '@/components/cross-exposure/OfferingCard'

interface HostOffering {
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

export default function ShadowMarketplace() {
  const navigate = useNavigate()
  const { isAuthenticated } = useUser()
  const [loading, setLoading] = useState(true)
  const [offerings, setOfferings] = useState<HostOffering[]>([])
  const [filteredOfferings, setFilteredOfferings] = useState<HostOffering[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => {
    loadOfferings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [offerings, searchQuery, departmentFilter, skillFilter])

  const loadOfferings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('host_offerings')
        .select(`
          id,
          title,
          description,
          skills_offered,
          max_concurrent_shadows,
          slots_per_week,
          host:user_profiles!host_offerings_host_user_id_fkey (
            full_name,
            role_title,
            department
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      const offeringsData = (data as any) || []
      setOfferings(offeringsData)

      // Extract unique departments and skills for filters
      const depts = new Set<string>()
      const skillsSet = new Set<string>()

      offeringsData.forEach((offering: HostOffering) => {
        if (offering.host.department) {
          depts.add(offering.host.department)
        }
        offering.skills_offered.forEach(skill => skillsSet.add(skill))
      })

      setDepartments(Array.from(depts).sort())
      setSkills(Array.from(skillsSet).sort())
    } catch (error) {
      console.error('Error loading offerings:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...offerings]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        offering =>
          offering.title.toLowerCase().includes(query) ||
          offering.description.toLowerCase().includes(query) ||
          offering.host.full_name.toLowerCase().includes(query) ||
          offering.skills_offered.some(skill => skill.toLowerCase().includes(query))
      )
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(offering => offering.host.department === departmentFilter)
    }

    // Skill filter
    if (skillFilter !== 'all') {
      filtered = filtered.filter(offering => offering.skills_offered.includes(skillFilter))
    }

    setFilteredOfferings(filtered)
  }

  const handleViewDetails = (offeringId: string) => {
    navigate(`/cross-exposure/offering/${offeringId}`)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view the shadow marketplace</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <GrowthSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Shadow Marketplace</h1>
            <p className="text-muted-foreground">
              Browse shadowing opportunities and learn from colleagues across the organization
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search offerings, skills, or hosts..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Department Filter */}
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Skill Filter */}
                <Select value={skillFilter} onValueChange={setSkillFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Skills" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Skills</SelectItem>
                    {skills.map(skill => (
                      <SelectItem key={skill} value={skill}>
                        {skill}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters Display */}
              {(searchQuery || departmentFilter !== 'all' || skillFilter !== 'all') && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchQuery && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="h-7"
                    >
                      Search: "{searchQuery}" ×
                    </Button>
                  )}
                  {departmentFilter !== 'all' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDepartmentFilter('all')}
                      className="h-7"
                    >
                      {departmentFilter} ×
                    </Button>
                  )}
                  {skillFilter !== 'all' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSkillFilter('all')}
                      className="h-7"
                    >
                      {skillFilter} ×
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setDepartmentFilter('all')
                      setSkillFilter('all')
                    }}
                    className="h-7 ml-auto"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredOfferings.length} offering{filteredOfferings.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Offerings Grid */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading offerings...</div>
          ) : filteredOfferings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">No offerings found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {offerings.length === 0
                    ? 'No active host offerings are available at the moment.'
                    : 'Try adjusting your filters to see more results.'}
                </p>
                {(searchQuery || departmentFilter !== 'all' || skillFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setDepartmentFilter('all')
                      setSkillFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOfferings.map(offering => (
                <OfferingCard key={offering.id} offering={offering} onViewDetails={handleViewDetails} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
