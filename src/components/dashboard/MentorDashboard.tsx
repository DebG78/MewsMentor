import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  BellRing,
  ClipboardList,
  Clock,
  ListChecks,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import ActionItemsWidget from "./ActionItemsWidget";
import SharedNotesWidget from "./SharedNotesWidget";
import MessagingQuickView from "./MessagingQuickView";
import {
  getMentorDashboardData,
  type MentorDashboardData,
  type MentorWorkloadStatus
} from "@/lib/supabaseService";

interface MentorDashboardProps {
  mentorId: string;
  mentorRole?: string;
}

const workloadConfig: Record<MentorWorkloadStatus, {
  badge: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: (navigate: ReturnType<typeof useNavigate>, toast: ReturnType<typeof useToast>["toast"]) => void;
  };
}> = {
  under_capacity: {
    badge: "bg-emerald-100 text-emerald-700",
    title: "You have capacity",
    description: "Let the program team know if you'd like to welcome another mentee this cycle.",
    action: {
      label: "Signal availability",
      onClick: (_, toast) => toast({
        title: "Availability shared",
        description: "We'll let the program team know you're open for additional mentees."
      })
    }
  },
  at_capacity: {
    badge: "bg-amber-100 text-amber-700",
    title: "At full capacity",
    description: "Focus on supporting your current mentees. Let us know if anything shifts.",
    action: {
      label: "Update capacity",
      onClick: (_, toast) => toast({
        title: "Capacity",
        description: "Reach out to the program manager if you need to adjust your load."
      })
    }
  },
  over_capacity: {
    badge: "bg-rose-100 text-rose-700",
    title: "Capacity exceeded",
    description: "Flag this with the program team so we can redistribute mentees.",
    action: {
      label: "Notify program",
      onClick: (_, toast) => toast({
        title: "Support incoming",
        description: "We'll notify the program team to help rebalance assignments."
      })
    }
  }
};

