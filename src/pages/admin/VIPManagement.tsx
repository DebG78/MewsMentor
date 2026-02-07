import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Star,
  Crown,
  Award,
  Medal,
  Users,
  TrendingUp,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
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
import type {
  VIPScore,
  VIPRule,
  VIPSummary,
  LeaderboardEntry,
} from '@/types/vip';
import { SCORE_COMPONENTS, getVIPTier } from '@/types/vip';
import {
  getVIPScores,
  getVIPRules,
  getVIPSummary,
  getLeaderboard,
  toggleVIPStatus,
  applyVIPRules,
  createVIPRule,
  updateVIPRule,
  deleteVIPRule,
} from '@/lib/vipService';
import { getAllCohorts } from '@/lib/supabaseService';
import { cn } from '@/lib/utils';

const tierDonutConfig = {
  platinum: { label: 'Platinum', color: 'hsl(215, 14%, 50%)' },
  gold: { label: 'Gold', color: 'hsl(45, 93%, 47%)' },
  silver: { label: 'Silver', color: 'hsl(0, 0%, 65%)' },
  bronze: { label: 'Bronze', color: 'hsl(30, 75%, 45%)' },
  none: { label: 'Standard', color: 'hsl(0, 0%, 80%)' },
} satisfies ChartConfig;

const scoreHistogramConfig = {
  count: { label: 'Participants', color: 'hsl(221, 83%, 53%)' },
} satisfies ChartConfig;

const radarConfig = {
  participant: { label: 'Participant', color: 'hsl(221, 83%, 53%)' },
  average: { label: 'Cohort Average', color: 'hsl(0, 0%, 60%)' },
} satisfies ChartConfig;

