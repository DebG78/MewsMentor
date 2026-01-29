import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  ExternalLink,
  MapPin
} from "lucide-react";
import { Cohort } from "@/types/mentoring";
import { getUserCohorts } from "@/lib/supabaseService";

interface CohortOverviewProps {
  userId: string;
  userType: "mentor" | "mentee";
}

export const CohortOverview = ({ userId, userType }: CohortOverviewProps) => {
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserCohorts();
  }, [userId]);

  const loadUserCohorts = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Implement getUserCohorts function in supabaseService
      // For now, return empty array
      const userCohorts: Cohort[] = [];
      setCohorts(userCohorts);
    } catch (err) {
      console.error("Failed to load user cohorts:", err);
      setError("Failed to load your cohorts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-700", label: "Draft" },
      active: { color: "bg-green-100 text-green-700", label: "Active" },
      completed: { color: "bg-blue-100 text-blue-700", label: "Completed" },
      paused: { color: "bg-yellow-100 text-yellow-700", label: "Paused" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getCohortStats = (cohort: Cohort) => {
    return {
      mentors: cohort.mentors?.length || 0,
      mentees: cohort.mentees?.length || 0,
      matches: cohort.matches?.results?.filter(r => r.proposed_assignment?.mentor_id)?.length || 0
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Cohorts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={loadUserCohorts}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">My Cohorts</h2>
        <p className="text-muted-foreground">
          View all cohorts you're part of and their current status
        </p>
      </div>

      {/* Cohorts List */}
      {cohorts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Users className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Cohorts Yet</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't been assigned to any cohorts yet.
                  Check back later or contact your program manager.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {cohorts.map((cohort) => {
            const stats = getCohortStats(cohort);
            return (
              <Card key={cohort.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cohort.name}</CardTitle>
                    {getStatusBadge(cohort.status)}
                  </div>
                  <CardDescription>
                    {cohort.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cohort Stats */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="space-y-1">
                      <User className="w-4 h-4 mx-auto text-green-600" />
                      <p className="text-sm font-medium">{stats.mentors}</p>
                      <p className="text-xs text-muted-foreground">Mentors</p>
                    </div>
                    <div className="space-y-1">
                      <Users className="w-4 h-4 mx-auto text-blue-600" />
                      <p className="text-sm font-medium">{stats.mentees}</p>
                      <p className="text-xs text-muted-foreground">Mentees</p>
                    </div>
                    <div className="space-y-1">
                      <CheckCircle className="w-4 h-4 mx-auto text-purple-600" />
                      <p className="text-sm font-medium">{stats.matches}</p>
                      <p className="text-xs text-muted-foreground">Matches</p>
                    </div>
                  </div>

                  {/* Cohort Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(cohort.created_date).toLocaleDateString()}</span>
                    </div>
                    {cohort.program_manager && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Program Manager:</span>
                        <span>{cohort.program_manager}</span>
                      </div>
                    )}
                    {cohort.target_skills && cohort.target_skills.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Target Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cohort.target_skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {cohort.target_skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{cohort.target_skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* My Role in Cohort */}
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">My Role</span>
                    </div>
                    <Badge variant="secondary">
                      {userType === "mentor" ? "Mentor" : "Mentee"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {cohorts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              Your overall participation across all cohorts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-3 border rounded-lg">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-xl font-bold">{cohorts.length}</p>
                <p className="text-sm text-muted-foreground">Total Cohorts</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-xl font-bold">
                  {cohorts.filter(c => c.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Cohorts</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Target className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-xl font-bold">
                  {cohorts.filter(c => c.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed Cohorts</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Clock className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <p className="text-xl font-bold">
                  {cohorts.reduce((total, cohort) => {
                    const stats = getCohortStats(cohort);
                    return total + stats.matches;
                  }, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};