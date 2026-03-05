import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GitMerge, Sparkles, HandMetal, AlertTriangle, Lightbulb } from "lucide-react";
import { getMatchesForPerson, type PersonMatchInfo } from "@/lib/supabaseService";
import { toDisplayName } from "@/lib/displayName";

interface MatchesTabProps {
  personId: string;
  personType: "mentee" | "mentor";
}

export function MatchesTab({ personId, personType }: MatchesTabProps) {
  const [matches, setMatches] = useState<PersonMatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMatchesForPerson(personId, personType)
      .then((data) => {
        if (!cancelled) setMatches(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [personId, personType]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">Failed to load matches: {error}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <GitMerge className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No matches found for this person.</p>
      </div>
    );
  }

  // Group by cohort
  const byCohort = new Map<string, PersonMatchInfo[]>();
  for (const m of matches) {
    const existing = byCohort.get(m.cohort_id) || [];
    existing.push(m);
    byCohort.set(m.cohort_id, existing);
  }

  return (
    <div className="space-y-4">
      {Array.from(byCohort.entries()).map(([cohortId, cohortMatches]) => (
        <Card key={cohortId}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitMerge className="w-4 h-4" />
              {cohortMatches[0].cohort_name}
              <Badge variant="outline" className="text-xs ml-auto">
                {cohortMatches.length} match{cohortMatches.length > 1 ? "es" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {cohortMatches.map((match, idx) => (
              <div key={idx}>
                {idx > 0 && <Separator className="mb-3" />}
                <MatchCard match={match} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MatchCard({ match }: { match: PersonMatchInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {toDisplayName(match.partner_name)}
          </span>
          <Badge
            variant={match.partner_role === "mentor" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {match.partner_role}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              match.match_type === "algorithmic"
                ? "border-purple-200 text-purple-700"
                : "border-amber-200 text-amber-700"
            }`}
          >
            {match.match_type === "algorithmic" ? (
              <><Sparkles className="w-3 h-3 mr-0.5" /> Algorithm</>
            ) : (
              <><HandMetal className="w-3 h-3 mr-0.5" /> Manual</>
            )}
          </Badge>
        </div>
        {match.total_score !== undefined && (
          <Badge variant="default" className="text-xs">
            Score: {Math.round(match.total_score)}
          </Badge>
        )}
        {match.confidence !== undefined && (
          <Badge variant="default" className="text-xs">
            Confidence: {match.confidence}/5
          </Badge>
        )}
      </div>

      {/* Score features */}
      {match.features && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(match.features)
            .filter(([_, v]) => v !== 0 && v !== undefined)
            .map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-[10px]">
                {key.replace(/_/g, " ")}: {typeof value === "number" ? value.toFixed(1) : value}
              </Badge>
            ))}
        </div>
      )}

      {/* Reasons */}
      {match.reasons && match.reasons.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {match.reasons.slice(0, expanded ? undefined : 2).map((r, i) => (
            <div key={i} className="flex items-start gap-1">
              <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-green-500" />
              {r}
            </div>
          ))}
          {!expanded && match.reasons.length > 2 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-primary hover:underline mt-0.5"
            >
              +{match.reasons.length - 2} more
            </button>
          )}
        </div>
      )}

      {/* Risks */}
      {match.risks && match.risks.length > 0 && (
        <div className="text-xs">
          {match.risks.map((r, i) => (
            <div key={i} className="flex items-start gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              {r}
            </div>
          ))}
        </div>
      )}

      {/* AI explanation / icebreaker */}
      {match.ai_explanation && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          {match.ai_explanation}
        </p>
      )}
      {match.icebreaker && (
        <p className="text-xs italic text-muted-foreground">
          Icebreaker: {match.icebreaker}
        </p>
      )}

      {/* Manual match notes */}
      {match.notes && (
        <p className="text-xs text-muted-foreground">
          Notes: {match.notes}
        </p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3" />
          <div className="h-3 bg-muted rounded w-2/3 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
