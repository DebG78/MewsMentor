import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Plus,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Users,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  getSessionsByCohort,
  createSession,
  updateSession,
  completeSession,
  getSessionStats,
  computeSessionVolume,
  computePairSessionSummaries,
  computeRatingDistribution,
  type SessionRow,
  type SessionStats,
  type SessionStatus,
} from '@/lib/sessionService';
import { getAllCohorts } from '@/lib/supabaseService';
import type { Cohort } from '@/types/mentoring';
import { SessionLogImport } from '@/components/admin/SessionLogImport';

const volumeChartConfig = {
  completed: { label: 'Completed', color: 'hsl(142, 71%, 45%)' },
  scheduled: { label: 'Scheduled', color: 'hsl(221, 83%, 53%)' },
  cancelled: { label: 'Cancelled', color: 'hsl(0, 0%, 60%)' },
  noShow: { label: 'No Show', color: 'hsl(0, 84%, 60%)' },
} satisfies ChartConfig;

const ratingChartConfig = {
  mentor: { label: 'Mentor Rating', color: 'hsl(221, 83%, 53%)' },
  mentee: { label: 'Mentee Rating', color: 'hsl(142, 71%, 45%)' },
} satisfies ChartConfig;

const pairChartConfig = {
  sessionCount: { label: 'Sessions', color: 'hsl(221, 83%, 53%)' },
} satisfies ChartConfig;

