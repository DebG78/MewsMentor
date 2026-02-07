import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, UserCog, Users, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAllCohorts } from "@/lib/supabaseService";
import type { Cohort } from "@/types/mentoring";

interface OverviewStats {
  activeCohorts: number;
  activePairs: number;
  unassignedMentees: number;
  totalMentors: number;
  totalMentees: number;
}

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

        // Calculate stats from cohorts
        const activeCohorts = allCohorts.filter(c => c.status === 'active');
        let totalMentors = 0;
        let totalMentees = 0;
        let activePairs = 0;
        let unassignedMentees = 0;

        allCohorts.forEach(cohort => {
          totalMentors += cohort.mentors?.length || 0;
          totalMentees += cohort.mentees?.length || 0;

          // Count matched pairs from active cohorts
          if (cohort.status === 'active' && cohort.matches?.results) {
            activePairs += cohort.matches.results.filter(r => r.proposed_assignment?.mentor_id).length;
          }

          // Count unassigned mentees in active cohorts
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

  // Get recent cohorts (up to 4, sorted by created date)
  const recentCohorts = [...cohorts]
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Mentoring Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Cohorts</span>
                <span className="font-semibold">
                  {isLoading ? "..." : stats.activeCohorts}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Pairs</span>
                <span className="font-semibold">
                  {isLoading ? "..." : stats.activePairs}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Unassigned Mentees</span>
                <span className="font-semibold">
                  {isLoading ? "..." : stats.unassignedMentees}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate("/admin/mentoring/cohorts")}
            >
              Manage Mentoring
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-600" />
              Overall Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Mentors</span>
                <span className="font-semibold">
                  {isLoading ? "..." : stats.totalMentors}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Mentees</span>
                <span className="font-semibold">
                  {isLoading ? "..." : stats.totalMentees}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Cohorts</span>
                <span className="font-semibold">
                  {isLoading ? "..." : cohorts.length}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => navigate("/admin/analytics/metrics")}
            >
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/mentoring/cohorts")}
              >
                Create First Cohort
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/mentoring/cohort/${cohort.id}/mentees`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cohort.name}</span>
                      {getStatusBadge(cohort.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {cohort.mentees?.length || 0} mentees
                      </span>
                      <span>
                        {cohort.mentors?.length || 0} mentors
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
              {cohorts.length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/admin/mentoring/cohorts")}
                >
                  View all {cohorts.length} cohorts
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
