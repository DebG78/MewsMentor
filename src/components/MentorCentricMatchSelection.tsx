import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { MatchingOutput, MentorData } from "@/types/mentoring";
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
import { useToast } from "@/hooks/use-toast";

interface MentorCentricMatchSelectionProps {
  matchingOutput: MatchingOutput;
  mentors: MentorData[];
  onSelectionsApproved: (selections: Record<string, string>) => void;
  onCancel: () => void;
}

export function MentorCentricMatchSelection({
  matchingOutput,
  mentors,
  onSelectionsApproved,
  onCancel,
}: MentorCentricMatchSelectionProps) {
  const { toast } = useToast();

  // Transform to mentor-centric format
  const mentorCentricData = useMemo(
    () => transformToMentorCentric(matchingOutput, mentors),
    [matchingOutput, mentors]
  );

  // Track which mentors are expanded (all collapsed by default)
  const [expandedMentors, setExpandedMentors] = useState<Set<string>>(
    () => new Set()
  );

  // Track selections: mentor_id -> Set of mentee_ids
  const [selections, setSelections] = useState<Map<string, Set<string>>>(
    () => new Map()
  );

  // Track detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    mentor: MentorCentricMatch;
    mentee: PotentialMentee;
  } | null>(null);

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
    selections.forEach((menteeSet, mentorId) => {
      menteeSet.forEach((menteeId) => {
        result[menteeId] = mentorId;
      });
    });

    onSelectionsApproved(result);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assign Mentees to Mentors
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select which mentees to assign to each mentor. Click on a mentee row for details.
              </p>
            </div>
            <div className="flex gap-2">
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
              <p className="text-xs text-muted-foreground">Total Capacity</p>
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
              {selectedDetail?.mentee.mentee_name} with{" "}
              {selectedDetail?.mentor.mentor_name}
            </DialogDescription>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Mentee</p>
                  <p className="font-semibold">
                    {selectedDetail.mentee.mentee_name}
                  </p>
                </div>
                <div className="text-center">
                  <ScoreBadge score={selectedDetail.mentee.score.total_score} size="lg" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm text-muted-foreground">Mentor</p>
                  <p className="font-semibold">
                    {selectedDetail.mentor.mentor_name}
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
                      {mentor.mentor_name}
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

                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => onShowDetails(mentee)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {mentee.mentee_name}
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
