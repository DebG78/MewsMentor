import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Activity,
  Heart,
  CheckCircle,
  Users,
  AlertTriangle,
  AlertCircle,
  Plus,
  Target,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
} from 'recharts';
import type {
  MetricWithStatus,
  MetricsDashboardSummary,
  MetricCategory,
  SuccessTarget,
  TrendDataPoint,
  CohortComparison,
} from '@/types/metrics';
import {
  METRIC_CATEGORY_METADATA,
  METRIC_LABELS,
  formatMetricValue,
} from '@/types/metrics';
import {
  getMetricsDashboardSummary,
  getMetricsWithStatus,
  createMetricSnapshot,
  getMetricTrend,
  compareCohortMetrics,
} from '@/lib/metricsService';
import { getAllCohorts } from '@/lib/supabaseService';
import { cn } from '@/lib/utils';

const categoryIcons: Record<MetricCategory, React.ComponentType<{ className?: string }>> = {
  engagement: Activity,
  satisfaction: Heart,
  completion: CheckCircle,
  retention: Users,
};

const trendChartConfig = {
  value: { label: "Actual", color: "hsl(214, 84%, 56%)" },
  target: { label: "Target", color: "hsl(0, 0%, 60%)" },
} satisfies ChartConfig;

const radarConfig = {
  performance: { label: "Performance", color: "hsl(214, 84%, 56%)" },
} satisfies ChartConfig;

