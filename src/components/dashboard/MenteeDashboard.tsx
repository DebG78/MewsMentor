import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  CalendarDays,
  Calendar,
  CheckCircle2,
  Compass,
  FileText,
  Layers,
  Mail,
  MessageCircle,
  Repeat,
  Sparkles,
  Target,
  ThumbsUp,
  User,
  Users
} from "lucide-react";
import ActionItemsWidget from "./ActionItemsWidget";
import SharedNotesWidget from "./SharedNotesWidget";
import MessagingQuickView from "./MessagingQuickView";
import {
  getMenteeDashboardData,
  type MenteeDashboardData,
  type MenteeMatchStatus
} from "@/lib/supabaseService";
import {
  getRecommendationsForMentee,
  initializeRecommendationsForMentee,
  completeRecommendation,
  uncompleteRecommendation,
  type MenteeRecommendation
} from "@/lib/recommendationsService";

interface MenteeDashboardProps {
  menteeId: string;
  menteeRole?: string;
}

const statusConfig: Record<MenteeMatchStatus, {
  badge: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: (navigate: ReturnType<typeof useNavigate>, toast: ReturnType<typeof useToast>["toast"]) => void;
  };
  secondaryAction?: {
    label: string;
    onClick: (navigate: ReturnType<typeof useNavigate>, toast: ReturnType<typeof useToast>["toast"]) => void;
  };
}> = {
  unassigned: {
    badge: "bg-slate-100 text-slate-600",
    title: "You're on the list!",
    description: "Our program team is reviewing your profile and will place you into a cohort soon.",
    primaryAction: {
      label: "Review signup details",
      onClick: (navigate) => navigate("/skills")
    }
  },
  awaiting_match: {
    badge: "bg-blue-100 text-blue-700",
    title: "Matching in progress",
    description: "We're finding mentors who align with your goals. You'll be notified once we have a proposed match.",
    secondaryAction: {
      label: "Explore skills while you wait",
      onClick: (navigate) => navigate("/skills")
    }
  },
  match_pending: {
    badge: "bg-amber-100 text-amber-700",
    title: "Mentor options ready",
    description: "Review recommended mentors and let the program team know which option feels right.",
    primaryAction: {
      label: "Review recommendations",
      onClick: (_, toast) => toast({
        title: "Recommendations",
        description: "Reach out to your program manager to confirm your preferred mentor."
      })
    }
  },
  matched: {
    badge: "bg-emerald-100 text-emerald-700",
    title: "You're matched!",
    description: "It's time to align on goals and schedule your first session with your mentor.",
    primaryAction: {
      label: "Plan first session",
      onClick: (_, toast) => toast({
        title: "Session planning",
        description: "Use the mentoring workspace to align on goals and schedule your kickoff."
      })
    }
  }
};

// Icon mapping for recommendations
const iconMap: Record<string, typeof Sparkles> = {
  Sparkles,
  Compass,
  Layers,
  User,
  Target,
  CheckCircle2,
  Users,
  MessageCircle,
  ThumbsUp,
  Mail,
  Calendar,
  FileText,
  Repeat
};

