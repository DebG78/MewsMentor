import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Activity,
  Heart,
  CheckCircle,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Plus,
  Target,
  BarChart3,
} from 'lucide-react';
import type {
  MetricWithStatus,
  MetricsDashboardSummary,
  MetricCategory,
  SuccessTarget,
  TrendDataPoint,
} from '@/types/metrics';
import {
  METRIC_CATEGORY_METADATA,
  METRIC_LABELS,
  formatMetricValue,
} from '@/types/metrics';
import {
  getMetricsDashboardSummary,
  getMetricsWithStatus,
  getSuccessTargets,
  createMetricSnapshot,
  getMetricTrend,
} from '@/lib/metricsService';
import { getAllCohorts } from '@/lib/supabaseService';
import { cn } from '@/lib/utils';

// Category icons mapping
const categoryIcons: Record<MetricCategory, React.ComponentType<{ className?: string }>> = {
  engagement: Activity,
  satisfaction: Heart,
  completion: CheckCircle,
  retention: Users,
};

export default function SuccessMetricsDashboard() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [summary, setSummary] = useState<MetricsDashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<MetricWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');

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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cohorts',
        variant: 'destructive',
      });
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load metrics',
        variant: 'destructive',
      });
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
      toast({
        title: 'Success',
        description: 'Metric value recorded',
      });
      setIsRecordDialogOpen(false);
      setRecordValue('');
      setSelectedMetricForRecord(null);
      loadMetrics();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record value',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Badge className="bg-green-500">On Track</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-500">Critical</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const filteredMetrics = selectedCategory === 'all'
    ? metrics
    : metrics.filter(m => m.target.metric_category === selectedCategory);

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
          <h1 className="text-2xl font-bold">Success Metrics</h1>
          <p className="text-muted-foreground">
            Track program performance against targets
          </p>
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

          {/* Category Overview */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
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
                          <span className="font-medium">{meta.label}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Avg Performance</span>
                            <span className="font-medium">{cat.averagePerformance}%</span>
                          </div>
                          <Progress value={cat.averagePerformance} className="h-2" />
                          <div className="flex gap-2 text-xs">
                            <span className="text-green-600">{cat.onTrack} on track</span>
                            <span className="text-yellow-600">{cat.warning} warning</span>
                            <span className="text-red-600">{cat.critical} critical</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metrics Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">All Metrics</CardTitle>
                  <CardDescription>
                    {filteredMetrics.length} metric(s) displayed
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
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
                      return (
                        <TableRow key={metric.target.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {METRIC_LABELS[metric.target.metric_name] || metric.target.metric_name}
                              </span>
                              {metric.target.description && (
                                <p className="text-xs text-muted-foreground">
                                  {metric.target.description}
                                </p>
                              )}
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
                              onClick={() => {
                                setSelectedMetricForRecord(metric.target);
                                setIsRecordDialogOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Record
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Needs Attention */}
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
        </>
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
            <Button variant="outline" onClick={() => setIsRecordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordValue}>Record Value</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