export default function VIPManagement() {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [scores, setScores] = useState<VIPScore[]>([]);
  const [rules, setRules] = useState<VIPRule[]>([]);
  const [summary, setSummary] = useState<VIPSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyingRules, setIsApplyingRules] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<'all' | 'vip' | 'non_vip'>('all');

  // Selected participant for radar chart
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');

  // Rule dialog
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<VIPRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleConditionType, setRuleConditionType] = useState<'score_threshold' | 'component_threshold'>('score_threshold');
  const [ruleThreshold, setRuleThreshold] = useState('80');
  const [ruleAppliesTo, setRuleAppliesTo] = useState<'both' | 'mentor' | 'mentee'>('both');

  // Chart data computed from scores
  const tierDonutData = useMemo(() => {
    if (scores.length === 0) return [];
    const tiers = { platinum: 0, gold: 0, silver: 0, bronze: 0, none: 0 };
    for (const score of scores) {
      const tier = getVIPTier(score.total_score).tier;
      tiers[tier]++;
    }
    return Object.entries(tiers)
      .filter(([, count]) => count > 0)
      .map(([tier, count]) => ({
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        value: count,
        fill: `var(--color-${tier})`,
      }));
  }, [scores]);

  const scoreHistogramData = useMemo(() => {
    if (scores.length === 0) return [];
    const buckets = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];
    for (const score of scores) {
      const bucket = buckets.find(b => score.total_score >= b.min && score.total_score <= b.max);
      if (bucket) bucket.count++;
    }
    return buckets;
  }, [scores]);

  const radarData = useMemo(() => {
    if (scores.length === 0) return [];
    const avgEngagement = scores.reduce((s, sc) => s + sc.engagement_score, 0) / scores.length;
    const avgSession = scores.reduce((s, sc) => s + sc.session_score, 0) / scores.length;
    const avgResponse = scores.reduce((s, sc) => s + sc.response_score, 0) / scores.length;
    const avgFeedback = scores.reduce((s, sc) => s + sc.feedback_score, 0) / scores.length;

    const selected = selectedParticipant
      ? scores.find(s => s.id === selectedParticipant)
      : null;

    return [
      {
        component: 'Engagement',
        average: Math.round(avgEngagement * 10) / 10,
        participant: selected?.engagement_score ?? avgEngagement,
        fullMark: 25,
      },
      {
        component: 'Sessions',
        average: Math.round(avgSession * 10) / 10,
        participant: selected?.session_score ?? avgSession,
        fullMark: 25,
      },
      {
        component: 'Response',
        average: Math.round(avgResponse * 10) / 10,
        participant: selected?.response_score ?? avgResponse,
        fullMark: 25,
      },
      {
        component: 'Feedback',
        average: Math.round(avgFeedback * 10) / 10,
        participant: selected?.feedback_score ?? avgFeedback,
        fullMark: 25,
      },
    ];
  }, [scores, selectedParticipant]);

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    if (selectedCohort) {
      loadData();
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

  const loadData = async () => {
    if (!selectedCohort) return;

    setIsLoading(true);
    try {
      const [scoresData, rulesData, summaryData, leaderboardData] = await Promise.all([
        getVIPScores(selectedCohort),
        getVIPRules(),
        getVIPSummary(selectedCohort),
        getLeaderboard(selectedCohort, 10),
      ]);
      setScores(scoresData);
      setRules(rulesData);
      setSummary(summaryData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load VIP data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRules = async () => {
    if (!selectedCohort) return;

    setIsApplyingRules(true);
    try {
      await applyVIPRules(selectedCohort);
      toast({
        title: 'Success',
        description: 'VIP rules applied successfully',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply VIP rules',
        variant: 'destructive',
      });
    } finally {
      setIsApplyingRules(false);
    }
  };

  const handleToggleVIP = async (score: VIPScore) => {
    try {
      await toggleVIPStatus(
        score.id,
        !score.is_vip,
        !score.is_vip ? 'Manual override' : undefined
      );
      toast({
        title: 'Success',
        description: `VIP status ${score.is_vip ? 'removed' : 'granted'}`,
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update VIP status',
        variant: 'destructive',
      });
    }
  };

  const handleSaveRule = async () => {
    if (!ruleName.trim()) return;

    try {
      const conditionConfig = {
        threshold: parseFloat(ruleThreshold),
        score_type: 'total' as const,
      };

      if (editingRule) {
        await updateVIPRule(editingRule.id, {
          rule_name: ruleName,
          description: ruleDescription,
          condition_type: ruleConditionType,
          condition_config: conditionConfig,
          applies_to: ruleAppliesTo,
        });
        toast({ title: 'Rule updated' });
      } else {
        await createVIPRule({
          rule_name: ruleName,
          description: ruleDescription,
          condition_type: ruleConditionType,
          condition_config: conditionConfig,
          applies_to: ruleAppliesTo,
        });
        toast({ title: 'Rule created' });
      }

      setIsRuleDialogOpen(false);
      resetRuleForm();
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save rule',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteVIPRule(ruleId);
      toast({ title: 'Rule deleted' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive',
      });
    }
  };

  const handleToggleRuleActive = async (rule: VIPRule) => {
    try {
      await updateVIPRule(rule.id, { is_active: !rule.is_active });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive',
      });
    }
  };

  const resetRuleForm = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDescription('');
    setRuleConditionType('score_threshold');
    setRuleThreshold('80');
    setRuleAppliesTo('both');
  };

  const openEditRule = (rule: VIPRule) => {
    setEditingRule(rule);
    setRuleName(rule.rule_name);
    setRuleDescription(rule.description || '');
    setRuleConditionType(rule.condition_type as 'score_threshold' | 'component_threshold');
    setRuleThreshold(String(rule.condition_config.threshold || 80));
    setRuleAppliesTo(rule.applies_to);
    setIsRuleDialogOpen(true);
  };

  const filteredScores = scores.filter(score => {
    if (filterType === 'vip') return score.is_vip;
    if (filterType === 'non_vip') return !score.is_vip;
    return true;
  });

  const getScoreBar = (score: number, max: number, color: string) => (
    <div className="flex items-center gap-2">
      <Progress value={(score / max) * 100} className={cn('h-2 flex-1', `[&>div]:${color}`)} />
      <span className="text-xs font-mono w-8">{score.toFixed(0)}</span>
    </div>
  );

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
          <h1 className="text-2xl font-bold">VIP Management</h1>
          <p className="text-muted-foreground">
            Track engagement scores and manage VIP status
          </p>
        </div>
        <Button onClick={handleApplyRules} disabled={isApplyingRules}>
          {isApplyingRules ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Apply VIP Rules
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="rules">VIP Rules</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Participants</p>
                        <p className="text-3xl font-bold">{summary.total_participants}</p>
                      </div>
                      <Users className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total VIPs</p>
                        <p className="text-3xl font-bold text-yellow-600">{summary.total_vips}</p>
                      </div>
                      <Crown className="w-10 h-10 text-yellow-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">VIP Mentors</p>
                        <p className="text-3xl font-bold">{summary.vip_mentors}</p>
                      </div>
                      <Star className="w-10 h-10 text-blue-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">VIP Mentees</p>
                        <p className="text-3xl font-bold">{summary.vip_mentees}</p>
                      </div>
                      <Award className="w-10 h-10 text-green-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts Row */}
            {scores.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score Distribution Histogram */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Distribution</CardTitle>
                    <CardDescription>Participants by score range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={scoreHistogramConfig} className="h-[220px] w-full">
                      <BarChart data={scoreHistogramData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" fontSize={12} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="count"
                          fill="var(--color-count)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* VIP Tier Donut */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">VIP Tier Distribution</CardTitle>
                    <CardDescription>Breakdown by tier level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tierDonutData.length > 0 ? (
                      <ChartContainer config={tierDonutConfig} className="h-[220px] w-full">
                        <PieChart>
                          <Pie
                            data={tierDonutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {tierDonutData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                        No tier data
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {tierDonutData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: d.fill.startsWith('var') ? undefined : d.fill }}
                          />
                          <span>{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Score Component Radar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Components</CardTitle>
                    <CardDescription>
                      {selectedParticipant ? 'Participant vs cohort average' : 'Cohort average across components'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2">
                      <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select participant to compare" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Cohort Average Only</SelectItem>
                          {scores.slice(0, 20).map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.person_id.slice(0, 8)}... ({s.person_type}) - {s.total_score.toFixed(0)}pts
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ChartContainer config={radarConfig} className="h-[200px] w-full">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="component" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 25]} fontSize={10} />
                        <Radar
                          name="Cohort Avg"
                          dataKey="average"
                          stroke="var(--color-average)"
                          fill="var(--color-average)"
                          fillOpacity={0.2}
                        />
                        {selectedParticipant && (
                          <Radar
                            name="Participant"
                            dataKey="participant"
                            stroke="var(--color-participant)"
                            fill="var(--color-participant)"
                            fillOpacity={0.3}
                          />
                        )}
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RadarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="w-5 h-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>Highest scoring participants</CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No scores recorded yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Total Score</TableHead>
                        <TableHead>Score Breakdown</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map(entry => {
                        const tier = getVIPTier(entry.total_score);
                        return (
                          <TableRow key={entry.person_id}>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                {entry.rank === 1 && <Crown className="w-5 h-5 text-yellow-500" />}
                                {entry.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                                {entry.rank === 3 && <Medal className="w-5 h-5 text-amber-600" />}
                                {entry.rank > 3 && <span className="font-mono">{entry.rank}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {entry.person_name || entry.person_id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {entry.person_type === 'mentor' ? 'Mentor' : 'Mentee'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-lg font-bold">{entry.total_score.toFixed(0)}</span>
                              <span className="text-muted-foreground">/100</span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-20">Engagement</span>
                                  {getScoreBar(entry.engagement_score, 25, 'bg-blue-500')}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-20">Sessions</span>
                                  {getScoreBar(entry.session_score, 25, 'bg-green-500')}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {entry.is_vip ? (
                                <Badge className={cn(tier.color, 'text-white')}>
                                  {tier.label}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Standard</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            <div className="flex items-center gap-2">
              <Label>Filter:</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Participants</SelectItem>
                  <SelectItem value="vip">VIPs Only</SelectItem>
                  <SelectItem value="non_vip">Non-VIPs Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Participants ({filteredScores.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredScores.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No participants found
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Engagement</TableHead>
                        <TableHead className="text-center">Sessions</TableHead>
                        <TableHead className="text-center">Response</TableHead>
                        <TableHead className="text-center">Feedback</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">VIP</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScores.map(score => (
                        <TableRow key={score.id}>
                          <TableCell className="font-medium">
                            {score.person_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {score.person_type === 'mentor' ? 'Mentor' : 'Mentee'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {score.engagement_score.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {score.session_score.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {score.response_score.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {score.feedback_score.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {score.total_score.toFixed(0)}
                          </TableCell>
                          <TableCell className="text-center">
                            {score.is_vip ? (
                              <Badge className="bg-yellow-500">VIP</Badge>
                            ) : (
                              <Badge variant="secondary">-</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleVIP(score)}
                            >
                              {score.is_vip ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsRuleDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">VIP Rules</CardTitle>
                <CardDescription>
                  Configure automatic VIP assignment criteria
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rules.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No VIP rules configured
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule Name</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Applies To</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map(rule => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{rule.rule_name}</span>
                              {rule.description && (
                                <p className="text-xs text-muted-foreground">
                                  {rule.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rule.condition_type === 'score_threshold'
                                ? `Score >= ${rule.condition_config.threshold}`
                                : `${rule.condition_config.component} >= ${rule.condition_config.threshold}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {rule.applies_to === 'both'
                                ? 'All'
                                : rule.applies_to === 'mentor'
                                ? 'Mentors'
                                : 'Mentees'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={() => handleToggleRuleActive(rule)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditRule(rule)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
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
      )}

      {/* Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create VIP Rule'}</DialogTitle>
            <DialogDescription>
              Define criteria for automatic VIP status assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., High Performer"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Describe this rule..."
              />
            </div>
            <div className="space-y-2">
              <Label>Condition Type</Label>
              <Select value={ruleConditionType} onValueChange={(v) => setRuleConditionType(v as typeof ruleConditionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score_threshold">Total Score Threshold</SelectItem>
                  <SelectItem value="component_threshold">Component Threshold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Threshold Value</Label>
              <Input
                type="number"
                value={ruleThreshold}
                onChange={(e) => setRuleThreshold(e.target.value)}
                placeholder="80"
              />
            </div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={ruleAppliesTo} onValueChange={(v) => setRuleAppliesTo(v as typeof ruleAppliesTo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both Mentors & Mentees</SelectItem>
                  <SelectItem value="mentor">Mentors Only</SelectItem>
                  <SelectItem value="mentee">Mentees Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRuleDialogOpen(false); resetRuleForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
