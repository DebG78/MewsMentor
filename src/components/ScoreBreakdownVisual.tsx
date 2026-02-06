import { MatchScore } from "@/types/mentoring";
import { getScoreComponents, ScoreComponent } from "@/utils/matchingDataTransform";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreBreakdownVisualProps {
  score: MatchScore;
  variant?: 'compact' | 'detailed';
  showReasons?: boolean;
  showRisks?: boolean;
  className?: string;
  explanation?: string;
}

/**
 * Visual representation of match score breakdown using progress bars
 */
export function ScoreBreakdownVisual({
  score,
  variant = 'compact',
  showReasons = true,
  showRisks = true,
  className,
  explanation
}: ScoreBreakdownVisualProps) {
  const components = getScoreComponents(score);

  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Compact bar visualization */}
        <div className="flex gap-0.5 h-2 w-full rounded-full overflow-hidden bg-gray-100">
          {components.map((comp) => (
            <div
              key={comp.key}
              className={cn(comp.color, "transition-all")}
              style={{ width: `${(comp.value / 100) * 100}%` }}
              title={`${comp.label}: ${comp.value}/${comp.maxValue}`}
            />
          ))}
        </div>

        {/* Reasons and risks inline */}
        {(showReasons || showRisks) && (
          <div className="flex flex-wrap gap-1">
            {showReasons && score.reasons.slice(0, 2).map((reason, idx) => (
              <span key={`reason-${idx}`} className="inline-flex items-center text-xs text-green-700">
                <CheckCircle className="w-3 h-3 mr-0.5 flex-shrink-0" />
                <span className="truncate max-w-[180px]">{reason}</span>
              </span>
            ))}
            {showRisks && score.risks.slice(0, 1).map((risk, idx) => (
              <span key={`risk-${idx}`} className="inline-flex items-center text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3 mr-0.5 flex-shrink-0" />
                <span className="truncate max-w-[180px]">{risk}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Detailed variant with individual bars
  return (
    <div className={cn("space-y-3", className)}>
      {/* Individual score bars */}
      <div className="space-y-2">
        {components.map((comp) => (
          <ScoreBar key={comp.key} component={comp} showDescription />
        ))}
      </div>

      {/* Reasons section */}
      {showReasons && score.reasons.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs font-medium text-gray-700 mb-1">Why this is a good match:</p>
          <div className="space-y-1">
            {score.reasons.map((reason, idx) => (
              <div key={idx} className="flex items-start text-xs text-green-700">
                <CheckCircle className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks section */}
      {showRisks && score.risks.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs font-medium text-gray-700 mb-1">Potential concerns:</p>
          <div className="space-y-1">
            {score.risks.map((risk, idx) => (
              <div key={idx} className="flex items-start text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" />
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logistics */}
      {score.logistics && (
        <div className="pt-2 border-t flex flex-wrap gap-2">
          {score.logistics.languages_shared.length > 0 && (
            <Badge variant="outline" className="text-xs">
              Languages: {score.logistics.languages_shared.join(", ")}
            </Badge>
          )}
          {score.logistics.timezone_mentee && score.logistics.timezone_mentor && (
            <Badge variant="outline" className="text-xs">
              TZ: {score.logistics.timezone_mentee === score.logistics.timezone_mentor
                ? score.logistics.timezone_mentee
                : `${score.logistics.timezone_mentee} / ${score.logistics.timezone_mentor}`}
            </Badge>
          )}
          {score.is_embedding_based && (
            <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Similarity
            </Badge>
          )}
        </div>
      )}

      {/* AI Explanation */}
      {explanation && (
        <div className="pt-2 border-t">
          <p className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI Match Explanation
          </p>
          <p className="text-sm text-gray-600 italic">{explanation}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual score bar component
 */
function ScoreBar({ component, showDescription = false }: { component: ScoreComponent; showDescription?: boolean }) {
  return (
    <div className="text-xs">
      <div className="flex items-center gap-2">
        <span className="w-24 text-muted-foreground truncate" title={component.description}>
          {component.label}
        </span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(component.color, "h-full transition-all rounded-full")}
            style={{ width: `${component.percentage}%` }}
          />
        </div>
        <span className="w-12 text-right text-muted-foreground">
          {component.value}/{component.maxValue}
        </span>
      </div>
      {showDescription && (
        <p className="text-[11px] text-muted-foreground mt-0.5 ml-[calc(6rem+0.5rem)]">
          {component.description}
        </p>
      )}
    </div>
  );
}

/**
 * Score badge with color coding
 */
export function ScoreBadge({
  score,
  size = 'default'
}: {
  score: number;
  size?: 'sm' | 'default' | 'lg';
}) {
  const getVariant = (): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0",
    default: "text-sm",
    lg: "text-base px-3 py-1"
  };

  return (
    <Badge variant={getVariant()} className={sizeClasses[size]}>
      {Math.round(score)}
    </Badge>
  );
}

/**
 * Capacity indicator showing filled/empty circles
 */
export function CapacityIndicator({
  used,
  total,
  size = 'default'
}: {
  used: number;
  total: number;
  size?: 'sm' | 'default';
}) {
  const remaining = total - used;
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  // Determine color based on remaining capacity
  const getColor = () => {
    const ratio = remaining / total;
    if (ratio <= 0) return 'bg-red-500';
    if (ratio <= 0.33) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-0.5" title={`${remaining} of ${total} slots remaining`}>
      {Array.from({ length: total }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            sizeClass,
            "rounded-full",
            idx < used ? getColor() : "bg-gray-200"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {remaining}/{total}
      </span>
    </div>
  );
}

/**
 * Rank badge showing if this is 1st, 2nd, or 3rd choice for the mentee
 */
export function RankBadge({ rank }: { rank: number }) {
  const labels = ['1st', '2nd', '3rd'];
  const colors = [
    'bg-yellow-100 text-yellow-800 border-yellow-300',
    'bg-gray-100 text-gray-700 border-gray-300',
    'bg-orange-100 text-orange-700 border-orange-300'
  ];

  if (rank < 1 || rank > 3) return null;

  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border",
      colors[rank - 1]
    )}>
      {labels[rank - 1]} choice
    </span>
  );
}
