import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { CheckIn, RiskFlag, CheckInSummary } from '@/types/checkIns';
import {
  getCheckInsByCohort,
  createCheckIn,
  updateCheckIn,
  completeCheckIn,
  updateRiskFlag,
  getCheckInSummary,
} from '@/lib/checkInService';
import { getAllCohorts } from '@/lib/supabaseService';
import type { Cohort } from '@/types/mentoring';
import { cn } from '@/lib/utils';

const riskDonutConfig = {
  green: { label: 'Green', color: 'hsl(142, 71%, 45%)' },
  amber: { label: 'Amber', color: 'hsl(45, 93%, 47%)' },
  red: { label: 'Red', color: 'hsl(0, 84%, 60%)' },
} satisfies ChartConfig;

const riskTrendConfig = {
  green: { label: 'Green', color: 'hsl(142, 71%, 45%)' },
  amber: { label: 'Amber', color: 'hsl(45, 93%, 47%)' },
  red: { label: 'Red', color: 'hsl(0, 84%, 60%)' },
} satisfies ChartConfig;

export default function CheckInsTracker() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<CheckInSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<RiskFlag | 'all'>('all');

  // Demographic filters
  const [deptFilter, setDeptFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | null>(null);

  // Form state
  const [formMentorId, setFormMentorId] = useState('');
  const [formMenteeId, setFormMenteeId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRiskFlag, setFormRiskFlag] = useState<RiskFlag>('green');
  const [formRiskReason, setFormRiskReason] = useState('');
  const [formNextAction, setFormNextAction] = useState('');

  // Person lookup for demographic filtering
  const personLookup = useMemo(() => {
    const cohort = cohorts.find(c => c.id === selectedCohort);
    if (!cohort) return new Map<string, { department?: string; job_grade?: string; location?: string }>();
    const map = new Map<string, { department?: string; job_grade?: string; location?: string }>();
    [...cohort.mentees, ...cohort.mentors].forEach(p => {
      map.set(p.id, { department: p.department, job_grade: p.job_grade, location: p.location_timezone });
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

  // Apply all filters (risk + demographics) to check-ins
  const filteredCheckIns = useMemo(() => {
    let list = checkIns;
    if (filterRisk !== 'all') list = list.filter(c => c.risk_flag === filterRisk);
    if (deptFilter) list = list.filter(c => {
      const mentor = personLookup.get(c.mentor_id);
      const mentee = personLookup.get(c.mentee_id);
      return mentor?.department === deptFilter || mentee?.department === deptFilter;
    });
    if (gradeFilter) list = list.filter(c => {
      const mentor = personLookup.get(c.mentor_id);
      const mentee = personLookup.get(c.mentee_id);
      return mentor?.job_grade === gradeFilter || mentee?.job_grade === gradeFilter;
    });
    if (locationFilter) list = list.filter(c => {
      const mentor = personLookup.get(c.mentor_id);
      const mentee = personLookup.get(c.mentee_id);
      return mentor?.location === locationFilter || mentee?.location === locationFilter;
    });
    return list;
  }, [checkIns, filterRisk, deptFilter, gradeFilter, locationFilter, personLookup]);

  // Chart data computed from filtered check-ins
  const riskDonutData = useMemo(() => {
    let green = 0, amber = 0, red = 0;
    filteredCheckIns.forEach(c => {
      if (c.risk_flag === 'green') green++;
      else if (c.risk_flag === 'amber') amber++;
      else if (c.risk_flag === 'red') red++;
    });
    return [
      { name: 'Green', value: green, fill: 'var(--color-green)' },
      { name: 'Amber', value: amber, fill: 'var(--color-amber)' },
      { name: 'Red', value: red, fill: 'var(--color-red)' },
    ].filter(d => d.value > 0);
  }, [filteredCheckIns]);

  const riskTrendData = useMemo(() => {
    if (filteredCheckIns.length === 0) return [];

    const dateMap = new Map<string, { date: string; green: number; amber: number; red: number }>();

    const sorted = [...filteredCheckIns].sort(
      (a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime()
    );

    for (const ci of sorted) {
      const date = ci.check_in_date.split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, green: 0, amber: 0, red: 0 });
      }
      const entry = dateMap.get(date)!;
      if (ci.risk_flag === 'green') entry.green++;
      else if (ci.risk_flag === 'amber') entry.amber++;
      else if (ci.risk_flag === 'red') entry.red++;
    }

    return Array.from(dateMap.values());
  }, [filteredCheckIns]);

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      loadCheckIns();
    }
  }, [selectedCohort]);

  const loadCohorts = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data);
      if (data.length > 0) {
        setSelectedCohort(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cohorts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCheckIns = async () => {
    if (!selectedCohort) return;

    setIsLoading(true);
    try {
      const [checkInsData, summaryData] = await Promise.all([
        getCheckInsByCohort(selectedCohort),
        getCheckInSummary(selectedCohort),
      ]);
      setCheckIns(checkInsData);
      setSummary(summaryData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load check-ins',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCheckIn = async () => {
    if (!formMentorId || !formMenteeId || !formDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createCheckIn({
        cohort_id: selectedCohort,
        mentor_id: formMentorId,
        mentee_id: formMenteeId,
        check_in_date: formDate,
        notes: formNotes,
        risk_flag: formRiskFlag,
        risk_reason: formRiskReason,
        next_action: formNextAction,
      });
      toast({
        title: 'Success',
        description: 'Check-in created',
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadCheckIns();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create check-in',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRiskFlag = async (checkIn: CheckIn, newFlag: RiskFlag) => {
    try {
      await updateRiskFlag(checkIn.id, newFlag);
      toast({
        title: 'Success',
        description: 'Risk flag updated',
      });
      loadCheckIns();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update risk flag',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteCheckIn = async (checkIn: CheckIn) => {
    try {
      await completeCheckIn(checkIn.id);
      toast({
        title: 'Success',
        description: 'Check-in marked as completed',
      });
      loadCheckIns();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete check-in',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormMentorId('');
    setFormMenteeId('');
    setFormDate('');
    setFormNotes('');
    setFormRiskFlag('green');
    setFormRiskReason('');
    setFormNextAction('');
  };

  const getRiskBadge = (risk: RiskFlag) => {
    switch (risk) {
      case 'green':
        return <Badge className="bg-green-500">Green</Badge>;
      case 'amber':
        return <Badge className="bg-yellow-500">Amber</Badge>;
      case 'red':
        return <Badge className="bg-red-500">Red</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'missed':
        return <Badge className="bg-red-500">Missed</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return null;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Check-ins Tracker</h1>
          <p className="text-muted-foreground">
            Track mentor-mentee check-ins and identify at-risk pairs
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Check-in
        </Button>
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Total Check-ins</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.green}</div>
              <div className="text-xs text-muted-foreground">Green</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.amber}</div>
              <div className="text-xs text-muted-foreground">Amber</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.red}</div>
              <div className="text-xs text-muted-foreground">Red</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Distribution Donut */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Distribution</CardTitle>
              <CardDescription>Current risk flag breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {riskDonutData.length > 0 ? (
                <ChartContainer config={riskDonutConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie
                      data={riskDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {riskDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No risk data available
                </div>
              )}
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Green ({summary.green})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Amber ({summary.amber})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Red ({summary.red})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Trend Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Trend Over Time</CardTitle>
              <CardDescription>Risk flag distribution by check-in date</CardDescription>
            </CardHeader>
            <CardContent>
              {riskTrendData.length > 1 ? (
                <ChartContainer config={riskTrendConfig} className="h-[250px] w-full">
                  <AreaChart data={riskTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      fontSize={12}
                    />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="red"
                      stackId="1"
                      fill="var(--color-red)"
                      stroke="var(--color-red)"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="amber"
                      stackId="1"
                      fill="var(--color-amber)"
                      stroke="var(--color-amber)"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="green"
                      stackId="1"
                      fill="var(--color-green)"
                      stroke="var(--color-green)"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : riskTrendData.length === 1 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                  Need at least 2 check-in dates to show trend
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm">Filter:</Label>
        <Select value={filterRisk} onValueChange={(v) => setFilterRisk(v as RiskFlag | 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="green">Green</SelectItem>
            <SelectItem value="amber">Amber</SelectItem>
            <SelectItem value="red">Red</SelectItem>
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

      {/* Check-ins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Check-ins</CardTitle>
          <CardDescription>
            {filteredCheckIns.length} check-in(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredCheckIns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No check-ins found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Mentee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCheckIns.map(checkIn => (
                  <TableRow key={checkIn.id}>
                    <TableCell>
                      {new Date(checkIn.check_in_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{checkIn.mentor_id}</TableCell>
                    <TableCell>{checkIn.mentee_id}</TableCell>
                    <TableCell>{getStatusBadge(checkIn.status)}</TableCell>
                    <TableCell>
                      <Select
                        value={checkIn.risk_flag}
                        onValueChange={(v) => handleUpdateRiskFlag(checkIn, v as RiskFlag)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="green">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Green
                            </span>
                          </SelectItem>
                          <SelectItem value="amber">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              Amber
                            </span>
                          </SelectItem>
                          <SelectItem value="red">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              Red
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {checkIn.next_action || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {checkIn.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCompleteCheckIn(checkIn)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Check-in Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Check-in</DialogTitle>
            <DialogDescription>
              Create a new check-in for a mentor-mentee pair
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="space-y-2">
              <Label>Check-in Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Flag</Label>
              <Select value={formRiskFlag} onValueChange={(v) => setFormRiskFlag(v as RiskFlag)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green - On Track</SelectItem>
                  <SelectItem value="amber">Amber - Needs Attention</SelectItem>
                  <SelectItem value="red">Red - At Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add notes..."
              />
            </div>
            <div className="space-y-2">
              <Label>Next Action</Label>
              <Input
                value={formNextAction}
                onChange={(e) => setFormNextAction(e.target.value)}
                placeholder="What's the next step?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCheckIn}>Create Check-in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