export default function MentoringSessions() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<SessionStatus | 'all'>('all');

  // Demographic filters
  const [deptFilter, setDeptFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formMentorId, setFormMentorId] = useState('');
  const [formMenteeId, setFormMenteeId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDuration, setFormDuration] = useState('60');
  const [formNotes, setFormNotes] = useState('');

  // Person lookup for demographic filtering and name display
  const personLookup = useMemo(() => {
    const cohort = cohorts.find(c => c.id === selectedCohort);
    if (!cohort) return new Map<string, { name?: string; department?: string; job_grade?: string; location?: string }>();
    const map = new Map<string, { name?: string; department?: string; job_grade?: string; location?: string }>();
    [...cohort.mentees, ...cohort.mentors].forEach(p => {
      map.set(p.id, { name: p.name, department: p.department, job_grade: p.job_grade, location: p.location_timezone });
    });
    return map;
  }, [cohorts, selectedCohort]);

  // Filter options from current cohort
  const demoFilterOptions = useMemo(() => {
    const cohort = cohorts.find(c => c.id === selectedCohort);
    if (!cohort) return { departments: [], grades: [], locations: [] };
    const depts = new Set<string>();
    const grades = new Set<string>();
    const locs = new Set<string>();
    [...cohort.mentees, ...cohort.mentors].forEach(p => {
      if (p.department) depts.add(p.department);
      if (p.job_grade) grades.add(p.job_grade);
      if (p.location_timezone) locs.add(p.location_timezone);
    });
    return {
      departments: [...depts].sort(),
      grades: [...grades].sort(),
      locations: [...locs].sort(),
    };
  }, [cohorts, selectedCohort]);

  // Apply all filters (status + demographics) to sessions
  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (filterStatus !== 'all') list = list.filter(s => s.status === filterStatus);
    if (deptFilter) list = list.filter(s => {
      const mentor = personLookup.get(s.mentor_id);
      const mentee = personLookup.get(s.mentee_id);
      return mentor?.department === deptFilter || mentee?.department === deptFilter;
    });
    if (gradeFilter) list = list.filter(s => {
      const mentor = personLookup.get(s.mentor_id);
      const mentee = personLookup.get(s.mentee_id);
      return mentor?.job_grade === gradeFilter || mentee?.job_grade === gradeFilter;
    });
    if (locationFilter) list = list.filter(s => {
      const mentor = personLookup.get(s.mentor_id);
      const mentee = personLookup.get(s.mentee_id);
      return mentor?.location === locationFilter || mentee?.location === locationFilter;
    });
    return list;
  }, [sessions, filterStatus, deptFilter, gradeFilter, locationFilter, personLookup]);

  // Computed chart data (from filtered sessions)
  const volumeData = useMemo(() => computeSessionVolume(filteredSessions), [filteredSessions]);
  const pairSummaries = useMemo(() => computePairSessionSummaries(filteredSessions), [filteredSessions]);
  const ratingDist = useMemo(() => computeRatingDistribution(filteredSessions), [filteredSessions]);

  const pairChartData = useMemo(() => {
    return pairSummaries.slice(0, 15).map(p => ({
      pair: `${p.mentor_id.slice(0, 6)}../${p.mentee_id.slice(0, 6)}..`,
      sessionCount: p.sessionCount,
    }));
  }, [pairSummaries]);

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) loadData();
  }, [selectedCohort]);

  const loadCohorts = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data);
      if (data.length > 0) setSelectedCohort(data[0].id);
    } catch {
      toast({ title: 'Error', description: 'Failed to load cohorts', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    if (!selectedCohort) return;
    setIsLoading(true);
    try {
      const [sessionsData, statsData] = await Promise.all([
        getSessionsByCohort(selectedCohort),
        getSessionStats(selectedCohort),
      ]);
      setSessions(sessionsData);
      setStats(statsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as Record<string, unknown>).message) : JSON.stringify(err);
      console.error('Failed to load sessions:', JSON.stringify(err, null, 2));
      toast({ title: 'Error', description: `Failed to load sessions: ${msg}`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formMentorId || !formMenteeId || !formTitle || !formDate) {
      toast({ title: 'Error', description: 'Fill in all required fields', variant: 'destructive' });
      return;
    }
    try {
      await createSession({
        cohort_id: selectedCohort,
        mentor_id: formMentorId,
        mentee_id: formMenteeId,
        title: formTitle,
        scheduled_datetime: formDate,
        duration_minutes: parseInt(formDuration) || 60,
        notes: formNotes || undefined,
      });
      toast({ title: 'Session created' });
      setIsCreateOpen(false);
      resetForm();
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to create session', variant: 'destructive' });
    }
  };

  const handleComplete = async (session: SessionRow) => {
    try {
      await completeSession(session.id);
      toast({ title: 'Session marked as completed' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to complete session', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (session: SessionRow, status: SessionStatus) => {
    try {
      await updateSession(session.id, { status });
      toast({ title: 'Status updated' });
      loadData();
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormMentorId('');
    setFormMenteeId('');
    setFormTitle('');
    setFormDate('');
    setFormDuration('60');
    setFormNotes('');
  };

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      case 'no_show':
        return <Badge className="bg-red-500">No Show</Badge>;
    }
  };

  if (isLoading && cohorts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mentoring Sessions</h1>
          <p className="text-muted-foreground">
            Track and analyze mentoring sessions across cohorts
          </p>
        </div>
        <div className="flex gap-2">
          <SessionLogImport onImported={loadData} />
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>

      {/* Cohort Selector */}
      <div className="w-64">
        <Label>Select Cohort</Label>
        <Select value={selectedCohort} onValueChange={setSelectedCohort}>
          <SelectTrigger>
            <SelectValue placeholder="Select cohort" />
          </SelectTrigger>
          <SelectContent>
            {cohorts.map(cohort => (
              <SelectItem key={cohort.id} value={cohort.id}>
                {cohort.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sessions</p>
                      <p className="text-3xl font-bold">{stats.total}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-3xl font-bold">{stats.completionRate.toFixed(0)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Rating</p>
                      <p className="text-3xl font-bold">
                        {stats.avgMentorRating !== null || stats.avgMenteeRating !== null
                          ? (((stats.avgMentorRating || 0) + (stats.avgMenteeRating || 0)) /
                              ((stats.avgMentorRating !== null ? 1 : 0) + (stats.avgMenteeRating !== null ? 1 : 0))).toFixed(1)
                          : '-'}
                      </p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">All Sessions</TabsTrigger>
              <TabsTrigger value="pairs">Pair Analysis</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Session Volume Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Session Volume by Month</CardTitle>
                    <CardDescription>Sessions grouped by status and month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {volumeData.length > 0 ? (
                      <ChartContainer config={volumeChartConfig} className="h-[250px] w-full">
                        <BarChart data={volumeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="month"
                            fontSize={12}
                            tickFormatter={(v) => {
                              const [y, m] = v.split('-');
                              return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                            }}
                          />
                          <YAxis allowDecimals={false} fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="scheduled" stackId="a" fill="var(--color-scheduled)" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="noShow" stackId="a" fill="var(--color-noShow)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No session data yet</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rating Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rating Distribution</CardTitle>
                    <CardDescription>Mentor and mentee session ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ratingDist.some(d => d.mentor > 0 || d.mentee > 0) ? (
                      <ChartContainer config={ratingChartConfig} className="h-[250px] w-full">
                        <BarChart data={ratingDist}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="rating" fontSize={12} label={{ value: 'Stars', position: 'insideBottom', offset: -5 }} />
                          <YAxis allowDecimals={false} fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="mentor" fill="var(--color-mentor)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="mentee" fill="var(--color-mentee)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                        <div className="text-center">
                          <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No ratings recorded yet</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* All Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm">Filter:</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as SessionStatus | 'all')}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
                {demoFilterOptions.departments.length > 1 && (
                  <Select value={deptFilter} onValueChange={v => setDeptFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Departments</SelectItem>
                      {demoFilterOptions.departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {demoFilterOptions.grades.length > 1 && (
                  <Select value={gradeFilter} onValueChange={v => setGradeFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Job Grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Job Grades</SelectItem>
                      {demoFilterOptions.grades.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {demoFilterOptions.locations.length > 1 && (
                  <Select value={locationFilter} onValueChange={v => setLocationFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Locations</SelectItem>
                      {demoFilterOptions.locations.map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sessions ({filteredSessions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No sessions found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Mentor</TableHead>
                          <TableHead>Mentee</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Rating</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessions.map(session => (
                          <TableRow key={session.id}>
                            <TableCell>
                              {new Date(session.scheduled_datetime).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium max-w-xs truncate">
                              {session.title}
                            </TableCell>
                            <TableCell>{personLookup.get(session.mentor_id)?.name || session.mentor_id.slice(0, 8) + '...'}</TableCell>
                            <TableCell>{personLookup.get(session.mentee_id)?.name || session.mentee_id.slice(0, 8) + '...'}</TableCell>
                            <TableCell>{session.duration_minutes}min</TableCell>
                            <TableCell>{getStatusBadge(session.status)}</TableCell>
                            <TableCell className="text-center">
                              {session.mentor_rating || session.mentee_rating ? (
                                <span className="text-sm">
                                  {session.mentor_rating && <span>M:{session.mentor_rating}</span>}
                                  {session.mentor_rating && session.mentee_rating && ' / '}
                                  {session.mentee_rating && <span>E:{session.mentee_rating}</span>}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {session.status === 'scheduled' && (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleComplete(session)}
                                    title="Mark completed"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(session, 'cancelled')}
                                    title="Cancel"
                                  >
                                    <XCircle className="w-4 h-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pair Analysis Tab */}
            <TabsContent value="pairs" className="space-y-6">
              {/* Pair Frequency Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sessions per Pair</CardTitle>
                  <CardDescription>
                    Top pairs by session count (low-frequency pairs may need attention)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pairChartData.length > 0 ? (
                    <ChartContainer config={pairChartConfig} className="h-[300px] w-full">
                      <BarChart data={pairChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} fontSize={12} />
                        <YAxis type="category" dataKey="pair" width={110} fontSize={10} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sessionCount" fill="var(--color-sessionCount)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      <div className="text-center">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No pair data yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pair Summary Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pair Session Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {pairSummaries.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No pair data</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mentor</TableHead>
                          <TableHead>Mentee</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Completed</TableHead>
                          <TableHead>Last Session</TableHead>
                          <TableHead className="text-center">Avg Mentor Rating</TableHead>
                          <TableHead className="text-center">Avg Mentee Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pairSummaries.map(pair => (
                          <TableRow key={`${pair.mentor_id}:${pair.mentee_id}`}>
                            <TableCell>{personLookup.get(pair.mentor_id)?.name || pair.mentor_id.slice(0, 8) + '...'}</TableCell>
                            <TableCell>{personLookup.get(pair.mentee_id)?.name || pair.mentee_id.slice(0, 8) + '...'}</TableCell>
                            <TableCell className="text-center font-bold">{pair.sessionCount}</TableCell>
                            <TableCell className="text-center">{pair.completedCount}</TableCell>
                            <TableCell>
                              {pair.lastSessionDate
                                ? new Date(pair.lastSessionDate).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {pair.avgMentorRating !== null ? pair.avgMentorRating.toFixed(1) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {pair.avgMenteeRating !== null ? pair.avgMenteeRating.toFixed(1) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Session Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Session</DialogTitle>
            <DialogDescription>
              Create a new mentoring session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Weekly check-in"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mentor ID</Label>
                <Input
                  value={formMentorId}
                  onChange={(e) => setFormMentorId(e.target.value)}
                  placeholder="Enter mentor ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Mentee ID</Label>
                <Input
                  value={formMenteeId}
                  onChange={(e) => setFormMenteeId(e.target.value)}
                  placeholder="Enter mentee ID"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Session notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
