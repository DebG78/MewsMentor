import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { Loader2, GitCompareArrows } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { getAllCohorts } from '@/lib/supabaseService';
import type { Cohort } from '@/types/mentoring';
import { compareCohortMetrics } from '@/lib/metricsService';
import { METRIC_LABELS } from '@/types/metrics';
import type { CohortComparison as CohortComparisonType } from '@/types/metrics';
import { computeMentorLoadBalance, computeTopicCoverage } from '@/lib/analyticsComputeService';

const comparisonChartConfig = {
  actual_value: { label: 'Actual', color: 'hsl(221, 83%, 53%)' },
  target_value: { label: 'Target', color: 'hsl(0, 0%, 65%)' },
} satisfies ChartConfig;

const RADAR_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)',
  'hsl(280, 67%, 55%)',
  'hsl(45, 93%, 47%)',
];

export default function CohortComparison() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>('session_completion_rate');
  const [comparisonData, setComparisonData] = useState<CohortComparisonType[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (cohorts.length > 0 && selectedMetric) {
      loadComparison();
    }
  }, [cohorts, selectedMetric]);

  const loadCohorts = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load cohorts', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadComparison = async () => {
    setIsComparing(true);
    try {
      const cohortIds = cohorts.map(c => c.id);
      const data = await compareCohortMetrics(cohortIds, selectedMetric);
      setComparisonData(data);
    } catch {
      // Comparison data may not exist yet
      setComparisonData([]);
    } finally {
      setIsComparing(false);
    }
  };

  const loadBalance = useMemo(() => computeMentorLoadBalance(cohorts), [cohorts]);
  const topicCoverage = useMemo(() => computeTopicCoverage(cohorts), [cohorts]);

  // Cohort stats summary
  const cohortStats = useMemo(() => {
    return cohorts
      .filter(c => c.status === 'active' || c.status === 'completed')
      .map(cohort => {
        const matchCount = cohort.matches?.results?.filter(
          r => r.proposed_assignment?.mentor_id
        ).length || 0;

        const avgScore = cohort.matches?.stats
          ? Math.round((cohort.matches.stats as { avg_score?: number }).avg_score || 0)
          : null;

        const lb = loadBalance.find(l => l.cohort_id === cohort.id);
        const tc = topicCoverage.find(t => t.cohort_id === cohort.id);

        return {
          id: cohort.id,
          name: cohort.name,
          status: cohort.status,
          mentees: cohort.mentees.length,
          mentors: cohort.mentors.length,
          pairs: matchCount,
          avgMatchScore: avgScore,
          loadBalance: lb?.balance || '-',
          topicCoverage: tc?.coverageRate || 0,
        };
      });
  }, [cohorts, loadBalance, topicCoverage]);

  // Radar chart data for topic coverage + match quality
  const radarData = useMemo(() => {
    if (cohortStats.length === 0) return [];
    const metrics = ['Mentees', 'Mentors', 'Pairs', 'Topic Coverage'];

    return metrics.map(metric => {
      const point: Record<string, string | number> = { metric };
      for (const cs of cohortStats.slice(0, 5)) {
        switch (metric) {
          case 'Mentees': point[cs.name] = cs.mentees; break;
          case 'Mentors': point[cs.name] = cs.mentors; break;
          case 'Pairs': point[cs.name] = cs.pairs; break;
          case 'Topic Coverage': point[cs.name] = cs.topicCoverage; break;
        }
      }
      return point;
    });
  }, [cohortStats]);

  const radarConfig = useMemo(() => {
    const config: ChartConfig = {};
    cohortStats.slice(0, 5).forEach((cs, i) => {
      config[cs.name] = { label: cs.name, color: RADAR_COLORS[i % RADAR_COLORS.length] };
    });
    return config;
  }, [cohortStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cohort Comparison</h1>
        <p className="text-muted-foreground">
          Compare performance and metrics across cohorts
        </p>
      </div>

      {/* Side-by-side Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cohort Overview</CardTitle>
          <CardDescription>Side-by-side comparison of key stats</CardDescription>
        </CardHeader>
        <CardContent>
          {cohortStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Mentees</TableHead>
                  <TableHead className="text-center">Mentors</TableHead>
                  <TableHead className="text-center">Pairs</TableHead>
                  <TableHead className="text-center">Avg Match Score</TableHead>
                  <TableHead className="text-center">Topic Coverage</TableHead>
                  <TableHead className="text-center">Load Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohortStats.map(cs => (
                  <TableRow key={cs.id}>
                    <TableCell className="font-medium">{cs.name}</TableCell>
                    <TableCell>
                      <Badge variant={cs.status === 'active' ? 'default' : 'secondary'}>
                        {cs.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{cs.mentees}</TableCell>
                    <TableCell className="text-center">{cs.mentors}</TableCell>
                    <TableCell className="text-center">{cs.pairs}</TableCell>
                    <TableCell className="text-center">
                      {cs.avgMatchScore !== null ? cs.avgMatchScore : '-'}
                    </TableCell>
                    <TableCell className="text-center">{cs.topicCoverage}%</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          cs.loadBalance === 'balanced' ? 'border-green-500 text-green-600'
                          : cs.loadBalance === 'moderate' ? 'border-yellow-500 text-yellow-600'
                          : cs.loadBalance === 'unbalanced' ? 'border-red-500 text-red-600'
                          : ''
                        }
                      >
                        {cs.loadBalance}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <GitCompareArrows className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active or completed cohorts to compare</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metric Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metric Comparison</CardTitle>
            <CardDescription>Compare a specific metric across cohorts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>Select Metric</Label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isComparing ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : comparisonData.length > 0 ? (
              <ChartContainer config={comparisonChartConfig} className="h-[250px] w-full">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cohort_name" fontSize={11} />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="actual_value" fill="var(--color-actual_value)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target_value" fill="var(--color-target_value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No metric data available. Record metric snapshots to see comparisons.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radar Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cohort Radar</CardTitle>
            <CardDescription>Multi-dimensional comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 && cohortStats.length > 0 ? (
              <ChartContainer config={radarConfig} className="h-[300px] w-full">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" fontSize={11} />
                  <PolarRadiusAxis fontSize={10} />
                  {cohortStats.slice(0, 5).map((cs, i) => (
                    <Radar
                      key={cs.id}
                      name={cs.name}
                      dataKey={cs.name}
                      stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fillOpacity={0.1}
                    />
                  ))}
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No cohort data for radar comparison
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