export default function SuccessMetricsDashboard() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [summary, setSummary] = useState<MetricsDashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<MetricWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');

  // Trend chart state
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Comparison state
  const [comparisonMetric, setComparisonMetric] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<CohortComparison[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Record value dialog
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [selectedMetricForRecord, setSelectedMetricForRecord] = useState<SuccessTarget | null>(null);
  const [recordValue, setRecordValue] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      loadMetrics();
    }
  }, [selectedCohort]);

  const loadCohorts = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data.map(c => ({ id: c.id, name: c.name })));
      if (data.length > 0) {
        setSelectedCohort(data[0].id);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load cohorts', variant: 'destructive' });
    }
  };

  const loadMetrics = async () => {
    if (!selectedCohort) return;
    setIsLoading(true);
    try {
      const [summaryData, metricsData] = await Promise.all([
        getMetricsDashboardSummary(selectedCohort),
        getMetricsWithStatus(selectedCohort),
      ]);
      setSummary(summaryData);
      setMetrics(metricsData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load metrics', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordValue = async () => {
    if (!selectedMetricForRecord || !recordValue || !selectedCohort) return;
    try {
      await createMetricSnapshot({
        cohort_id: selectedCohort,
        metric_name: selectedMetricForRecord.metric_name,
        actual_value: parseFloat(recordValue),
        snapshot_date: recordDate,
      });
      toast({ title: 'Success', description: 'Metric value recorded' });
      setIsRecordDialogOpen(false);
      setRecordValue('');
      setSelectedMetricForRecord(null);
      loadMetrics();
    } catch {
      toast({ title: 'Error', description: 'Failed to record value', variant: 'destructive' });
    }
  };

  const handleToggleTrend = async (metricName: string) => {
    if (expandedMetric === metricName) {
      setExpandedMetric(null);
      return;
    }
    setExpandedMetric(metricName);
    setTrendLoading(true);
    try {
      const data = await getMetricTrend(selectedCohort, metricName, 180);
      setTrendData(data);
    } catch {
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const handleCompare = async (metricName: string) => {
    if (!metricName || cohorts.length < 2) return;
    setComparisonLoading(true);
    try {
      const data = await compareCohortMetrics(cohorts.map(c => c.id), metricName);
      const enriched = data.map(d => ({
        ...d,
        cohort_name: cohorts.find(c => c.id === d.cohort_id)?.name || d.cohort_id,
      }));
      setComparisonData(enriched);
    } catch {
      setComparisonData([]);
    } finally {
      setComparisonLoading(false);
    }
  };

  const radarData = useMemo(() => {
    if (!summary) return [];
    return summary.categorySummaries.map(cat => ({
      category: METRIC_CATEGORY_METADATA[cat.category].label,
      performance: cat.averagePerformance,
      fullMark: 100,
    }));
  }, [summary]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track': return <Badge className="bg-green-500">On Track</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'critical': return <Badge className="bg-red-500">Critical</Badge>;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const filteredMetrics = selectedCategory === 'all'
    ? metrics
    : metrics.filter(m => m.target.metric_category === selectedCategory);

  const metricNames = useMemo(() => {
    const names = new Set(metrics.map(m => m.target.metric_name));
    return Array.from(names);
  }, [metrics]);

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
          <h1 className="text-2xl font-bold">Success Metrics</h1>
          <p className="text-muted-foreground">Track program performance against targets</p>
        </div>
      </div>

      <div className="w-64">
        <Label>Select Cohort</Label>
        <Select value={selectedCohort} onValueChange={setSelectedCohort}>
          <SelectTrigger>
            <SelectValue placeholder="Select cohort" />
          </SelectTrigger>
          <SelectContent>
            {cohorts.map(cohort => (
              <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">All Metrics</TabsTrigger>
            <TabsTrigger value="compare">Compare Cohorts</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {summary && (
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Metrics</p>
                        <p className="text-3xl font-bold">{summary.totalMetrics}</p>
                      </div>
                      <Target className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">On Track</p>
                        <p className="text-3xl font-bold text-green-600">{summary.onTrack}</p>
                      </div>
                      <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Needs Attention</p>
                        <p className="text-3xl font-bold text-yellow-600">{summary.warning}</p>
                      </div>
                      <AlertTriangle className="w-10 h-10 text-yellow-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Critical</p>
                        <p className="text-3xl font-bold text-red-600">{summary.critical}</p>
                      </div>
                      <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {summary && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performance by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {summary.categorySummaries.map(cat => {
                        const Icon = categoryIcons[cat.category];
                        const meta = METRIC_CATEGORY_METADATA[cat.category];
                        return (
                          <div
                            key={cat.category}
                            className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedCategory(cat.category)}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', meta.color, 'text-white')}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-sm">{meta.label}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Avg</span>
                                <span className="font-medium">{cat.averagePerformance}%</span>
                              </div>
                              <Progress value={cat.averagePerformance} className="h-2" />
                              <div className="flex gap-2 text-xs">
                                <span className="text-green-600">{cat.onTrack} ok</span>
                                <span className="text-yellow-600">{cat.warning} warn</span>
                                <span className="text-red-600">{cat.critical} crit</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Category Performance Radar</CardTitle>
                    <CardDescription>Avg performance across all 4 categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {radarData.length === 0 ? (
                      <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
                        No data available
                      </div>
                    ) : (
                      <ChartContainer config={radarConfig} className="h-52 w-full">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid />
                          <PolarAngleAxis dataKey="category" fontSize={12} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={10} />
                          <Radar
                            name="Performance"
                            dataKey="performance"
                            stroke="var(--color-performance)"
                            fill="var(--color-performance)"
                            fillOpacity={0.3}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RadarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {summary && summary.needsAttention.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Needs Immediate Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.needsAttention.map(metric => (
                      <div
                        key={metric.target.id}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(metric.status)}
                          <div>
                            <span className="font-medium">
                              {METRIC_LABELS[metric.target.metric_name] || metric.target.metric_name}
                            </span>
                            <p className="text-sm text-muted-foreground">
                              Target: {formatMetricValue(metric.target.target_value, metric.target.target_unit)}
                              {metric.latestValue !== undefined && (
                                <> | Actual: {formatMetricValue(metric.latestValue, metric.target.target_unit)}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMetricForRecord(metric.target);
                            setIsRecordDialogOpen(true);
                          }}
                        >
                          Update Value
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ALL METRICS TAB */}
          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base">All Metrics</CardTitle>
                    <CardDescription>
                      {filteredMetrics.length} metric(s) displayed. Click a row to see trend.
                    </CardDescription>
                  </div>
                  <Select
                    value={selectedCategory}
                    onValueChange={(v) => setSelectedCategory(v as MetricCategory | 'all')}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="satisfaction">Satisfaction</SelectItem>
                      <SelectItem value="completion">Completion</SelectItem>
                      <SelectItem value="retention">Retention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredMetrics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No metrics found</p>
                    <p className="text-sm">Configure targets or select a different category</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMetrics.map(metric => {
                        const Icon = categoryIcons[metric.target.metric_category];
                        const meta = METRIC_CATEGORY_METADATA[metric.target.metric_category];
                        const isExpanded = expandedMetric === metric.target.metric_name;

                        return (
                          <>
                            <TableRow
                              key={metric.target.id}
                              className="cursor-pointer"
                              onClick={() => handleToggleTrend(metric.target.metric_name)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                                  <div>
                                    <span className="font-medium">
                                      {METRIC_LABELS[metric.target.metric_name] || metric.target.metric_name}
                                    </span>
                                    {metric.target.description && (
                                      <p className="text-xs text-muted-foreground">{metric.target.description}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', meta.color, 'text-white')}>
                                    <Icon className="w-3 h-3" />
                                  </div>
                                  <span className="text-sm">{meta.label}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatMetricValue(metric.target.target_value, metric.target.target_unit)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {metric.latestValue !== undefined
                                  ? formatMetricValue(metric.latestValue, metric.target.target_unit)
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(metric.status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <Progress
                                    value={Math.min(100, metric.percentOfTarget)}
                                    className={cn(
                                      'h-2 flex-1',
                                      metric.status === 'on_track' && '[&>div]:bg-green-500',
                                      metric.status === 'warning' && '[&>div]:bg-yellow-500',
                                      metric.status === 'critical' && '[&>div]:bg-red-500'
                                    )}
                                  />
                                  <span className="text-xs text-muted-foreground w-10">
                                    {Math.round(metric.percentOfTarget)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMetricForRecord(metric.target);
                                    setIsRecordDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Record
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Expanded Trend Chart Row */}
                            {isExpanded && (
                              <TableRow key={`${metric.target.id}-trend`}>
                                <TableCell colSpan={7} className="bg-muted/20 p-0">
                                  <div className="px-6 py-4">
                                    {trendLoading ? (
                                      <div className="flex justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      </div>
                                    ) : trendData.length === 0 ? (
                                      <div className="text-center py-6 text-muted-foreground text-sm">
                                        No historical data recorded yet. Use the "Record" button to add values over time.
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="text-sm font-medium mb-3">
                                          Trend: {METRIC_LABELS[metric.target.metric_name] || metric.target.metric_name} (last 180 days)
                                        </p>
                                        <ChartContainer config={trendChartConfig} className="h-52 w-full">
                                          <LineChart data={trendData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                              dataKey="date"
                                              fontSize={11}
                                              tickFormatter={(d) => {
                                                const date = new Date(d);
                                                return `${date.getMonth() + 1}/${date.getDate()}`;
                                              }}
                                            />
                                            <YAxis fontSize={11} />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Line
                                              type="monotone"
                                              dataKey="value"
                                              stroke="var(--color-value)"
                                              strokeWidth={2}
                                              dot={{ r: 4 }}
                                              activeDot={{ r: 6 }}
                                            />
                                            {trendData[0]?.target !== undefined && (
                                              <ReferenceLine
                                                y={trendData[0].target}
                                                stroke="var(--color-target)"
                                                strokeDasharray="5 5"
                                                label={{ value: "Target", position: "right", fontSize: 11 }}
                                              />
                                            )}
                                            {metric.target.warning_threshold && (
                                              <ReferenceLine
                                                y={metric.target.warning_threshold}
                                                stroke="hsl(38, 92%, 50%)"
                                                strokeDasharray="3 3"
                                                strokeOpacity={0.5}
                                              />
                                            )}
                                            {metric.target.critical_threshold && (
                                              <ReferenceLine
                                                y={metric.target.critical_threshold}
                                                stroke="hsl(0, 84%, 60%)"
                                                strokeDasharray="3 3"
                                                strokeOpacity={0.5}
                                              />
                                            )}
                                          </LineChart>
                                        </ChartContainer>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPARE COHORTS TAB */}
          <TabsContent value="compare" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cross-Cohort Comparison</CardTitle>
                <CardDescription>
                  Compare a metric across all cohorts to identify which programs perform best.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-end gap-4">
                  <div className="w-72">
                    <Label>Metric to Compare</Label>
                    <Select
                      value={comparisonMetric}
                      onValueChange={(v) => {
                        setComparisonMetric(v);
                        handleCompare(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a metric..." />
                      </SelectTrigger>
                      <SelectContent>
                        {metricNames.map(name => (
                          <SelectItem key={name} value={name}>
                            {METRIC_LABELS[name] || name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {comparisonLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : comparisonData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    {comparisonMetric
                      ? "No data found for this metric across cohorts. Ensure metrics are recorded in multiple cohorts."
                      : "Select a metric above to compare across cohorts."}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ChartContainer
                      config={{
                        actual: { label: "Actual", color: "hsl(214, 84%, 56%)" },
                        target: { label: "Target", color: "hsl(142, 76%, 46%)" },
                      }}
                      className="h-64 w-full"
                    >
                      <BarChart
                        data={comparisonData.map(d => ({
                          cohort: d.cohort_name,
                          actual: d.actual_value,
                          target: d.target_value,
                        }))}
                        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cohort" fontSize={11} />
                        <YAxis fontSize={11} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="target" fill="var(--color-target)" radius={[4, 4, 0, 0]} opacity={0.5} />
                      </BarChart>
                    </ChartContainer>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cohort</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Target</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">% of Target</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparisonData.map(d => {
                          const pct = d.target_value > 0 ? Math.round((d.actual_value / d.target_value) * 100) : 0;
                          return (
                            <TableRow key={d.cohort_id}>
                              <TableCell className="font-medium">{d.cohort_name}</TableCell>
                              <TableCell className="text-right font-mono">{d.actual_value.toFixed(1)}</TableCell>
                              <TableCell className="text-right font-mono">{d.target_value.toFixed(1)}</TableCell>
                              <TableCell className="text-center">{getStatusBadge(d.status)}</TableCell>
                              <TableCell className="text-right font-mono">{pct}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Record Value Dialog */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Metric Value</DialogTitle>
            <DialogDescription>
              {selectedMetricForRecord && (
                <>
                  Recording value for{' '}
                  <strong>
                    {METRIC_LABELS[selectedMetricForRecord.metric_name] || selectedMetricForRecord.metric_name}
                  </strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                step="0.1"
                value={recordValue}
                onChange={(e) => setRecordValue(e.target.value)}
                placeholder="Enter value..."
              />
              {selectedMetricForRecord?.target_unit && (
                <p className="text-xs text-muted-foreground">
                  Unit: {selectedMetricForRecord.target_unit}
                  {' '}| Target: {formatMetricValue(selectedMetricForRecord.target_value, selectedMetricForRecord.target_unit)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordValue}>Record Value</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