const MenteeDashboard = ({ menteeId, menteeRole }: MenteeDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<MenteeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<{
    active: MenteeRecommendation[];
    completed: MenteeRecommendation[];
  }>({ active: [], completed: [] });

  useEffect(() => {
    if (!menteeId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getMenteeDashboardData(menteeId)
      .then(async (result) => {
        if (!isMounted) return;
        setData(result);

        if (result) {
          // Initialize recommendations for this stage if they don't exist
          await initializeRecommendationsForMentee(
            menteeId,
            result.cohortId,
            result.matchStatus
          );

          // Fetch recommendations for current stage
          const recs = await getRecommendationsForMentee(
            menteeId,
            result.matchStatus
          );
          if (isMounted) {
            setRecommendations(recs);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load mentee dashboard data", err);
        if (!isMounted) return;
        setError("We couldn't load your dashboard data. Please try again shortly.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [menteeId]);

  const handleToggleRecommendation = async (recommendation: MenteeRecommendation) => {
    const previousState = recommendations;

    // Optimistic update
    if (recommendation.is_completed) {
      setRecommendations({
        active: [...recommendations.active, recommendation],
        completed: recommendations.completed.filter(r => r.id !== recommendation.id)
      });
    } else {
      setRecommendations({
        active: recommendations.active.filter(r => r.id !== recommendation.id),
        completed: [...recommendations.completed, { ...recommendation, is_completed: true }]
      });
    }

    // Update in database
    const result = recommendation.is_completed
      ? await uncompleteRecommendation(recommendation.id)
      : await completeRecommendation(recommendation.id);

    if (!result) {
      // Revert on error
      setRecommendations(previousState);
      toast({
        title: "Error",
        description: "Failed to update recommendation. Please try again.",
        variant: "destructive"
      });
    } else {
      toast({
        title: recommendation.is_completed ? "Unmarked" : "Completed!",
        description: recommendation.is_completed
          ? "Recommendation moved back to active list."
          : "Great progress! Keep it up.",
      });
    }
  };

  const status = data?.matchStatus ?? "unassigned";
  const statusCopy = statusConfig[status];

  const focusAreas = useMemo(() => {
    if (!data?.topicsToLearn?.length) return [];
    return data.topicsToLearn.slice(0, 6);
  }, [data?.topicsToLearn]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
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
          <CardTitle className="text-destructive">We're having trouble loading your dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => navigate(0)}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back{menteeRole ? `, ${menteeRole}` : ""}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We couldn't find an active program for your profile yet. Please reach out to your program manager for support.
            </p>
            <Button variant="outline" onClick={() => navigate("/skills")}>Explore skills</Button>
          </CardContent>
        </Card>

        {/* Phase 6 Enhanced Features - Show even without data */}
        <div className="grid gap-4 md:grid-cols-3">
          <MessagingQuickView
            userId={menteeId}
            userType="mentee"
            maxConversations={3}
          />

          <ActionItemsWidget
            userId={menteeId}
            userType="mentee"
            maxItems={3}
          />

          <SharedNotesWidget
            userId={menteeId}
            userType="mentee"
            maxNotes={3}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Badge className={statusCopy.badge}>{status.replace("_", " ")}</Badge>
            <CardTitle className="text-2xl font-semibold">{statusCopy.title}</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">{statusCopy.description}</p>
          </div>
          <div className="flex gap-2">
            {statusCopy.secondaryAction && (
              <Button
                variant="ghost"
                onClick={() => statusCopy.secondaryAction?.onClick(navigate, toast)}
              >
                {statusCopy.secondaryAction.label}
              </Button>
            )}
            {statusCopy.primaryAction && (
              <Button onClick={() => statusCopy.primaryAction?.onClick(navigate, toast)}>
                {statusCopy.primaryAction.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Cohort placement
            </div>
            <p className="mt-2 text-lg font-semibold">
              {data.cohortName ? data.cohortName : data.cohortId === 'unassigned' ? 'Unassigned' : 'Pending assignment'}
            </p>
            {data.cohortStatus && (
              <Badge variant="outline" className="mt-3 w-fit uppercase tracking-wide text-xs">
                {data.cohortStatus}
              </Badge>
            )}
          </div>
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Focus areas
            </div>
            <p className="mt-2 text-lg font-semibold">{focusAreas.length || 0}</p>
            <p className="text-xs text-muted-foreground">{focusAreas.length ? "Top priorities from your signup" : "Add topics to sharpen your matching"}</p>
          </div>
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Next step
            </div>
            <p className="mt-2 text-lg font-semibold">
              {status === 'matched' ? 'Plan kickoff session' : status === 'match_pending' ? 'Review mentor options' : 'Complete profile & availability'}
            </p>
            <p className="text-xs text-muted-foreground">We'll guide you once the program moves to the next milestone.</p>
          </div>
        </CardContent>
      </Card>

      {data.assignedMentor && (
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl">Your mentor</CardTitle>
              <p className="text-sm text-muted-foreground">Start aligning on goals and preferred working styles.</p>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              Matched
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Mentor ID</p>
              <p className="text-lg font-semibold">{data.assignedMentor.mentorId}</p>
              {data.assignedMentor.mentorRole && (
                <p className="text-sm text-muted-foreground">{data.assignedMentor.mentorRole}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Preferred cadence</p>
              <p className="text-lg font-semibold">{data.assignedMentor.meetingFrequency || 'Align together'}</p>
              <p className="text-xs text-muted-foreground">Set expectations for duration and prep.</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Timezone & availability</p>
              <p className="text-lg font-semibold">{data.assignedMentor.locationTimezone || 'To be confirmed'}</p>
              <p className="text-xs text-muted-foreground">Share your availability to lock a session.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!data.assignedMentor && data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Recommended mentors</CardTitle>
            <p className="text-sm text-muted-foreground">Preview potential mentors selected for your goals.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recommendations.map((rec) => (
              <div key={rec.mentorId} className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{rec.mentorName || rec.mentorId}</p>
                  <p className="text-sm text-muted-foreground">Compatibility score: {rec.score ? `${Math.round(rec.score)} / 100` : 'Awaiting review'}</p>
                </div>
                <Button variant="outline" onClick={() => toast({
                  title: "Preference captured",
                  description: "Let your program manager know which mentor you'd like to work with."
                })}>
                  Share preference
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Phase 6 Enhanced Features */}
      <div className="grid gap-4 md:grid-cols-3">
        <MessagingQuickView
          userId={menteeId}
          userType="mentee"
          maxConversations={3}
        />

        <ActionItemsWidget
          userId={menteeId}
          userType="mentee"
          maxItems={3}
        />

        <SharedNotesWidget
          userId={menteeId}
          userType="mentee"
          maxNotes={3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth focus</CardTitle>
            <p className="text-sm text-muted-foreground">
              Revisit the areas you highlighted in your signup and refine them as your needs evolve.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {focusAreas.length ? (
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Tell us where you want to grow to get more tailored mentor matches.
              </div>
            )}
            <Button variant="outline" onClick={() => navigate("/skills")}>Update growth goals</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended next moves</CardTitle>
            <p className="text-sm text-muted-foreground">
              Stay ahead with quick wins for your current stage.
              {recommendations.completed.length > 0 && (
                <span className="ml-1 font-medium text-primary">
                  {recommendations.completed.length} completed
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.active.length === 0 && recommendations.completed.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No recommendations available yet. Check back once you're assigned to a cohort.
              </div>
            ) : (
              <>
                {recommendations.active.map((rec) => {
                  const Icon = iconMap[rec.icon] || Sparkles;
                  return (
                    <div key={rec.id} className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 hover:bg-muted/60 transition-colors">
                      <Checkbox
                        id={rec.id}
                        checked={rec.is_completed}
                        onCheckedChange={() => handleToggleRecommendation(rec)}
                        className="mt-0.5"
                      />
                      <Icon className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <label
                          htmlFor={rec.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {rec.title}
                        </label>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  );
                })}

                {recommendations.completed.length > 0 && (
                  <>
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Completed</p>
                    </div>
                    {recommendations.completed.map((rec) => {
                      const Icon = iconMap[rec.icon] || Sparkles;
                      return (
                        <div key={rec.id} className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 opacity-60 hover:opacity-100 transition-opacity">
                          <Checkbox
                            id={rec.id}
                            checked={rec.is_completed}
                            onCheckedChange={() => handleToggleRecommendation(rec)}
                            className="mt-0.5"
                          />
                          <Icon className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <label
                              htmlFor={rec.id}
                              className="text-sm font-medium cursor-pointer line-through text-muted-foreground"
                            >
                              {rec.title}
                            </label>
                            <p className="text-xs text-muted-foreground">{rec.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MenteeDashboard;
