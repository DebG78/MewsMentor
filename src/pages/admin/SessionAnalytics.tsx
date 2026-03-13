import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, MessageSquare, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { PageHeader } from '@/components/admin/PageHeader';
import { getAllCohorts } from '@/lib/supabaseService';
import {
  getAllSessions,
  getSessionsByCohort,
  computeRatingsByJourneyStage,
  computeFeedbackByStage,
  computeResponseRates,
  computeSessionVolume,
} from '@/lib/sessionService';
import type { SessionRow } from '@/lib/sessionService';
import type { Cohort } from '@/types/mentoring';

const ratingChartConfig = {
  avgRating: { label: 'Avg Rating', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const volumeChartConfig = {
  completed: { label: 'Completed', color: 'hsl(var(--chart-1))' },
  scheduled: { label: 'Scheduled', color: 'hsl(var(--chart-2))' },
  cancelled: { label: 'Cancelled', color: 'hsl(var(--chart-3))' },
  noShow: { label: 'No Show', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

const feedbackChartConfig = {
  withFeedback: { label: 'With Feedback', color: 'hsl(var(--chart-1))' },
  noFeedback: { label: 'No Feedback', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

const responseChartConfig = {
  rate: { label: 'Rate %', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

export default function SessionAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    getAllCohorts()
      .then(setCohorts)
      .catch(() => toast({ title: 'Error', description: 'Failed to load cohorts', variant: 'destructive' }));
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetchSessions = selectedCohort === 'all'
      ? getAllSessions()
      : getSessionsByCohort(selectedCohort);

    fetchSessions
      .then(setSessions)
      .catch(() => toast({ title: 'Error', description: 'Failed to load sessions', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [selectedCohort]);

  const ratingsByStage = useMemo(() => computeRatingsByJourneyStage(sessions), [sessions]);
  const feedbackByStage = useMemo(() => computeFeedbackByStage(sessions), [sessions]);
  const responseRates = useMemo(() => computeResponseRates(sessions), [sessions]);
  const volumeData = useMemo(() => computeSessionVolume(sessions), [sessions]);

  const avgRating = useMemo(() => {
    const allRatings = sessions
      .flatMap(s => [s.mentee_rating, s.mentor_rating])
      .filter((r): r is number => r !== null);
    return allRatings.length > 0
      ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
      : null;
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Analytics"
        description="Ratings, feedback, and response rates by journey stage"
        actions={
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select cohort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cohorts</SelectItem>
              {cohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sessions</CardDescription>
            <CardTitle className="text-2xl">{sessions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Rating</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-1">
              {avgRating !== null ? avgRating : '—'}
              {avgRating !== null && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rating Response Rate</CardDescription>
            <CardTitle className="text-2xl">{responseRates.ratingRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Feedback Response Rate</CardDescription>
            <CardTitle className="text-2xl">{responseRates.feedbackRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="ratings">
        <TabsList>
          <TabsTrigger value="ratings">Ratings by Stage</TabsTrigger>
          <TabsTrigger value="volume">Session Volume</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="responses">Response Rates</TabsTrigger>
        </TabsList>

        {/* Ratings by Journey Stage */}
        <TabsContent value="ratings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Average Rating by Journey Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ratingsByStage.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No session data available</p>
              ) : (
                <ChartContainer config={ratingChartConfig} className="h-[300px] w-full">
                  <BarChart data={ratingsByStage} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, 5]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgRating" fill="var(--color-avgRating)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ratings Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Journey Stage</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Avg Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratingsByStage.map(row => (
                    <TableRow key={row.phase}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right">{row.sessionCount}</TableCell>
                      <TableCell className="text-right">
                        {row.avgRating !== null ? (
                          <span className="flex items-center justify-end gap-1">
                            {row.avgRating}
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Volume Over Time */}
        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Session Volume Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {volumeData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No session data available</p>
              ) : (
                <ChartContainer config={volumeChartConfig} className="h-[300px] w-full">
                  <BarChart data={volumeData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" />
                    <Bar dataKey="scheduled" stackId="a" fill="var(--color-scheduled)" />
                    <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" />
                    <Bar dataKey="noShow" stackId="a" fill="var(--color-noShow)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Summary by Stage */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedback by Journey Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackByStage.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No session data available</p>
              ) : (
                <ChartContainer config={feedbackChartConfig} className="h-[300px] w-full">
                  <BarChart
                    data={feedbackByStage.map(f => ({
                      label: f.label,
                      withFeedback: f.withFeedback,
                      noFeedback: f.totalSessions - f.withFeedback,
                    }))}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="withFeedback" stackId="a" fill="var(--color-withFeedback)" />
                    <Bar dataKey="noFeedback" stackId="a" fill="var(--color-noFeedback)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Feedback table with recent comments */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Journey Stage</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">With Feedback</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackByStage.map(row => (
                    <TableRow key={row.phase}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right">{row.totalSessions}</TableCell>
                      <TableCell className="text-right">{row.withFeedback}</TableCell>
                      <TableCell className="text-right">{row.feedbackRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent feedback comments */}
          {feedbackByStage.some(f => f.recentFeedback.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedbackByStage
                  .filter(f => f.recentFeedback.length > 0)
                  .map(stage => (
                    <div key={stage.phase}>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">{stage.label}</h4>
                      <div className="space-y-2">
                        {stage.recentFeedback.map((fb, i) => (
                          <div key={i} className="bg-muted rounded-md p-3 text-sm">
                            "{fb}"
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Response Rates */}
        <TabsContent value="responses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Response Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={responseChartConfig} className="h-[250px] w-full">
                  <BarChart
                    data={[
                      { metric: 'Rating', rate: responseRates.ratingRate },
                      { metric: 'Feedback', rate: responseRates.feedbackRate },
                    ]}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="rate" fill="var(--color-rate)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Total Sessions</TableCell>
                      <TableCell className="text-right">{responseRates.totalSessions}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">With Rating</TableCell>
                      <TableCell className="text-right">{responseRates.withRating}</TableCell>
                      <TableCell className="text-right">{responseRates.ratingRate}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">With Feedback</TableCell>
                      <TableCell className="text-right">{responseRates.withFeedback}</TableCell>
                      <TableCell className="text-right">{responseRates.feedbackRate}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
