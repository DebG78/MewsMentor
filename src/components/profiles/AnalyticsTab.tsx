import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Trophy,
  BarChart3,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { getSessionsForPerson, getAllSessionsForPerson, type SessionRow } from "@/lib/sessionService";
import { getVIPScoresForPerson } from "@/lib/vipService";
import type { VIPScore } from "@/types/vip";
import { toDisplayName } from "@/lib/displayName";

interface AnalyticsTabProps {
  personId: string;
  personType: "mentee" | "mentor";
  dualRoleId?: string; // The person's ID in the other role, if they are dual-role
}

export function AnalyticsTab({ personId, personType, dualRoleId }: AnalyticsTabProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [vipScores, setVipScores] = useState<VIPScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const sessionsFetch = dualRoleId
      ? getAllSessionsForPerson(
          personType === 'mentee' ? personId : dualRoleId,
          personType === 'mentor' ? personId : dualRoleId,
        )
      : getSessionsForPerson(personId, personType);

    Promise.all([
      sessionsFetch,
      getVIPScoresForPerson(personId),
    ])
      .then(([sessionsData, vipData]) => {
        if (!cancelled) {
          setSessions(sessionsData);
          setVipScores(vipData);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [personId, personType, dualRoleId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">Failed to load analytics: {error}</p>
      </div>
    );
  }

  // Compute session stats
  const completed = sessions.filter((s) => s.status === "completed");

  const ratingField = personType === "mentee" ? "mentee_rating" : "mentor_rating";
  const partnerRatingField = personType === "mentee" ? "mentor_rating" : "mentee_rating";
  const feedbackField = personType === "mentee" ? "mentee_feedback" : "mentor_feedback";
  const partnerFeedbackField = personType === "mentee" ? "mentor_feedback" : "mentee_feedback";

  const ratingsGiven = completed
    .map((s) => s[ratingField])
    .filter((r): r is number => r !== null);
  const ratingsReceived = completed
    .map((s) => s[partnerRatingField])
    .filter((r): r is number => r !== null);

  const avgRatingGiven =
    ratingsGiven.length > 0
      ? ratingsGiven.reduce((a, b) => a + b, 0) / ratingsGiven.length
      : null;
  const avgRatingReceived =
    ratingsReceived.length > 0
      ? ratingsReceived.reduce((a, b) => a + b, 0) / ratingsReceived.length
      : null;

  // VIP tier
  const topVip = vipScores.length > 0 ? vipScores[0] : null;
  const vipTier = topVip
    ? topVip.total_score >= 90
      ? "Platinum"
      : topVip.total_score >= 80
      ? "Gold"
      : topVip.total_score >= 70
      ? "Silver"
      : topVip.total_score >= 60
      ? "Bronze"
      : null
    : null;

  const tierColor: Record<string, string> = {
    Platinum: "bg-violet-100 text-violet-700 border-violet-200",
    Gold: "bg-amber-100 text-amber-700 border-amber-200",
    Silver: "bg-slate-100 text-slate-600 border-slate-200",
    Bronze: "bg-orange-100 text-orange-700 border-orange-200",
  };

  return (
    <div className="space-y-4">
      {/* VIP Score Card */}
      {vipScores.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              VIP Score
              {vipTier && (
                <Badge className={`text-xs ml-auto ${tierColor[vipTier] || ""}`}>
                  {vipTier}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {vipScores.map((vip) => (
                <div key={vip.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      Total: {vip.total_score}
                    </span>
                    {vip.is_vip && (
                      <Badge variant="default" className="text-xs">
                        VIP
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <ScoreBar label="Engagement" value={vip.engagement_score} max={25} />
                    <ScoreBar label="Sessions" value={vip.session_score} max={25} />
                    <ScoreBar label="Responses" value={vip.response_score} max={25} />
                    <ScoreBar label="Feedback" value={vip.feedback_score} max={25} />
                  </div>
                  {vip.vip_reason && (
                    <p className="text-xs text-muted-foreground">{vip.vip_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Summary */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Sessions Overview
            <Badge variant="outline" className="text-xs ml-auto">
              {sessions.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sessions recorded.
            </p>
          ) : (
            <>
              {/* Session count */}
              <div className="flex items-center gap-1.5 mb-4 text-sm">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="font-medium">{completed.length}</span>
                <span className="text-muted-foreground">sessions logged</span>
              </div>

              {/* Rating averages */}
              {(avgRatingGiven !== null || avgRatingReceived !== null) && (
                <div className="flex gap-4 mb-4 text-sm">
                  {avgRatingGiven !== null && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-muted-foreground">Given:</span>
                      <span className="font-medium">{avgRatingGiven.toFixed(1)}/5</span>
                      <span className="text-xs text-muted-foreground">({ratingsGiven.length})</span>
                    </div>
                  )}
                  {avgRatingReceived !== null && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-muted-foreground">Received:</span>
                      <span className="font-medium">{avgRatingReceived.toFixed(1)}/5</span>
                      <span className="text-xs text-muted-foreground">({ratingsReceived.length})</span>
                    </div>
                  )}
                </div>
              )}

              <Separator className="mb-3" />

              {/* Session timeline */}
              <div className="space-y-2">
                {sessions.slice(0, 10).map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    personType={personType}
                    feedbackField={feedbackField}
                    partnerFeedbackField={partnerFeedbackField}
                  />
                ))}
                {sessions.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{sessions.length - 10} more sessions
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}


function SessionItem({
  session,
  personType,
  feedbackField,
  partnerFeedbackField,
}: {
  session: SessionRow;
  personType: "mentee" | "mentor";
  feedbackField: string;
  partnerFeedbackField: string;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const date = new Date(session.scheduled_datetime);
  const partnerId =
    personType === "mentee" ? session.mentor_id : session.mentee_id;

  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    completed: {
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      color: "text-green-600",
    },
    scheduled: {
      icon: <Clock className="w-3.5 h-3.5" />,
      color: "text-blue-600",
    },
    cancelled: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      color: "text-red-500",
    },
    no_show: {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      color: "text-amber-500",
    },
  };

  const config = statusConfig[session.status] || statusConfig.scheduled;
  const myFeedback = (session as any)[feedbackField];
  const partnerFeedback = (session as any)[partnerFeedbackField];
  const hasFeedback = myFeedback || partnerFeedback;

  return (
    <div className="border rounded-lg p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={config.color}>{config.icon}</span>
          <span className="text-xs font-medium truncate">
            {session.title || "Session"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            with {toDisplayName(partnerId)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.mentor_rating && (
            <span className="text-xs flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {session.mentor_rating}
            </span>
          )}
          {session.mentee_rating && (
            <span className="text-xs flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {session.mentee_rating}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {date.toLocaleDateString()}
          </span>
        </div>
      </div>

      {hasFeedback && (
        <div className="mt-1.5">
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
          >
            <MessageSquare className="w-3 h-3" />
            {showFeedback ? "Hide" : "Show"} feedback
          </button>
          {showFeedback && (
            <div className="mt-1.5 space-y-1 text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {myFeedback && (
                <p>
                  <span className="font-medium">Their feedback:</span> {myFeedback}
                </p>
              )}
              {partnerFeedback && (
                <p>
                  <span className="font-medium">Partner's feedback:</span>{" "}
                  {partnerFeedback}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3" />
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-16 bg-muted rounded" />
            ))}
          </div>
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
