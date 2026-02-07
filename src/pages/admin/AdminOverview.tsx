import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Target, UserCog, Users, Calendar, ArrowRight, BarChart3, ShieldAlert, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { getAllCohorts } from "@/lib/supabaseService";
import { getAggregateCheckInSummary } from "@/lib/checkInService";
import type { Cohort } from "@/types/mentoring";
import type { CheckInSummary } from "@/types/checkIns";

interface OverviewStats {
  activeCohorts: number;
  activePairs: number;
  unassignedMentees: number;
  totalMentors: number;
  totalMentees: number;
}

const cohortStatusConfig = {
  active: { label: "Active", color: "hsl(142, 76%, 46%)" },
  draft: { label: "Draft", color: "hsl(214, 84%, 56%)" },
  completed: { label: "Completed", color: "hsl(262, 83%, 58%)" },
  paused: { label: "Paused", color: "hsl(38, 92%, 50%)" },
} satisfies ChartConfig;

const riskConfig = {
  green: { label: "Healthy", color: "hsl(142, 76%, 46%)" },
  amber: { label: "At Risk", color: "hsl(38, 92%, 50%)" },
  red: { label: "Critical", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig;

const capacityConfig = {
  assigned: { label: "Assigned", color: "hsl(214, 84%, 56%)" },
  available: { label: "Available", color: "hsl(214, 20%, 85%)" },
} satisfies ChartConfig;

export default function AdminOverview() {
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [stats, setStats] = useState<OverviewStats>({
    activeCohorts: 0,
    activePairs: 0,
    unassignedMentees: 0,
    totalMentors: 0,
    totalMentees: 0,
  });
  const [riskSummary, setRiskSummary] = useState<CheckInSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allCohorts = await getAllCohorts();
        setCohorts(allCohorts);

        const activeCohorts = allCohorts.filter(c => c.status === 'active');
        let totalMentors = 0;
        let totalMentees = 0;
        let activePairs = 0;
        let unassignedMentees = 0;

        allCohorts.forEach(cohort => {
          totalMentors += cohort.mentors?.length || 0;
          totalMentees += cohort.mentees?.length || 0;

          if (cohort.status === 'active' && cohort.matches?.results) {
            activePairs += cohort.matches.results.filter(r => r.proposed_assignment?.mentor_id).length;
          }

          if (cohort.status === 'active') {
            const matchedMenteeIds = new Set(
              cohort.matches?.results?.map(r => r.mentee_id) || []
            );
            unassignedMentees += (cohort.mentees || []).filter(
              m => !matchedMenteeIds.has(m.id)
            ).length;
          }
        });

        setStats({
          activeCohorts: activeCohorts.length,
          activePairs,
          unassignedMentees,
          totalMentors,
          totalMentees,
        });

        // Load aggregate risk summary for active cohorts
        if (activeCohorts.length > 0) {
          try {
            const risk = await getAggregateCheckInSummary(activeCohorts.map(c => c.id));
            setRiskSummary(risk);
          } catch {
            // Check-ins may not exist yet
          }
        }
      } catch (error) {
        console.error("Error loading overview data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute chart data
  const cohortStatusData = useMemo(() => {
    const counts: Record<string, number> = { active: 0, draft: 0, completed: 0, paused: 0 };
    cohorts.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count,
        fill: cohortStatusConfig[status as keyof typeof cohortStatusConfig]?.color || "hsl(0,0%,70%)",
      }));
  }, [cohorts]);

  const capacityData = useMemo(() => {
    const activeCohorts = cohorts.filter(c => c.status === 'active');
    return activeCohorts.map(cohort => {
      const totalCapacity = (cohort.mentors || []).reduce((sum, m) => sum + (m.capacity || 1), 0);
      const assignedCount = cohort.matches?.results?.filter(r => r.proposed_assignment?.mentor_id).length || 0;
      return {
        name: cohort.name.length > 15 ? cohort.name.substring(0, 15) + '...' : cohort.name,
        assigned: assignedCount,
        available: Math.max(0, totalCapacity - assignedCount),
      };
    }).filter(d => d.assigned > 0 || d.available > 0);
  }, [cohorts]);

  const riskData = useMemo(() => {
    if (!riskSummary || riskSummary.total === 0) return [];
    return [
      { name: "green", value: riskSummary.green, fill: riskConfig.green.color },
      { name: "amber", value: riskSummary.amber, fill: riskConfig.amber.color },
      { name: "red", value: riskSummary.red, fill: riskConfig.red.color },
    ].filter(d => d.value > 0);
  }, [riskSummary]);

  const getStatusBadge = (status: Cohort['status']) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      active: { variant: "default", label: "Active" },
      draft: { variant: "secondary", label: "Draft" },
      completed: { variant: "outline", label: "Completed" },
      paused: { variant: "outline", label: "Paused" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const recentCohorts = [...cohorts]
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Program health at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Active Cohorts", value: stats.activeCohorts, icon: Target, color: "text-blue-600" },
          { label: "Active Pairs", value: stats.activePairs, icon: Users, color: "text-green-600" },
          { label: "Unassigned", value: stats.unassignedMentees, icon: ShieldAlert, color: stats.unassignedMentees > 0 ? "text-amber-600" : "text-muted-foreground" },
          { label: "Mentors", value: stats.totalMentors, icon: UserCog, color: "text-purple-600" },
          { label: "Mentees", value: stats.totalMentees, icon: Users, color: "text-pink-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{isLoading ? "..." : value}</p>
                </div>
                <Icon className={`w-8 h-8 opacity-40 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Cohort Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Cohort Status
            </CardTitle>
            <CardDescription>{cohorts.length} total cohorts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || cohortStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                {isLoading ? "Loading..." : "No cohorts yet"}
              </div>
            ) : (
              <ChartContainer config={cohortStatusConfig} className="h-48 w-full">
                <PieChart>
                  <Pie
                    data={cohortStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {cohortStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" />}
                  />
                </PieChart>
              </ChartContainer>
            )}
            {!isLoading && cohortStatusData.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {cohortStatusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.fill }} />
                    <span className="capitalize">{d.name}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mentor Capacity Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Mentor Capacity
            </CardTitle>
            <CardDescription>Assigned vs available slots</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || capacityData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                {isLoading ? "Loading..." : "No active cohorts"}
              </div>
            ) : (
              <ChartContainer config={capacityConfig} className="h-48 w-full">
                <BarChart data={capacityData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="assigned" stackId="a" fill="var(--color-assigned)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="available" stackId="a" fill="var(--color-available)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Risk Summary Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Check-in Risk
            </CardTitle>
            <CardDescription>Across active cohorts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || riskData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                {isLoading ? "Loading..." : "No check-ins recorded"}
              </div>
            ) : (
              <ChartContainer config={riskConfig} className="h-48 w-full">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" />}
                  />
                </PieChart>
              </ChartContainer>
            )}
            {!isLoading && riskData.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {riskData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                    <span>{riskConfig[d.name as keyof typeof riskConfig]?.label}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Recent Cohorts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/admin/mentoring/cohorts")}>
              <Target className="w-4 h-4 mr-2" /> Manage Cohorts
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/admin/analytics/metrics")}>
              <BarChart3 className="w-4 h-4 mr-2" /> View Success Metrics
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/admin/mentoring/check-ins")}>
              <ShieldAlert className="w-4 h-4 mr-2" /> Check-in Tracker
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/admin/people/analytics")}>
              <TrendingUp className="w-4 h-4 mr-2" /> People Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Recent Cohorts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              Recent Cohorts
            </CardTitle>
            <CardDescription>Latest mentoring cohorts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                <span className="ml-2 text-muted-foreground">Loading...</span>
              </div>
            ) : recentCohorts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No cohorts yet</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/admin/mentoring/cohorts")}>
                  Create First Cohort
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentCohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/mentoring/cohort/${cohort.id}/mentees`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{cohort.name}</span>
                        {getStatusBadge(cohort.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {cohort.mentees?.length || 0} mentees
                        </span>
                        <span>{cohort.mentors?.length || 0} mentors</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
                {cohorts.length > 4 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/admin/mentoring/cohorts")}>
                    View all {cohorts.length} cohorts
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
