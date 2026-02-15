import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  MapPin,
  User,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { MatchingOutput, MentorData, MenteeData, MatchScore } from "@/types/mentoring";
import {
  transformToMentorCentric,
  MentorCentricMatch,
  PotentialMentee,
  validateSelections,
} from "@/utils/matchingDataTransform";
import {
  ScoreBreakdownVisual,
  ScoreBadge,
  CapacityIndicator,
  RankBadge,
} from "@/components/ScoreBreakdownVisual";
import { getOrGenerateExplanation, generateAllExplanations } from "@/lib/explanationService";
import { useToast } from "@/hooks/use-toast";
import { toDisplayName } from '@/lib/displayName';

interface MentorCentricMatchSelectionProps {
  matchingOutput: MatchingOutput;
  mentors: MentorData[];
  mentees?: MenteeData[];
  cohortId?: string;
  onSelectionsApproved: (selections: Record<string, string>, comments?: Record<string, string>) => void;
  onCancel: () => void;
}

export function MentorCentricMatchSelection({
  matchingOutput,
  mentors,
  mentees,
  cohortId,
  onSelectionsApproved,
  onCancel,
}: MentorCentricMatchSelectionProps) {
  const { toast } = useToast();

  // AI explanation state
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [explanationProgress, setExplanationProgress] = useState<{ completed: number; total: number } | null>(null);

  // In batch mode, pre-select the proposed assignments and expand those mentors
  const isBatchMode = matchingOutput.mode === "batch";

  // Transform to mentor-centric format
  // In top3 mode, limit each mentor to their top 3 highest-scoring mentees
  const mentorCentricData = useMemo(
    () => transformToMentorCentric(matchingOutput, mentors, isBatchMode ? undefined : 3),
    [matchingOutput, mentors, isBatchMode]
  );

  const initialSelections = useMemo(() => {
    if (!isBatchMode) return new Map<string, Set<string>>();
    const map = new Map<string, Set<string>>();
    matchingOutput.results.forEach(result => {
      const mentorId = result.proposed_assignment?.mentor_id;
      if (mentorId) {
        const existing = map.get(mentorId) || new Set<string>();
        existing.add(result.mentee_id);
        map.set(mentorId, existing);
      }
    });
    return map;
  }, [isBatchMode, matchingOutput]);

  const initialExpandedMentors = useMemo(() => {
    if (!isBatchMode) return new Set<string>();
    // Expand mentors that have assignments
    return new Set(initialSelections.keys());
  }, [isBatchMode, initialSelections]);

  // Track which mentors are expanded
  const [expandedMentors, setExpandedMentors] = useState<Set<string>>(
    () => initialExpandedMentors
  );

  // Track selections: mentor_id -> Set of mentee_ids
  const [selections, setSelections] = useState<Map<string, Set<string>>>(
    () => initialSelections
  );

  // Track detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    mentor: MentorCentricMatch;
    mentee: PotentialMentee;
  } | null>(null);

  // Track comments: key is `${mentorId}_${menteeId}`, value is comment text
  const [comments, setComments] = useState<Map<string, string>>(() => new Map());

  // Build capacity map
  const mentorCapacities = useMemo(() => {
    const map = new Map<string, number>();
    mentorCentricData.forEach((m) => {
      map.set(m.mentor_id, m.capacity_remaining);
    });
    return map;
  }, [mentorCentricData]);

  // Validation
  const validation = useMemo(
    () => validateSelections(selections, mentorCapacities),
    [selections, mentorCapacities]
  );

  // Calculate stats
  const stats = useMemo(() => {
    let totalSelected = 0;
    const selectedMentees = new Set<string>();

    selections.forEach((menteeSet) => {
      menteeSet.forEach((menteeId) => {
        selectedMentees.add(menteeId);
        totalSelected++;
      });
    });

    return {
      totalMentors: mentorCentricData.length,
      totalMentees: matchingOutput.stats.mentees_total,
      totalSelected,
      uniqueMenteesSelected: selectedMentees.size,
      menteesRemaining:
        matchingOutput.stats.mentees_total - selectedMentees.size,
    };
  }, [selections, mentorCentricData, matchingOutput]);

  // Get mentees already selected (for any mentor)
  const selectedMenteeIds = useMemo(() => {
    const set = new Set<string>();
    selections.forEach((menteeSet) => {
      menteeSet.forEach((id) => set.add(id));
    });
    return set;
  }, [selections]);

  // Handlers
  const toggleMentorExpanded = (mentorId: string) => {
    setExpandedMentors((prev) => {
      const next = new Set(prev);
      if (next.has(mentorId)) {
        next.delete(mentorId);
      } else {
        next.add(mentorId);
      }
      return next;
    });
  };

  const handleToggleMentee = (mentorId: string, menteeId: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const menteeSet = new Set(next.get(mentorId) || []);

      if (menteeSet.has(menteeId)) {
        menteeSet.delete(menteeId);
      } else {
        // Check capacity
        const capacity = mentorCapacities.get(mentorId) || 0;
        if (menteeSet.size >= capacity) {
          toast({
            variant: "destructive",
            title: "Capacity reached",
            description: "This mentor has no more capacity for additional mentees.",
          });
          return prev;
        }
        menteeSet.add(menteeId);
      }

      if (menteeSet.size === 0) {
        next.delete(mentorId);
      } else {
        next.set(mentorId, menteeSet);
      }

      return next;
    });
  };

  const handleShowDetails = (mentor: MentorCentricMatch, mentee: PotentialMentee) => {
    setSelectedDetail({ mentor, mentee });
    setDetailDialogOpen(true);
  };

  const handleCommentChange = (mentorId: string, menteeId: string, comment: string) => {
    const key = `${mentorId}_${menteeId}`;
    setComments((prev) => {
      const next = new Map(prev);
      if (comment.trim()) {
        next.set(key, comment);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const getComment = (mentorId: string, menteeId: string): string => {
    return comments.get(`${mentorId}_${menteeId}`) || "";
  };

  const handleGenerateExplanation = async (menteeId: string, mentorId: string, score: MatchScore) => {
    if (!cohortId || !mentees) return;
    const key = `${menteeId}_${mentorId}`;

    setLoadingExplanations(prev => ({ ...prev, [key]: true }));
    try {
      const mentee = mentees.find(m => m.id === menteeId);
      const mentor = mentors.find(m => m.id === mentorId);
      if (!mentee || !mentor) return;

      const explanation = await getOrGenerateExplanation(cohortId, mentee, mentor, score);
      setExplanations(prev => ({ ...prev, [key]: explanation }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate explanation",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleGenerateAllExplanations = async () => {
    if (!cohortId || !mentees) return;

    setIsGeneratingAll(true);
    setExplanationProgress({ completed: 0, total: 0 });
    try {
      const matchPairs: { mentee: MenteeData; mentor: MentorData; score: MatchScore }[] = [];

      for (const result of matchingOutput.results) {
        const mentee = mentees.find(m => m.id === result.mentee_id);
        if (!mentee) continue;
        const topRec = result.recommendations[0];
        if (!topRec) continue;
        const mentor = mentors.find(m => m.id === topRec.mentor_id);
        if (!mentor) continue;
        matchPairs.push({ mentee, mentor, score: topRec.score });
      }

      setExplanationProgress({ completed: 0, total: matchPairs.length });

      const allExplanations = await generateAllExplanations(
        cohortId,
        matchPairs,
        (completed, total) => {
          setExplanationProgress({ completed, total });
        },
        (key, explanation) => {
          setExplanations(prev => ({ ...prev, [key]: explanation }));
        },
      );

      setExplanations(prev => {
        const updated = { ...prev };
        allExplanations.forEach((explanation, key) => {
          updated[key] = explanation;
        });
        return updated;
      });

      toast({
        title: "Explanations generated",
        description: `Generated ${allExplanations.size} AI match explanations`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate explanations",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGeneratingAll(false);
      setExplanationProgress(null);
    }
  };

  const handleApprove = () => {
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Cannot approve selections",
        description: "Please resolve conflicts before approving.",
      });
      return;
    }

    if (stats.totalSelected === 0) {
      toast({
        variant: "destructive",
        title: "No selections made",
        description: "Please select at least one mentee-mentor pair.",
      });
      return;
    }

    // Convert Map<mentorId, Set<menteeId>> to Record<menteeId, mentorId>
    const result: Record<string, string> = {};
    const matchComments: Record<string, string> = {};

    selections.forEach((menteeSet, mentorId) => {
      menteeSet.forEach((menteeId) => {
        result[menteeId] = mentorId;
        // Include comment if one exists
        const comment = getComment(mentorId, menteeId);
        if (comment) {
          matchComments[menteeId] = comment;
        }
      });
    });

    onSelectionsApproved(result, Object.keys(matchComments).length > 0 ? matchComments : undefined);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {isBatchMode ? "Review Proposed Assignments" : "Assign Mentees to Mentors"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isBatchMode
                  ? "The algorithm assigned each mentee to their best available mentor. Review and approve, or adjust as needed."
                  : "Select which mentees to assign to each mentor. Click on a mentee row for details."}
              </p>
            </div>
            <div className="flex gap-2">
              {cohortId && mentees && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleGenerateAllExplanations}
                    variant="outline"
                    disabled={isGeneratingAll}
                    size="sm"
                  >
                    {isGeneratingAll ? (
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-purple-500 border-t-transparent rounded-full" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {isGeneratingAll
                      ? `Explaining${explanationProgress ? ` (${explanationProgress.completed}/${explanationProgress.total})` : '...'}`
                      : 'AI Explain All'}
                  </Button>
                  {isGeneratingAll && explanationProgress && explanationProgress.total > 0 && (
                    <Progress value={(explanationProgress.completed / explanationProgress.total) * 100} className="w-[100px]" />
                  )}
                </div>
              )}
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={stats.totalSelected === 0 || !validation.isValid}
              >
                Approve{" "}
                {stats.totalSelected > 0 && `(${stats.totalSelected})`}{" "}
                Selections
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Stats Bar */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">
                {stats.totalMentors}
              </p>
              <p className="text-xs text-muted-foreground">Mentors</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-xl font-bold text-purple-600">
                {stats.totalMentees}
              </p>
              <p className="text-xs text-muted-foreground">Mentees</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">
                {stats.uniqueMenteesSelected}
              </p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xl font-bold text-orange-600">
                {stats.menteesRemaining}
              </p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <p className="text-xl font-bold text-indigo-600">
                {mentors.reduce((sum, m) => sum + m.capacity_remaining, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Mentor Slots</p>
            </div>
          </div>

          {/* Validation Errors */}
          {!validation.isValid && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Selection conflicts</p>
                <p className="text-sm text-red-600">
                  {validation.conflictingMentees.size > 0 &&
                    `${validation.conflictingMentees.size} mentee(s) assigned to multiple mentors. `}
                  {validation.overCapacityMentors.size > 0 &&
                    `${validation.overCapacityMentors.size} mentor(s) over capacity.`}
                </p>
              </div>
            </div>
          )}

          {/* Mentor Cards */}
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {mentorCentricData.map((mentor) => (
                <MentorCard
                  key={mentor.mentor_id}
                  mentor={mentor}
                  isExpanded={expandedMentors.has(mentor.mentor_id)}
                  onToggleExpanded={() => toggleMentorExpanded(mentor.mentor_id)}
                  selectedMentees={selections.get(mentor.mentor_id) || new Set()}
                  allSelectedMentees={selectedMenteeIds}
                  conflictingMentees={validation.conflictingMentees}
                  isOverCapacity={validation.overCapacityMentors.has(
                    mentor.mentor_id
                  )}
                  onToggleMentee={(menteeId) =>
                    handleToggleMentee(mentor.mentor_id, menteeId)
                  }
                  onShowDetails={(mentee) => handleShowDetails(mentor, mentee)}
                  getComment={(menteeId) => getComment(mentor.mentor_id, menteeId)}
                  onCommentChange={(menteeId, comment) => handleCommentChange(mentor.mentor_id, menteeId, comment)}
                  explanations={explanations}
                  loadingExplanations={loadingExplanations}
                  onGenerateExplanation={cohortId && mentees ? handleGenerateExplanation : undefined}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Match Details</DialogTitle>
            <DialogDescription>
              {toDisplayName(selectedDetail?.mentee.mentee_name)} with{" "}
              {toDisplayName(selectedDetail?.mentor.mentor_name)}
            </DialogDescription>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Mentee</p>
                  <p className="font-semibold">
                    {toDisplayName(selectedDetail.mentee.mentee_name)}
                  </p>
                </div>
                <div className="text-center">
                  <ScoreBadge score={selectedDetail.mentee.score.total_score} size="lg" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm text-muted-foreground">Mentor</p>
                  <p className="font-semibold">
                    {toDisplayName(selectedDetail.mentor.mentor_name)}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <RankBadge rank={selectedDetail.mentee.rank_for_this_mentee} />
              </div>

              <ScoreBreakdownVisual
                score={selectedDetail.mentee.score}
                variant="detailed"
                showReasons
                showRisks
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Individual mentor card component
 */
interface MentorCardProps {
  mentor: MentorCentricMatch;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  selectedMentees: Set<string>;
  allSelectedMentees: Set<string>;
  conflictingMentees: Set<string>;
  isOverCapacity: boolean;
  onToggleMentee: (menteeId: string) => void;
  onShowDetails: (mentee: PotentialMentee) => void;
  getComment: (menteeId: string) => string;
  onCommentChange: (menteeId: string, comment: string) => void;
  explanations: Record<string, string>;
  loadingExplanations: Record<string, boolean>;
  onGenerateExplanation?: (menteeId: string, mentorId: string, score: MatchScore) => void;
}

function MentorCard({
  mentor,
  isExpanded,
  onToggleExpanded,
  selectedMentees,
  allSelectedMentees,
  conflictingMentees,
  isOverCapacity,
  onToggleMentee,
  onShowDetails,
  getComment,
  onCommentChange,
  explanations,
  loadingExplanations,
  onGenerateExplanation,
}: MentorCardProps) {
  const selectedCount = selectedMentees.size;
  const capacityUsed = selectedCount;

  return (
    <Card
      className={`border-2 transition-colors ${
        isOverCapacity
          ? "border-red-300 bg-red-50/30"
          : selectedCount > 0
          ? "border-green-300 bg-green-50/30"
          : "border-gray-200"
      }`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {toDisplayName(mentor.mentor_name)}
                    </CardTitle>
                    {selectedCount > 0 && (
                      <Badge variant="default" className="text-xs">
                        {selectedCount} selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                    {mentor.mentor_role && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {mentor.mentor_role}
                      </span>
                    )}
                    {mentor.location_timezone && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {mentor.location_timezone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Capacity</p>
                  <CapacityIndicator
                    used={capacityUsed}
                    total={mentor.capacity_remaining}
                  />
                </div>
                <Badge variant="outline">
                  {mentor.potential_mentees.length} matches
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {mentor.potential_mentees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No matching mentees found for this mentor.
              </p>
            ) : (
              <div className="space-y-2">
                {mentor.potential_mentees.map((mentee) => {
                  const isSelected = selectedMentees.has(mentee.mentee_id);
                  const isSelectedElsewhere =
                    !isSelected && allSelectedMentees.has(mentee.mentee_id);
                  const hasConflict = conflictingMentees.has(mentee.mentee_id);

                  return (
                    <div
                      key={mentee.mentee_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        hasConflict
                          ? "border-red-300 bg-red-50"
                          : isSelected
                          ? "border-green-300 bg-green-50"
                          : isSelectedElsewhere
                          ? "border-gray-300 bg-gray-50 opacity-60"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleMentee(mentee.mentee_id)}
                          disabled={
                            isSelectedElsewhere ||
                            (!isSelected &&
                              selectedMentees.size >= mentor.capacity_remaining)
                          }
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div
                            className="cursor-pointer"
                            onClick={() => onShowDetails(mentee)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {toDisplayName(mentee.mentee_name)}
                              </span>
                              <ScoreBadge score={mentee.score.total_score} size="sm" />
                              <RankBadge rank={mentee.rank_for_this_mentee} />
                              {isSelectedElsewhere && (
                                <Badge variant="outline" className="text-xs">
                                  Assigned elsewhere
                                </Badge>
                              )}
                              {hasConflict && (
                                <Badge variant="destructive" className="text-xs">
                                  Conflict
                                </Badge>
                              )}
                            </div>

                            <ScoreBreakdownVisual
                              score={mentee.score}
                              variant="compact"
                              showReasons
                              showRisks
                            />

                            {/* AI Explanation */}
                            {(() => {
                              const key = `${mentee.mentee_id}_${mentor.mentor_id}`;
                              if (explanations[key]) {
                                return (
                                  <div className="mt-2 text-sm text-gray-700 italic">
                                    <div className="flex items-center gap-1 mb-1">
                                      <Sparkles className="w-3 h-3 text-purple-500" />
                                      <span className="text-xs font-medium text-purple-600">AI Match Explanation</span>
                                    </div>
                                    {explanations[key]}
                                  </div>
                                );
                              }
                              if (loadingExplanations[key]) {
                                return (
                                  <div className="mt-2 space-y-1.5">
                                    <div className="flex items-center gap-1">
                                      <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full" />
                                      <span className="text-xs font-medium text-purple-600">Generating AI explanation...</span>
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
                                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5" />
                                  </div>
                                );
                              }
                              if (onGenerateExplanation) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="mt-1 text-xs h-7 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onGenerateExplanation(mentee.mentee_id, mentor.mentor_id, mentee.score);
                                    }}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI Explain Match
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* Comment input - shown when selected */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-muted-foreground mt-2 flex-shrink-0" />
                                <Textarea
                                  placeholder="Add a note about this match (optional)..."
                                  value={getComment(mentee.mentee_id)}
                                  onChange={(e) => onCommentChange(mentee.mentee_id, e.target.value)}
                                  className="min-h-[60px] text-sm resize-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
