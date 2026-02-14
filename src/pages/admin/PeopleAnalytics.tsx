import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Users,
  BookOpen,
  Target,
  Filter,
  X,
  Building,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { getAllCohorts } from '@/lib/supabaseService';
import type { Cohort } from '@/types/mentoring';
import {
  getTopicDemandSupply,
  getExperienceDistribution,
  getLifeExperienceDistribution,
  getMentorUtilization,
  getMatchScoreDistribution,
  getFeatureContributions,
  getCohortMatchQualities,
  getPopulationStats,
} from '@/lib/peopleAnalyticsService';
import { PageHeader } from "@/components/admin/PageHeader";

const topicChartConfig = {
  demand: { label: 'Mentee Demand', color: 'hsl(221, 83%, 53%)' },
  supply: { label: 'Mentor Supply', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig;

const experienceChartConfig = {
  mentees: { label: 'Mentees', color: 'hsl(221, 83%, 53%)' },
  mentors: { label: 'Mentors', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig;

const lifeExpChartConfig = {
  mentees: { label: 'Mentees', color: 'hsl(221, 83%, 53%)' },
  mentors: { label: 'Mentors', color: 'hsl(280, 67%, 55%)' },
} satisfies ChartConfig;

const matchScoreChartConfig = {
  count: { label: 'Matches', color: 'hsl(221, 83%, 53%)' },
} satisfies ChartConfig;

const featureChartConfig = {
  avgValue: { label: 'Avg Score (%)', color: 'hsl(45, 93%, 47%)' },
} satisfies ChartConfig;

const cohortQualityConfig = {
  avgScore: { label: 'Avg Match Score', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig;

const utilizationChartConfig = {
  assigned: { label: 'Assigned', color: 'hsl(221, 83%, 53%)' },
  remaining: { label: 'Remaining', color: 'hsl(0, 0%, 80%)' },
} satisfies ChartConfig;

const orgChartConfig = {
  mentees: { label: 'Mentees', color: 'hsl(221, 83%, 53%)' },
  mentors: { label: 'Mentors', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig;

export default function PeopleAnalytics() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCohortForMatch, setSelectedCohortForMatch] = useState<string>('');

  // Demographic filters
  const [deptFilter, setDeptFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data);
      const withMatches = data.find(c => c.matches?.results && c.matches.results.length > 0);
      if (withMatches) setSelectedCohortForMatch(withMatches.id);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Unique filter options from all cohorts
  const filterOptions = useMemo(() => {
    const depts = new Set<string>();
    const grades = new Set<string>();
    const locs = new Set<string>();
    cohorts.forEach(c => {
      [...c.mentees, ...c.mentors].forEach(p => {
        if (p.department) depts.add(p.department);
        if (p.job_grade) grades.add(p.job_grade);
        if (p.location_timezone) locs.add(p.location_timezone);
      });
    });
    return {
      departments: [...depts].sort(),
      grades: [...grades].sort(),
      locations: [...locs].sort(),
    };
  }, [cohorts]);

  const activeFilterCount = [deptFilter, gradeFilter, locationFilter].filter(Boolean).length;

  // Apply demographic filters to create filtered cohort views
  const filteredCohorts = useMemo(() => {
    if (!deptFilter && !gradeFilter && !locationFilter) return cohorts;
    return cohorts.map(c => ({
      ...c,
      mentees: c.mentees.filter(m =>
        (!deptFilter || m.department === deptFilter) &&
        (!gradeFilter || m.job_grade === gradeFilter) &&
        (!locationFilter || m.location_timezone === locationFilter)
      ),
      mentors: c.mentors.filter(m =>
        (!deptFilter || m.department === deptFilter) &&
        (!gradeFilter || m.job_grade === gradeFilter) &&
        (!locationFilter || m.location_timezone === locationFilter)
      ),
    }));
  }, [cohorts, deptFilter, gradeFilter, locationFilter]);

  // Organisation distribution data (always uses unfiltered cohorts)
  const orgData = useMemo(() => {
    const deptMap = new Map<string, { department: string; mentees: number; mentors: number }>();
    const gradeMap = new Map<string, { grade: string; mentees: number; mentors: number }>();
    const locMap = new Map<string, { location: string; mentees: number; mentors: number }>();

    cohorts.forEach(c => {
      c.mentees.forEach(m => {
        if (m.department) {
          const e = deptMap.get(m.department) || { department: m.department, mentees: 0, mentors: 0 };
          e.mentees++;
          deptMap.set(m.department, e);
        }
        if (m.job_grade) {
          const e = gradeMap.get(m.job_grade) || { grade: m.job_grade, mentees: 0, mentors: 0 };
          e.mentees++;
          gradeMap.set(m.job_grade, e);
        }
        if (m.location_timezone) {
          const e = locMap.get(m.location_timezone) || { location: m.location_timezone, mentees: 0, mentors: 0 };
          e.mentees++;
          locMap.set(m.location_timezone, e);
        }
      });
      c.mentors.forEach(m => {
        if (m.department) {
          const e = deptMap.get(m.department) || { department: m.department, mentees: 0, mentors: 0 };
          e.mentors++;
          deptMap.set(m.department, e);
        }
        if (m.job_grade) {
          const e = gradeMap.get(m.job_grade) || { grade: m.job_grade, mentees: 0, mentors: 0 };
          e.mentors++;
          gradeMap.set(m.job_grade, e);
        }
        if (m.location_timezone) {
          const e = locMap.get(m.location_timezone) || { location: m.location_timezone, mentees: 0, mentors: 0 };
          e.mentors++;
          locMap.set(m.location_timezone, e);
        }
      });
    });

    return {
      departments: [...deptMap.values()].sort((a, b) => (b.mentees + b.mentors) - (a.mentees + a.mentors)),
      grades: [...gradeMap.values()].sort((a, b) => (b.mentees + b.mentors) - (a.mentees + a.mentors)),
      locations: [...locMap.values()].sort((a, b) => (b.mentees + b.mentors) - (a.mentees + a.mentors)),
    };
  }, [cohorts]);

  const populationStats = useMemo(() => getPopulationStats(filteredCohorts), [filteredCohorts]);
  const topicData = useMemo(() => getTopicDemandSupply(filteredCohorts), [filteredCohorts]);
  const experienceData = useMemo(() => getExperienceDistribution(filteredCohorts), [filteredCohorts]);
  const lifeExpData = useMemo(() => getLifeExperienceDistribution(filteredCohorts), [filteredCohorts]);
  const utilizationData = useMemo(() => getMentorUtilization(filteredCohorts), [filteredCohorts]);
  const cohortQualities = useMemo(() => getCohortMatchQualities(filteredCohorts), [filteredCohorts]);

  const selectedCohort = cohorts.find(c => c.id === selectedCohortForMatch);
  const matchScoreDist = useMemo(
    () => selectedCohort ? getMatchScoreDistribution(selectedCohort) : [],
    [selectedCohort]
  );
  const featureContribs = useMemo(
    () => selectedCohort ? getFeatureContributions(selectedCohort) : [],
    [selectedCohort]
  );

  const topTopics = topicData.slice(0, 15);
  const topUtilization = utilizationData.slice(0, 15).map(u => ({
    name: u.mentor_name,
    assigned: u.assigned,
    remaining: u.remaining,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="People Analytics" description="Population-level insights across all cohorts" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{populationStats.totalMentors}</div>
            <div className="text-xs text-muted-foreground">Total Mentors</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{populationStats.totalMentees}</div>
            <div className="text-xs text-muted-foreground">Total Mentees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{populationStats.totalPairs}</div>
            <div className="text-xs text-muted-foreground">Matched Pairs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{populationStats.activeCohorts}</div>
            <div className="text-xs text-muted-foreground">Active Cohorts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{populationStats.uniqueTopics}</div>
            <div className="text-xs text-muted-foreground">Unique Topics</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">
              {populationStats.avgMatchScore !== null ? populationStats.avgMatchScore : '-'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Match Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Demographic Filters */}
      {(filterOptions.departments.length > 1 || filterOptions.grades.length > 1 || filterOptions.locations.length > 1) && (
        <Card className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filter by:
            </div>
            {filterOptions.departments.length > 1 && (
              <Select value={deptFilter} onValueChange={v => setDeptFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Departments</SelectItem>
                  {filterOptions.departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterOptions.grades.length > 1 && (
              <Select value={gradeFilter} onValueChange={v => setGradeFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue placeholder="All Job Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Job Grades</SelectItem>
                  {filterOptions.grades.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterOptions.locations.length > 1 && (
              <Select value={locationFilter} onValueChange={v => setLocationFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Locations</SelectItem>
                  {filterOptions.locations.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-sm"
                onClick={() => { setDeptFilter(''); setGradeFilter(''); setLocationFilter(''); }}
              >
                <X className="w-4 h-4 mr-1" /> Clear ({activeFilterCount})
              </Button>
            )}
          </div>
        </Card>
      )}

      <Tabs defaultValue="topics">
        <TabsList>
          <TabsTrigger value="topics">Topic Demand vs Supply</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="organisation">Organisation</TabsTrigger>
          <TabsTrigger value="match-quality">Match Quality</TabsTrigger>
          <TabsTrigger value="utilization">Mentor Utilization</TabsTrigger>
        </TabsList>

        {/* Topic Demand vs Supply */}
        <TabsContent value="topics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Topic Demand vs Supply</CardTitle>
              <CardDescription>
                Mentee demand vs mentor availability per topic. Gaps highlight areas for mentor recruitment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topTopics.length > 0 ? (
                <ChartContainer config={topicChartConfig} className="h-[400px] w-full">
                  <BarChart data={topTopics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="topic" width={150} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="demand" fill="var(--color-demand)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="supply" fill="var(--color-supply)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No topic data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {topicData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topic Gaps</CardTitle>
                <CardDescription>Topics sorted by unmet demand (demand - supply)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead className="text-center">Demand</TableHead>
                      <TableHead className="text-center">Supply</TableHead>
                      <TableHead className="text-center">Gap</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topicData.map(t => (
                      <TableRow key={t.topic}>
                        <TableCell className="font-medium">{t.topic}</TableCell>
                        <TableCell className="text-center">{t.demand}</TableCell>
                        <TableCell className="text-center">{t.supply}</TableCell>
                        <TableCell className="text-center font-bold">
                          {t.gap > 0 ? `+${t.gap}` : t.gap}
                        </TableCell>
                        <TableCell>
                          {t.gap > 0 ? (
                            <Badge className="bg-red-500">Unmet Demand</Badge>
                          ) : t.gap === 0 ? (
                            <Badge variant="secondary">Balanced</Badge>
                          ) : (
                            <Badge className="bg-green-500">Surplus</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Demographics */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Experience Distribution</CardTitle>
                <CardDescription>Mentor and mentee counts by experience band</CardDescription>
              </CardHeader>
              <CardContent>
                {experienceData.length > 0 ? (
                  <ChartContainer config={experienceChartConfig} className="h-[250px] w-full">
                    <BarChart data={experienceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="band" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="mentees" fill="var(--color-mentees)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="mentors" fill="var(--color-mentors)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No experience data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Life Experiences</CardTitle>
                <CardDescription>Mentee needs vs mentor expertise in life situations</CardDescription>
              </CardHeader>
              <CardContent>
                {lifeExpData.length > 0 ? (
                  <ChartContainer config={lifeExpChartConfig} className="h-[250px] w-full">
                    <BarChart data={lifeExpData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="experience" width={140} fontSize={10} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="mentees" fill="var(--color-mentees)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="mentors" fill="var(--color-mentors)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No life experience data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organisation */}
        <TabsContent value="organisation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="w-4 h-4" />
                Department Distribution
              </CardTitle>
              <CardDescription>Mentee and mentor counts by department</CardDescription>
            </CardHeader>
            <CardContent>
              {orgData.departments.length > 0 ? (
                <ChartContainer config={orgChartConfig} className="w-full" style={{ height: Math.max(200, orgData.departments.length * 35) }}>
                  <BarChart data={orgData.departments} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="department" width={140} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="mentees" fill="var(--color-mentees)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="mentors" fill="var(--color-mentors)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  <div className="text-center">
                    <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No department data available</p>
                    <p className="text-sm mt-1">Add a "Department" column to your CSV imports</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job Grade Distribution</CardTitle>
                <CardDescription>Mentee and mentor counts by job grade</CardDescription>
              </CardHeader>
              <CardContent>
                {orgData.grades.length > 0 ? (
                  <ChartContainer config={orgChartConfig} className="h-[300px] w-full">
                    <BarChart data={orgData.grades} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="grade" width={100} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="mentees" fill="var(--color-mentees)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="mentors" fill="var(--color-mentors)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No job grade data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location Distribution</CardTitle>
                <CardDescription>Mentee and mentor counts by location</CardDescription>
              </CardHeader>
              <CardContent>
                {orgData.locations.length > 0 ? (
                  <ChartContainer config={orgChartConfig} className="h-[300px] w-full">
                    <BarChart data={orgData.locations} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="location" width={140} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="mentees" fill="var(--color-mentees)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="mentors" fill="var(--color-mentors)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No location data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Match Quality */}
        <TabsContent value="match-quality" className="space-y-6">
          <div className="w-64 mb-4">
            <Label>Select Cohort</Label>
            <Select value={selectedCohortForMatch} onValueChange={setSelectedCohortForMatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                {cohorts
                  .filter(c => c.matches?.results && c.matches.results.length > 0)
                  .map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Match Score Distribution</CardTitle>
                <CardDescription>How match scores are distributed in this cohort</CardDescription>
              </CardHeader>
              <CardContent>
                {matchScoreDist.some(d => d.count > 0) ? (
                  <ChartContainer config={matchScoreChartConfig} className="h-[250px] w-full">
                    <BarChart data={matchScoreDist}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    <div className="text-center">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No match data for this cohort</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feature Contributions</CardTitle>
                <CardDescription>Average contribution of each matching feature</CardDescription>
              </CardHeader>
              <CardContent>
                {featureContribs.length > 0 ? (
                  <ChartContainer config={featureChartConfig} className="h-[250px] w-full">
                    <BarChart data={featureContribs} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} fontSize={12} />
                      <YAxis type="category" dataKey="feature" width={100} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="avgValue" fill="var(--color-avgValue)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    No feature data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {cohortQualities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Match Quality by Cohort</CardTitle>
                <CardDescription>Average match score comparison across cohorts</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={cohortQualityConfig} className="h-[250px] w-full">
                  <BarChart data={cohortQualities}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort_name" fontSize={11} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgScore" fill="var(--color-avgScore)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Mentor Utilization */}
        <TabsContent value="utilization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mentor Capacity vs Assigned</CardTitle>
              <CardDescription>
                Shows how mentor capacity is being used. Mentors with remaining capacity can take more mentees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topUtilization.length > 0 ? (
                <ChartContainer config={utilizationChartConfig} className="h-[350px] w-full">
                  <BarChart data={topUtilization} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="name" width={100} fontSize={10} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="assigned" stackId="a" fill="var(--color-assigned)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No utilization data available</p>
                    <p className="text-sm mt-1">Utilization data appears after matching is run</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {utilizationData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mentor Utilization Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Cohort</TableHead>
                      <TableHead className="text-center">Capacity</TableHead>
                      <TableHead className="text-center">Assigned</TableHead>
                      <TableHead className="text-center">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilizationData.map(u => (
                      <TableRow key={`${u.mentor_id}-${u.cohort_name}`}>
                        <TableCell className="font-medium">{u.mentor_name}</TableCell>
                        <TableCell>{u.cohort_name}</TableCell>
                        <TableCell className="text-center">{u.capacity}</TableCell>
                        <TableCell className="text-center">{u.assigned}</TableCell>
                        <TableCell className="text-center font-bold">{u.remaining}</TableCell>
                        <TableCell>
                          {u.remaining === 0 ? (
                            <Badge className="bg-red-500">Full</Badge>
                          ) : u.assigned === 0 ? (
                            <Badge variant="outline">Unassigned</Badge>
                          ) : (
                            <Badge className="bg-green-500">Available</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
