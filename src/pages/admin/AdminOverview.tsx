import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Target, UserCog, Users, ArrowRight, ShieldAlert } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useNavigate } from "react-router-dom";
import { getAllCohorts } from "@/lib/supabaseService";
import type { Cohort } from "@/types/mentoring";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";

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

const capacityConfig = {
  assigned: { label: "Assigned", color: "hsl(214, 84%, 56%)" },
  available: { label: "Available", color: "hsl(214, 20%, 85%)" },
} satisfies ChartConfig;

const cohortSizeConfig = {
  mentees: { label: "Mentees", color: "hsl(330, 65%, 55%)" },
  mentors: { label: "Mentors", color: "hsl(262, 83%, 58%)" },
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

  const cohortSizeData = useMemo(() => {
    return cohorts.map(cohort => ({
      name: cohort.name.length > 15 ? cohort.name.substring(0, 15) + '...' : cohort.name,
      mentees: cohort.mentees?.length || 0,
      mentors: cohort.mentors?.length || 0,
    })).filter(d => d.mentees > 0 || d.mentors > 0);
  }, [cohorts]);

  const getStatusBadge = (status: Cohort['status']) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "success" | "warning"; label: string }> = {
      active: { variant: "success", label: "Active" },
      draft: { variant: "secondary", label: "Draft" },
      completed: { variant: "info" as any, label: "Completed" },
      paused: { variant: "warning", label: "Paused" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const recentCohorts = [...cohorts]
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Program health at a glance" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Cohorts"
          value={stats.activeCohorts}
          icon={Target}
          isLoading={isLoading}
          description={`${cohorts.length} total cohorts`}
        />
        <StatCard
          title="Active Pairs"
          value={stats.activePairs}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Unassigned Mentees"
          value={stats.unassignedMentees}
          icon={ShieldAlert}
          isLoading={isLoading}
        />
        <StatCard
          title="Participants"
          value={stats.totalMentors + stats.totalMentees}
          icon={UserCog}
          isLoading={isLoading}
          description={`${stats.totalMentors} mentors, ${stats.totalMentees} mentees`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Cohort Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cohort Status</CardTitle>
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
            <CardTitle className="text-sm font-medium">Mentor Capacity</CardTitle>
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
      </div>

      {/* Bottom Row: Cohort Sizes + Recent Cohorts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Cohort Sizes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cohort Sizes</CardTitle>
            <CardDescription>Mentees vs mentors per cohort</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || cohortSizeData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                {isLoading ? "Loading..." : "No cohorts yet"}
              </div>
            ) : (
              <ChartContainer config={cohortSizeConfig} className="h-48 w-full">
                <BarChart data={cohortSizeData} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="mentees" fill="var(--color-mentees)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mentors" fill="var(--color-mentors)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Cohorts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Recent Cohorts</CardTitle>
                <CardDescription>Latest mentoring cohorts</CardDescription>
              </div>
              {cohorts.length > 5 && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin/mentoring/cohorts")}>
                  View all
                </Button>
              )}
            </div>
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
              <div className="space-y-1">
                {recentCohorts.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/mentoring/cohort/${cohort.id}/mentees`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{cohort.name}</span>
                        {getStatusBadge(cohort.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{cohort.mentees?.length || 0} mentees</span>
                        <span>{cohort.mentors?.length || 0} mentors</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
