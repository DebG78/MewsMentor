import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  Star,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Cohort, SessionStats } from "@/types/mentoring";
import { getSessionStats } from "@/lib/sessionService";
import { format } from "date-fns";

interface SessionAnalyticsProps {
  selectedCohort: Cohort | null;
}

export const SessionAnalytics = ({ selectedCohort }: SessionAnalyticsProps) => {
  const [stats, setStats] = useState<SessionStats>({
    total_meetings: 0,
    active_pairs: 0,
    engagement_rate: 0,
    average_meetings_per_pair: 0,
    average_rating: undefined,
    last_meeting_date: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedCohort) {
      loadStats();
    } else {
      // Reset stats when no cohort is selected
      setStats({
        total_meetings: 0,
        active_pairs: 0,
        engagement_rate: 0,
        average_meetings_per_pair: 0,
        average_rating: undefined,
        last_meeting_date: undefined,
      });
    }
  }, [selectedCohort]);

  const loadStats = async () => {
    if (!selectedCohort) return;

    setIsLoading(true);
    try {
      const cohortStats = await getSessionStats(selectedCohort.id);
      setStats(cohortStats);
    } catch (error) {
      console.error("Error loading session stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedCohort) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meeting Analytics</CardTitle>
          <CardDescription>Select a cohort to view meeting statistics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Meetings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
                <p className="text-2xl font-bold">{stats.total_meetings}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Active Pairs */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Pairs</p>
                <p className="text-2xl font-bold">{stats.active_pairs}</p>
                <p className="text-xs text-muted-foreground">Pairs that have met</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Engagement Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement Rate</p>
                <p className="text-2xl font-bold">{stats.engagement_rate}%</p>
                <p className="text-xs text-muted-foreground">Pairs logging meetings</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Average Meetings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Per Pair</p>
                <p className="text-2xl font-bold">{stats.average_meetings_per_pair}</p>
                <p className="text-xs text-muted-foreground">Meetings per partnership</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Average Rating (if available) */}
        {stats.average_rating && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stats.average_rating}</span>
                <span className="text-muted-foreground">/ 5.0</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Based on mentor and mentee feedback
              </p>
            </CardContent>
          </Card>
        )}

        {/* Last Meeting */}
        {stats.last_meeting_date && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Most Recent Meeting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {format(new Date(stats.last_meeting_date), "MMM d")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {format(new Date(stats.last_meeting_date), "yyyy")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insights Card */}
      <Card>
        <CardHeader>
          <CardTitle>Program Insights</CardTitle>
          <CardDescription>Engagement analysis for this cohort</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Engagement Assessment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Engagement Health</span>
                <Badge
                  variant={
                    stats.engagement_rate >= 80
                      ? "default"
                      : stats.engagement_rate >= 60
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {stats.engagement_rate >= 80
                    ? "Excellent"
                    : stats.engagement_rate >= 60
                    ? "Good"
                    : "Needs Attention"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.engagement_rate >= 80
                  ? "Great job! Most mentor-mentee pairs are actively meeting and logging their sessions."
                  : stats.engagement_rate >= 60
                  ? "Good engagement overall, but some pairs may need encouragement to meet more regularly."
                  : "Low engagement detected. Consider reaching out to inactive pairs or sending reminders."}
              </p>
            </div>

            {/* Meeting Frequency Assessment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Meeting Frequency</span>
                <Badge
                  variant={
                    stats.average_meetings_per_pair >= 4
                      ? "default"
                      : stats.average_meetings_per_pair >= 2
                      ? "secondary"
                      : "outline"
                  }
                >
                  {stats.average_meetings_per_pair >= 4
                    ? "High"
                    : stats.average_meetings_per_pair >= 2
                    ? "Moderate"
                    : "Low"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.average_meetings_per_pair >= 4
                  ? "Pairs are meeting frequently, indicating strong mentoring relationships."
                  : stats.average_meetings_per_pair >= 2
                  ? "Pairs are meeting regularly. Encourage them to maintain this cadence."
                  : "Limited meetings logged so far. This could be early in the program or pairs may need support."}
              </p>
            </div>

            {/* Activity Level */}
            {stats.total_meetings > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Activity</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.active_pairs} of {stats.active_pairs} pairs active
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.total_meetings} total meetings have been logged for this cohort. Keep encouraging
                  pairs to log their meetings to track engagement.
                </p>
              </div>
            )}

            {/* No Activity Warning */}
            {stats.total_meetings === 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">No meetings logged yet</p>
                <p className="text-sm text-muted-foreground">
                  Encourage mentors and mentees to log their meetings using the "Log a Meeting" button
                  in their dashboards. This helps track engagement and program success.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