const MentorDashboard = ({ mentorId, mentorRole }: MentorDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<MentorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mentorId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getMentorDashboardData(mentorId)
      .then((result) => {
        if (!isMounted) return;
        setData(result);
      })
      .catch((err) => {
        console.error("Failed to load mentor dashboard data", err);
        if (!isMounted) return;
        setError("We couldn't load your mentoring overview. Please try again shortly.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mentorId]);

  const workload = data?.status ?? "under_capacity";
  const workloadCopy = workloadConfig[workload];

  const focusTopics = useMemo(() => {
    if (!data?.topicsToMentor?.length) return [];
    return data.topicsToMentor.slice(0, 6);
  }, [data?.topicsToMentor]);

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
          <CardTitle className="text-destructive">Dashboard unavailable</CardTitle>
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
            <CardTitle>Welcome back{mentorRole ? `, ${mentorRole}` : ""}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We don't see any active mentee assignments for you right now. We'll notify you as soon as there's news.
            </p>
            <Button variant="outline" onClick={() => toast({
              title: "Stay ready",
              description: "We'll let the program team know you're available for new mentees."
            })}>
              Let the team know I'm available
            </Button>
          </CardContent>
        </Card>

        {/* Phase 6 Enhanced Features - Show even without data */}
        <div className="grid gap-4 md:grid-cols-3">
          <MessagingQuickView
            userId={mentorId}
            userType="mentor"
            maxConversations={3}
          />

          <ActionItemsWidget
            userId={mentorId}
            userType="mentor"
            maxItems={3}
          />

          <SharedNotesWidget
            userId={mentorId}
            userType="mentor"
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
            <Badge className={workloadCopy.badge}>{workload.replace("_", " ")}</Badge>
            <CardTitle className="text-2xl font-semibold">{workloadCopy.title}</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">{workloadCopy.description}</p>
          </div>
          {workloadCopy.action && (
            <Button onClick={() => workloadCopy.action?.onClick(navigate, toast)}>
              {workloadCopy.action.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Active mentees
            </div>
            <p className="mt-2 text-lg font-semibold">{data.assignedMentees.length}</p>
            <p className="text-xs text-muted-foreground">Support each mentee with a clear sprint plan.</p>
          </div>
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BellRing className="h-4 w-4" />
              Pending requests
            </div>
            <p className="mt-2 text-lg font-semibold">{data.pendingRequests.length}</p>
            <p className="text-xs text-muted-foreground">Confirm interest or suggest alternatives promptly.</p>
          </div>
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Remaining capacity
            </div>
            <p className="mt-2 text-lg font-semibold">{data.capacityRemaining}</p>
            <p className="text-xs text-muted-foreground">Update if your bandwidth changes.</p>
          </div>
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Focus areas
            </div>
            <p className="mt-2 text-lg font-semibold">{focusTopics.length || 0}</p>
            <p className="text-xs text-muted-foreground">Highlight go-to strengths for mentee alignment.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Current mentees</CardTitle>
            <p className="text-sm text-muted-foreground">Keep momentum by logging sessions and tracking commitments.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.assignedMentees.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              You're ready for mentees. The program team will reach out shortly with a pairing.
            </div>
          ) : (
            data.assignedMentees.map((mentee) => (
              <div key={mentee.menteeId} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Mentee ID</p>
                  <p className="text-lg font-semibold">{mentee.menteeId}</p>
                  <p className="text-sm text-muted-foreground">{mentee.menteeRole}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cadence</p>
                  <p className="text-sm">{mentee.meetingFrequency}</p>
                  <p className="text-xs text-muted-foreground">Suggested topics: {mentee.topicsToLearn.slice(0, 2).join(", ") || 'Align together'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Match score</p>
                  <p className="text-sm">{mentee.matchScore ? `${Math.round(mentee.matchScore)} / 100` : 'Not rated yet'}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/workspace/${mentee.menteeId}`)}>
                  Open workspace
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {data.pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Pending mentee requests</CardTitle>
            <p className="text-sm text-muted-foreground">Let the program team know which mentees you can support.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.pendingRequests.map((request) => (
              <div key={request.menteeId} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{request.menteeId}</p>
                  <p className="text-sm text-muted-foreground">{request.menteeRole}</p>
                  <p className="text-xs text-muted-foreground">Preferred cadence: {request.menteeMeetingFrequency}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => toast({
                    title: "Interest shared",
                    description: "We'll pass along your confirmation to the program team."
                  })}>
                    Accept
                  </Button>
                  <Button variant="ghost" onClick={() => toast({
                    title: "Declined",
                    description: "Thanks for the quick response � we'll re-route this mentee."
                  })}>
                    Suggest alternative
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Phase 6 Enhanced Features */}
      <div className="grid gap-4 md:grid-cols-3">
        <MessagingQuickView
          userId={mentorId}
          userType="mentor"
          maxConversations={3}
        />

        <ActionItemsWidget
          userId={mentorId}
          userType="mentor"
          maxItems={3}
        />

        <SharedNotesWidget
          userId={mentorId}
          userType="mentor"
          maxNotes={3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your mentoring toolkit</CardTitle>
            <p className="text-sm text-muted-foreground">Keep these routines in flow for impactful sessions.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <ListChecks className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Align on sprint goals</p>
                <p className="text-xs text-muted-foreground">Confirm what success looks like for each mentee this month.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <ClipboardList className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Capture session notes</p>
                <p className="text-xs text-muted-foreground">Log key takeaways and commitments right after every session.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Share quick wins</p>
                <p className="text-xs text-muted-foreground">Celebrate progress to keep mentees motivated between sessions.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topics you mentor on</CardTitle>
            <p className="text-sm text-muted-foreground">Spot gaps or update your profile any time.</p>
          </CardHeader>
          <CardContent>
            {focusTopics.length ? (
              <div className="flex flex-wrap gap-2">
                {focusTopics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Highlight your go-to mentoring topics to receive stronger matches.
              </div>
            )}
            <Button variant="outline" className="mt-4" onClick={() => toast({
              title: "Profile updates",
              description: "Connect with the program team to adjust your mentor profile."
            })}>
              Update mentor profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MentorDashboard;
