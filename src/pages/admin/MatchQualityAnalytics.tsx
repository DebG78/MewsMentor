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
import { Loader2, Target, AlertTriangle } from 'lucide-react';
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
  getMatchScoreDistribution,
  getFeatureContributions,
} from '@/lib/peopleAnalyticsService';

const scoreDistConfig = {
  count: { label: 'Matches', color: 'hsl(221, 83%, 53%)' },
} satisfies ChartConfig;

const featureConfig = {
  avgValue: { label: 'Avg Score (%)', color: 'hsl(45, 93%, 47%)' },
} satisfies ChartConfig;

const riskConfig = {
  count: { label: 'Occurrences', color: 'hsl(0, 84%, 60%)' },
} satisfies ChartConfig;

interface RiskFrequency {
  risk: string;
  count: number;
}

function getRiskFrequency(cohort: Cohort): RiskFrequency[] {
  if (!cohort.matches?.results) return [];

  const riskMap = new Map<string, number>();

  for (const result of cohort.matches.results) {
    if (result.proposed_assignment?.mentor_id) {
      const rec = result.recommendations.find(
        r => r.mentor_id === result.proposed_assignment?.mentor_id
      );
      if (rec?.score.risks) {
        for (const risk of rec.score.risks) {
          riskMap.set(risk, (riskMap.get(risk) || 0) + 1);
        }
      }
    }
  }

  return Array.from(riskMap.entries())
    .map(([risk, count]) => ({ risk, count }))
    .sort((a, b) => b.count - a.count);
}

interface MatchDetail {
  mentee_id: string;
  mentee_name: string;
  mentor_id: string;
  mentor_name: string;
  score: number;
  topReason: string;
  riskCount: number;
  wasTopPick: boolean;
}

function getMatchDetails(cohort: Cohort): MatchDetail[] {
  if (!cohort.matches?.results) return [];

  return cohort.matches.results
    .filter(r => r.proposed_assignment?.mentor_id)
    .map(result => {
      const rec = result.recommendations.find(
        r => r.mentor_id === result.proposed_assignment?.mentor_id
      );
      const topRec = result.recommendations[0];
      const wasTopPick = topRec?.mentor_id === result.proposed_assignment?.mentor_id;

      return {
        mentee_id: result.mentee_id,
        mentee_name: result.mentee_name || result.mentee_id.slice(0, 8),
        mentor_id: result.proposed_assignment!.mentor_id!,
        mentor_name: rec?.mentor_name || result.proposed_assignment!.mentor_id!.slice(0, 8),
        score: rec?.score.total_score || 0,
        topReason: rec?.score.reasons?.[0] || '-',
        riskCount: rec?.score.risks?.length || 0,
        wasTopPick,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export default function MatchQualityAnalytics() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCohort, setSelectedCohort] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getAllCohorts();
      setCohorts(data);
      const withMatches = data.find(c => c.matches?.results && c.matches.results.length > 0);
      if (withMatches) setSelectedCohort(withMatches.id);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const cohort = cohorts.find(c => c.id === selectedCohort);
  const scoreDist = useMemo(() => cohort ? getMatchScoreDistribution(cohort) : [], [cohort]);
  const features = useMemo(() => cohort ? getFeatureContributions(cohort) : [], [cohort]);
  const risks = useMemo(() => cohort ? getRiskFrequency(cohort) : [], [cohort]);
  const matchDetails = useMemo(() => cohort ? getMatchDetails(cohort) : [], [cohort]);

  const matchStats = useMemo(() => {
    if (matchDetails.length === 0) return null;
    const scores = matchDetails.map(m => m.score);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const topPicks = matchDetails.filter(m => m.wasTopPick).length;
    const withRisks = matchDetails.filter(m => m.riskCount > 0).length;
    return {
      totalMatches: matchDetails.length,
      avgScore: Math.round(avg),
      minScore: Math.round(Math.min(...scores)),
      maxScore: Math.round(Math.max(...scores)),
      topPickRate: Math.round((topPicks / matchDetails.length) * 100),
      riskRate: Math.round((withRisks / matchDetails.length) * 100),
    };
  }, [matchDetails]);

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
        <h1 className="text-2xl font-bold">Match Quality Analytics</h1>
        <p className="text-muted-foreground">
          Deep-dive into matching algorithm effectiveness
        </p>
      </div>

      {/* Cohort Selector */}
      <div className="w-64">
        <Label>Select Cohort</Label>
        <Select value={selectedCohort} onValueChange={setSelectedCohort}>
          <SelectTrigger>
            <SelectValue placeholder="Select cohort with matches" />
          </SelectTrigger>
          <SelectContent>
            {cohorts
              .filter(c => c.matches?.results && c.matches.results.length > 0)
              .map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {!cohort || !cohort.matches?.results ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a cohort with match data to view analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          {matchStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold">{matchStats.totalMatches}</div>
                  <div className="text-xs text-muted-foreground">Total Matches</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold">{matchStats.avgScore}</div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold">{matchStats.minScore}-{matchStats.maxScore}</div>
                  <div className="text-xs text-muted-foreground">Score Range</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{matchStats.topPickRate}%</div>
                  <div className="text-xs text-muted-foreground">Top Pick Rate</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{matchStats.riskRate}%</div>
                  <div className="text-xs text-muted-foreground">With Risks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold">{risks.length}</div>
                  <div className="text-xs text-muted-foreground">Unique Risk Types</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Distribution</CardTitle>
                <CardDescription>How match scores are distributed</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={scoreDistConfig} className="h-[250px] w-full">
                  <BarChart data={scoreDist}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Feature Contributions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feature Contributions</CardTitle>
                <CardDescription>Which matching criteria drive scores</CardDescription>
              </CardHeader>
              <CardContent>
                {features.length > 0 ? (
                  <ChartContainer config={featureConfig} className="h-[250px] w-full">
                    <BarChart data={features} layout="vertical">
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

          {/* Common Risks */}
          {risks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Common Risks
                </CardTitle>
                <CardDescription>Most frequently flagged risks in matches</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={riskConfig} className="h-[250px] w-full">
                  <BarChart data={risks.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="risk" width={200} fontSize={10} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Match Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Matches</CardTitle>
              <CardDescription>
                Detailed breakdown of each match assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentee</TableHead>
                    <TableHead>Mentor</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Top Reason</TableHead>
                    <TableHead className="text-center">Risks</TableHead>
                    <TableHead className="text-center">Top Pick?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchDetails.map(m => (
                    <TableRow key={`${m.mentee_id}:${m.mentor_id}`}>
                      <TableCell className="font-medium">{m.mentee_name}</TableCell>
                      <TableCell>{m.mentor_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            m.score >= 70 ? 'border-green-500 text-green-600'
                            : m.score >= 50 ? 'border-yellow-500 text-yellow-600'
                            : 'border-red-500 text-red-600'
                          }
                        >
                          {Math.round(m.score)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {m.topReason}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.riskCount > 0 ? (
                          <Badge className="bg-yellow-500">{m.riskCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.wasTopPick ? (
                          <Badge className="bg-green-500">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
