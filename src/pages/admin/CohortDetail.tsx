import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  Users,
  UserCheck,
  Target,
  Upload,
  Play,
  Pause,
  Square,
  Trash2,
  AlertTriangle,
  UserPlus,
  Sparkles,
  ArrowRight,
  Clock,
  Globe,
  MessageSquare,
  Briefcase,
  Search,
} from "lucide-react";
import {
  getCohortById,
  calculateCohortStats,
  updateCohort,
  deleteCohort,
  getCohortStatusInfo,
  addImportDataToCohort,
  saveMatchesToCohort,
  saveManualMatches,
} from "@/lib/cohortManager";
import { updateMenteeProfile, updateMentorProfile } from "@/lib/supabaseService";
import { sendWelcomeMessages } from "@/lib/messageService";
import { Cohort, ImportResult, MatchingResult } from "@/types/mentoring";
import { useToast } from "@/hooks/use-toast";
import { MatchingResults } from "@/components/MatchingResults";
import { ManualMatchSelection } from "@/components/ManualMatchSelection";
import { MentorCentricMatchSelection } from "@/components/MentorCentricMatchSelection";
import { DataImport } from "@/components/DataImport";
import { ProfileModal } from "@/components/ProfileModal";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { MenteeData, MentorData } from "@/types/mentoring";
import { ScoreBreakdownVisual, ScoreBadge } from "@/components/ScoreBreakdownVisual";
import { ManualMatchingBoard } from "@/components/admin/ManualMatchingBoard";
import { MatchComparison } from "@/components/admin/MatchComparison";

export default function CohortDetail() {
  const { cohortId, tab } = useParams<{ cohortId: string; tab?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tab || "mentees");
  const [isMatchingDialogOpen, setIsMatchingDialogOpen] = useState(false);
  const [matchingKey, setMatchingKey] = useState(0);
  const [pendingTop3Results, setPendingTop3Results] = useState<any | null>(null);
  const [manualSelections, setManualSelections] = useState<Record<string, string>>({});
  const [matchViewMode, setMatchViewMode] = useState<'mentee-centric' | 'mentor-centric'>('mentor-centric');
  const [batchDetailResult, setBatchDetailResult] = useState<any | null>(null);
  const [selectedBatchRows, setSelectedBatchRows] = useState<Set<string>>(new Set());
  const [batchComments, setBatchComments] = useState<Record<string, string>>({});
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [pendingImportResult, setPendingImportResult] = useState<ImportResult | null>(null);
  const [viewingProfile, setViewingProfile] = useState<{ profile: MenteeData | MentorData; type: 'mentee' | 'mentor' } | null>(null);
  const [editingProfile, setEditingProfile] = useState<{ profile: MenteeData | MentorData; type: 'mentee' | 'mentor' } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchingResult | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editManager, setEditManager] = useState("");

  useEffect(() => {
    loadCohort();
  }, [cohortId]);

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const loadCohort = async () => {
    if (!cohortId) return;

    try {
      setLoading(true);
      const data = await getCohortById(cohortId);
      if (data) {
        setCohort(data);
      } else {
        toast({
          variant: "destructive",
          title: "Cohort not found",
          description: "The requested cohort could not be found",
        });
        navigate("/admin/mentoring/cohorts");
      }
    } catch (error) {
      console.error("Error loading cohort:", error);
      toast({
        variant: "destructive",
        title: "Error loading cohort",
        description: "Failed to load cohort details",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsMatchingDialogOpen(open);
    if (!open) {
      // Reset the matching component when dialog closes
      setMatchingKey(prev => prev + 1);
    }
  };

  const handleDataImported = async (importData: ImportResult) => {
    if (!cohort) return;

    try {
      const updatedCohort = await addImportDataToCohort(cohort.id, importData);
      if (updatedCohort) {
        setCohort(updatedCohort);
        setPendingImportResult(null);
        setIsImportDialogOpen(false);

        toast({
          title: "Data added to cohort",
          description: `Added ${importData.mentees.length} mentees and ${importData.mentors.length} mentors`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to add data",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleStatusChange = async (newStatus: Cohort['status'], sendMessages = false) => {
    if (!cohort) return;

    try {
      const updatedCohort = await updateCohort(cohort.id, { status: newStatus });
      if (updatedCohort) {
        setCohort(updatedCohort);

        if (newStatus === 'completed') {
          toast({
            title: "Cohort completed",
            description: "All mentees and mentors have been moved to the unassigned area.",
          });
        } else {
          toast({
            title: "Status updated",
            description: `Cohort status changed to ${newStatus}`,
          });
        }

        // Send welcome messages if activating and user opted in
        if (newStatus === 'active' && sendMessages) {
          try {
            const result = await sendWelcomeMessages(cohort.id);
            toast({
              title: "Welcome messages sent",
              description: `${result.sent} messages sent${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
            });
          } catch (msgError) {
            console.error('Welcome messages error:', msgError);
            toast({
              title: "Messages not sent",
              description: "Cohort activated, but welcome messages failed. You can retry from the messaging section.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const openEditDialog = () => {
    if (!cohort) return;
    setEditName(cohort.name);
    setEditDescription(cohort.description || "");
    setEditManager(cohort.program_manager || "");
    setIsEditDialogOpen(true);
  };

  const handleEditCohort = async () => {
    if (!cohort || !editName.trim()) return;

    try {
      const updatedCohort = await updateCohort(cohort.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        program_manager: editManager.trim() || undefined,
      });
      if (updatedCohort) {
        setCohort(updatedCohort);
        setIsEditDialogOpen(false);
        toast({
          title: "Cohort updated",
          description: "Cohort details have been saved",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update cohort",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleDeleteCohort = async () => {
    if (!cohort) return;

    if (!window.confirm(`Are you sure you want to delete "${cohort.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const success = await deleteCohort(cohort.id);
      if (success) {
        toast({
          title: "Cohort deleted",
          description: "Cohort has been removed successfully",
        });
        navigate("/admin/mentoring/cohorts");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete cohort",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleTop3ResultsReady = (results: any) => {
    setPendingTop3Results(results);
    setManualSelections({});
    setIsMatchingDialogOpen(false);
    setActiveTab("matches");

    // For batch mode, pre-select all rows that have a proposed assignment
    if (results.mode === "batch") {
      const preSelected = new Set<string>();
      results.results.forEach((r: any) => {
        if (r.proposed_assignment?.mentor_id) {
          preSelected.add(r.mentee_id);
        }
      });
      setSelectedBatchRows(preSelected);
    }
  };

  const handleManualSelectionsApproved = async (selections: Record<string, string>, comments?: Record<string, string>) => {
    if (!pendingTop3Results || !cohort) return;

    // Create a modified matching output that merges new selections with existing approved matches
    const newResults = pendingTop3Results.results.map((result: any) => {
      const selectedMentorId = selections[result.mentee_id];
      if (selectedMentorId) {
        const selectedRecommendation = result.recommendations.find(
          (rec: any) => rec.mentor_id === selectedMentorId
        );
        if (selectedRecommendation) {
          return {
            ...result,
            proposed_assignment: {
              mentor_id: selectedRecommendation.mentor_id,
              mentor_name: selectedRecommendation.mentor_name,
              ...(comments?.[result.mentee_id] && { comment: comments[result.mentee_id] })
            }
          };
        }
      }
      // Not selected — strip proposed_assignment so it's not saved as approved
      const { proposed_assignment, ...rest } = result;
      return rest;
    });

    // Merge with previously approved matches that aren't in this run
    const newMenteeIds = new Set(newResults.map((r: any) => r.mentee_id));
    const existingApproved = (cohort.matches?.results || []).filter(
      (r) => r.proposed_assignment?.mentor_id && !newMenteeIds.has(r.mentee_id)
    );

    const modifiedOutput = {
      ...pendingTop3Results,
      results: [...existingApproved, ...newResults]
    };

    try {
      // Save matches to cohort (updates both matches field and history)
      console.log('[handleManualSelectionsApproved] Saving matches:', {
        cohortId: cohort.id,
        selectionsCount: Object.keys(selections).length,
        totalResults: modifiedOutput.results.length,
        approvedCount: modifiedOutput.results.filter((r: any) => r.proposed_assignment?.mentor_id).length,
      });

      const updatedCohort = await saveMatchesToCohort(cohort.id, modifiedOutput);

      if (!updatedCohort) {
        console.error('[handleManualSelectionsApproved] saveMatchesToCohort returned null - save failed');
        toast({
          variant: "destructive",
          title: "Failed to save matches",
          description: "The save operation failed. Check browser console for details.",
        });
        return;
      }

      console.log('[handleManualSelectionsApproved] Save successful, matches approved:',
        updatedCohort.matches?.results?.filter((r) => r.proposed_assignment?.mentor_id).length
      );

      setCohort(updatedCohort);

      toast({
        title: "Matches saved successfully",
        description: `${Object.keys(selections).length} mentor-mentee pairs have been saved`,
      });

      // Clear pending results and navigate to matches tab
      setPendingTop3Results(null);
      setManualSelections({});
      setActiveTab("matches");
    } catch (error) {
      console.error('[handleManualSelectionsApproved] Exception:', error);
      toast({
        variant: "destructive",
        title: "Failed to save matches",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleCancelManualSelection = () => {
    setPendingTop3Results(null);
    setManualSelections({});
  };

  const handleClearPendingRecommendations = async () => {
    if (!cohort || !cohort.matches) return;

    try {
      // Filter to keep only approved matches (those with proposed_assignment)
      const approvedMatches = {
        ...cohort.matches,
        results: cohort.matches.results.filter(result => result.proposed_assignment?.mentor_id)
      };

      // Update cohort with only approved matches
      const updatedCohort = await saveMatchesToCohort(cohort.id, approvedMatches);
      if (updatedCohort) {
        setCohort(updatedCohort);
      }

      toast({
        title: "Pending recommendations cleared",
        description: "All unapproved recommendations have been removed",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to clear recommendations",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleContinueSelection = () => {
    if (!cohort || !cohort.matches) return;

    // Filter to get only pending mentees (those without proposed_assignment)
    const pendingMatches = {
      ...cohort.matches,
      results: cohort.matches.results.filter(result => !result.proposed_assignment?.mentor_id)
    };

    // Set as pending results to show in ManualMatchSelection
    setPendingTop3Results(pendingMatches);
    setActiveTab("matches");
  };

  const handleSaveProfile = async (updatedProfile: MenteeData | MentorData) => {
    if (!cohort || !editingProfile) return;

    try {
      let result: { success: boolean; error?: string };

      if (editingProfile.type === 'mentee') {
        const menteeProfile = updatedProfile as MenteeData;
        result = await updateMenteeProfile(menteeProfile.id, {
          full_name: menteeProfile.name,
          pronouns: menteeProfile.pronouns || null,
          role: menteeProfile.role,
          experience_years: menteeProfile.experience_years,
          location_timezone: menteeProfile.location_timezone,
          life_experiences: menteeProfile.life_experiences,
          topics_to_learn: menteeProfile.topics_to_learn,
          motivation: menteeProfile.motivation || null,
          main_reason: menteeProfile.main_reason || null,
          preferred_style: menteeProfile.preferred_mentor_style || null,
          preferred_energy: menteeProfile.preferred_mentor_energy || null,
          feedback_preference: menteeProfile.feedback_preference || null,
          mentor_experience_importance: menteeProfile.mentor_experience_importance || null,
          unwanted_qualities: menteeProfile.what_not_wanted || null,
          mentor_qualities: menteeProfile.desired_qualities || null,
          expectations: menteeProfile.expectations || null,
          meeting_frequency: menteeProfile.meeting_frequency,
          languages: menteeProfile.languages,
          industry: menteeProfile.industry,
        });
      } else {
        const mentorProfile = updatedProfile as MentorData;
        result = await updateMentorProfile(mentorProfile.id, {
          full_name: mentorProfile.name,
          pronouns: mentorProfile.pronouns || null,
          role: mentorProfile.role,
          experience_years: mentorProfile.experience_years,
          location_timezone: mentorProfile.location_timezone,
          life_experiences: mentorProfile.life_experiences,
          topics_to_mentor: mentorProfile.topics_to_mentor,
          has_mentored_before: mentorProfile.has_mentored_before,
          mentoring_style: mentorProfile.mentoring_style || null,
          meeting_style: mentorProfile.meeting_style || null,
          mentor_energy: mentorProfile.mentor_energy || null,
          feedback_style: mentorProfile.feedback_style || null,
          preferred_mentee_level: mentorProfile.preferred_mentee_levels?.join(', ') || null,
          topics_not_to_mentor: mentorProfile.topics_not_to_mentor?.join(', ') || null,
          meeting_frequency: mentorProfile.meeting_frequency,
          motivation: mentorProfile.motivation || null,
          expectations: mentorProfile.expectations || null,
          capacity_remaining: mentorProfile.capacity_remaining,
          languages: mentorProfile.languages,
          industry: mentorProfile.industry,
        });
      }

      if (result.success) {
        // Reload cohort to get updated data
        const refreshedCohort = await getCohortById(cohort.id);
        if (refreshedCohort) {
          setCohort(refreshedCohort);
        }
        setEditingProfile(null);
        toast({
          title: "Profile updated",
          description: `${editingProfile.type === 'mentee' ? 'Mentee' : 'Mentor'} profile has been updated`,
        });
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading cohort details...</p>
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cohort not found</p>
      </div>
    );
  }

  const stats = calculateCohortStats(cohort);
  const statusInfo = getCohortStatusInfo(cohort.status);
  const isEmpty = cohort.mentees.length === 0 && cohort.mentors.length === 0;

  // Compute unmatched mentees and adjusted mentor capacities for re-matching
  const approvedMatches = cohort.matches?.results?.filter(
    (r) => r.proposed_assignment?.mentor_id
  ) || [];
  const matchedMenteeIds = new Set(approvedMatches.map((r) => r.mentee_id));
  const unmatchedMentees = cohort.mentees.filter((m) => !matchedMenteeIds.has(m.id));

  // Count how many mentees are already assigned to each mentor
  const mentorAssignedCounts = new Map<string, number>();
  approvedMatches.forEach((r) => {
    const mid = r.proposed_assignment?.mentor_id;
    if (mid) mentorAssignedCounts.set(mid, (mentorAssignedCounts.get(mid) || 0) + 1);
  });
  const adjustedMentors = cohort.mentors.map((m) => ({
    ...m,
    capacity_remaining: Math.max(0, (m.capacity_remaining || 0) - (mentorAssignedCounts.get(m.id) || 0)),
  }));
  // Lookup for effective capacity per mentor (original capacity minus approved matches)
  const effectiveCapacity = new Map<string, number>(
    adjustedMentors.map((m) => [m.id, m.capacity_remaining])
  );

  // Validate matching readiness using adjusted values (accounts for already-matched mentees)
  const adjustedCapacity = adjustedMentors.reduce((sum, m) => sum + m.capacity_remaining, 0);
  const matchingIssues: string[] = [];
  if (unmatchedMentees.length === 0) {
    matchingIssues.push("All mentees are already matched");
  }
  if (cohort.mentors.length === 0) {
    matchingIssues.push("No mentors in cohort");
  }
  if (adjustedCapacity === 0 && unmatchedMentees.length > 0) {
    matchingIssues.push("No available mentor capacity");
  }
  const matchingReady = matchingIssues.length === 0 && unmatchedMentees.length > 0 && cohort.mentors.length > 0;
  const matchingWarning = matchingReady && adjustedCapacity < unmatchedMentees.length
    ? `Capacity covers ${adjustedCapacity} of ${unmatchedMentees.length} unmatched mentees — partial matching will be used`
    : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{cohort.name}</h1>
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            </div>
            {cohort.description && (
              <p className="text-muted-foreground text-sm">{cohort.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Data Button */}
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={(open) => {
              setIsImportDialogOpen(open);
              if (!open) setPendingImportResult(null);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Add Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Add Data to "{cohort.name}"</DialogTitle>
                <DialogDescription>
                  Upload mentor and mentee data to add to this cohort.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
                <DataImport
                  onDataImported={handleDataImported}
                  importResult={pendingImportResult}
                  onImportResultChange={setPendingImportResult}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Start Matching Button */}
          {matchingReady && (
            <Dialog open={isMatchingDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Target className="h-4 w-4 mr-2" />
                  Start Matching
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Run Matching Algorithm</DialogTitle>
                  <DialogDescription>
                    Generate match recommendations for "{cohort.name}"
                  </DialogDescription>
                </DialogHeader>
                {matchedMenteeIds.size > 0 && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2">
                    {matchedMenteeIds.size} mentee{matchedMenteeIds.size !== 1 ? 's' : ''} already matched — running for {unmatchedMentees.length} remaining
                  </p>
                )}
                <MatchingResults
                  key={matchingKey}
                  importedData={{ mentees: unmatchedMentees, mentors: adjustedMentors, errors: [], warnings: [] }}
                  cohort={cohort}
                  onCohortUpdated={(updated) => {
                    setCohort(updated);
                  }}
                  onMatchesApproved={(matches) => {
                    toast({
                      title: "Matches approved",
                      description: "The matches have been approved and saved",
                    });
                    setIsMatchingDialogOpen(false);
                  }}
                  onTop3ResultsReady={handleTop3ResultsReady}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEditDialog}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Cohort Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const sendMessages = window.confirm(
                  'Mark cohort as active?\n\nClick OK to activate and send welcome messages via Slack to all matched participants.\n\nClick Cancel to activate without sending messages.'
                );
                handleStatusChange('active', sendMessages);
              }}>
                <Play className="h-4 w-4 mr-2" />
                Mark Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (window.confirm('Mark as completed? All participants will be moved to unassigned.')) {
                  handleStatusChange('completed');
                }
              }}>
                <Square className="h-4 w-4 mr-2" />
                Mark Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDeleteCohort} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Cohort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit Cohort Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Cohort Details</DialogTitle>
                <DialogDescription>
                  Update the cohort name, description, or program manager.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-cohort-name">Cohort Name *</Label>
                  <Input
                    id="edit-cohort-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Cohort name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cohort-description">Description</Label>
                  <Textarea
                    id="edit-cohort-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Brief description of the program goals and focus areas"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-program-manager">Program Manager</Label>
                  <Input
                    id="edit-program-manager"
                    value={editManager}
                    onChange={(e) => setEditManager(e.target.value)}
                    placeholder="Program manager name"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditCohort} disabled={!editName.trim()}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Compact Stats Row */}
      <div className="flex items-center gap-6 px-4 py-3 bg-muted/50 rounded-lg text-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="font-semibold">{stats.total_mentees}</span>
          <span className="text-muted-foreground">mentees</span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-green-600" />
          <span className="font-semibold">{stats.total_mentors}</span>
          <span className="text-muted-foreground">mentors</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-600" />
          <span className="font-semibold">{adjustedCapacity}/{stats.total_capacity}</span>
          <span className="text-muted-foreground">slots available</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-indigo-600" />
          <span className="font-semibold">{stats.matches_approved}</span>
          <span className="text-muted-foreground">matched</span>
        </div>
      </div>

      {/* Matching Readiness Warning */}
      {!matchingReady && !isEmpty && matchingIssues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Not ready for matching:</strong>{" "}
            {matchingIssues.join(", ")}
          </AlertDescription>
        </Alert>
      )}
      {matchingWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{matchingWarning}</AlertDescription>
        </Alert>
      )}

      {/* Empty State or Content */}
      {isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No participants yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Add mentees and mentors to this cohort to get started with the matching process.
            </p>
            <Button onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Add Data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
        {!pendingTop3Results && (
          <TabsList>
            <TabsTrigger value="mentees">
              Mentees ({cohort.mentees.length})
            </TabsTrigger>
            <TabsTrigger value="mentors">
              Mentors ({cohort.mentors.length})
            </TabsTrigger>
            {cohort.matches && cohort.matches.results && cohort.matches.results.length > 0 && (
              <TabsTrigger value="matches">
                Matches ({cohort.matches.results.length})
              </TabsTrigger>
            )}
            {cohort.mentees.length > 0 && cohort.mentors.length > 0 && (
              <TabsTrigger value="manual-matching">
                Manual Matching
                {cohort.manual_matches?.matches?.length ? ` (${cohort.manual_matches.matches.length})` : ''}
              </TabsTrigger>
            )}
            {cohort.manual_matches?.matches?.length && cohort.matches?.results?.length ? (
              <TabsTrigger value="compare">
                Compare
              </TabsTrigger>
            ) : null}
          </TabsList>
        )}

        {/* Search bar for mentees/mentors */}
        {(activeTab === 'mentees' || activeTab === 'mentors') && (
          <div className="flex items-center gap-2 mt-4 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              className="w-64"
            />
          </div>
        )}

        {/* Mentors Tab */}
        <TabsContent value="mentors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mentors</CardTitle>
                  <CardDescription>All mentors in this cohort</CardDescription>
                </div>
                {cohort.mentors.some(m => (effectiveCapacity.get(m.id) || 0) === 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const zeroCapMentors = cohort.mentors.filter(m => (effectiveCapacity.get(m.id) || 0) === 0);
                      const input = window.prompt(
                        `${zeroCapMentors.length} mentor(s) have 0 capacity.\nSet their capacity to:`,
                        "2"
                      );
                      if (!input) return;
                      const newCap = parseInt(input, 10);
                      if (isNaN(newCap) || newCap < 1) return;

                      try {
                        await Promise.all(
                          zeroCapMentors.map(m =>
                            updateMentorProfile(m.id, { capacity_remaining: newCap })
                          )
                        );
                        const refreshed = await getCohortById(cohort.id);
                        if (refreshed) setCohort(refreshed);
                        toast({
                          title: "Capacity updated",
                          description: `Set ${zeroCapMentors.length} mentors to capacity ${newCap}`,
                        });
                      } catch (error) {
                        toast({
                          variant: "destructive",
                          title: "Failed to update capacity",
                          description: error instanceof Error ? error.message : "Unknown error",
                        });
                      }
                    }}
                  >
                    Set Default Capacity
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohort.mentors
                    .filter(m => !peopleSearch || (m.name || m.id).toLowerCase().includes(peopleSearch.toLowerCase()))
                    .map((mentor, index) => {
                    const remaining = effectiveCapacity.get(mentor.id) || 0;
                    const isAtCapacity = remaining === 0;
                    return (
                      <TableRow
                        key={index}
                        className={isAtCapacity ? "opacity-50 bg-gray-50" : ""}
                      >
                        <TableCell className="font-medium">
                          {mentor.name || mentor.id}
                          {isAtCapacity && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              At Capacity
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{mentor.role}</TableCell>
                        <TableCell>{mentor.location_timezone}</TableCell>
                        <TableCell>{mentor.experience_years}</TableCell>
                        <TableCell>
                          <Badge
                            variant={isAtCapacity ? "secondary" : "default"}
                            className={isAtCapacity ? "bg-gray-200 text-gray-600" : ""}
                          >
                            {remaining}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingProfile({ profile: mentor, type: 'mentor' })}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingProfile({ profile: mentor, type: 'mentor' })}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mentees Tab */}
        <TabsContent value="mentees">
          <Card>
            <CardHeader>
              <CardTitle>Mentees</CardTitle>
              <CardDescription>All mentees in this cohort</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohort.mentees
                    .filter(m => !peopleSearch || (m.name || m.id).toLowerCase().includes(peopleSearch.toLowerCase()))
                    .map((mentee, index) => {
                    const hasMatch = cohort.matches?.results?.find(
                      (r) => r.mentee_id === mentee.id && r.proposed_assignment?.mentor_id
                    );
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{mentee.name || mentee.id}</TableCell>
                        <TableCell>{mentee.role}</TableCell>
                        <TableCell>{mentee.location_timezone}</TableCell>
                        <TableCell>{mentee.experience_years}</TableCell>
                        <TableCell>
                          {hasMatch ? (
                            <Badge variant="default">Matched</Badge>
                          ) : (
                            <Badge variant="secondary">Unmatched</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingProfile({ profile: mentee, type: 'mentee' })}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingProfile({ profile: mentee, type: 'mentee' })}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matches Tab */}
        {(pendingTop3Results || (cohort.matches && cohort.matches.results && cohort.matches.results.length > 0)) && (
          <TabsContent value="matches">
            {pendingTop3Results ? (
              <div className="space-y-4">
                {/* AI Status Indicator */}
                {pendingTop3Results.results?.[0]?.recommendations?.[0]?.score?.is_embedding_based && (
                  <Alert className="border-green-200 bg-green-50">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      AI-enhanced matching: semantic similarity powered by OpenAI embeddings
                    </AlertDescription>
                  </Alert>
                )}

                {pendingTop3Results.mode === "batch" ? (
                  /* ---- BATCH MODE: simple table ---- */
                  <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Proposed Assignments</CardTitle>
                          <CardDescription>
                            Each mentee was assigned to their best available mentor. A mentor may receive multiple mentees if they have the capacity.
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleCancelManualSelection}>
                            Cancel
                          </Button>
                          <Button
                            disabled={selectedBatchRows.size === 0}
                            onClick={() => {
                              const selections: Record<string, string> = {};
                              pendingTop3Results.results.forEach((r: any) => {
                                if (selectedBatchRows.has(r.mentee_id) && r.proposed_assignment?.mentor_id) {
                                  selections[r.mentee_id] = r.proposed_assignment.mentor_id;
                                }
                              });
                              handleManualSelectionsApproved(selections, batchComments);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Selected ({selectedBatchRows.size})
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={selectedBatchRows.size === pendingTop3Results.results.filter((r: any) => r.proposed_assignment?.mentor_id).length}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const all = new Set<string>();
                                    pendingTop3Results.results.forEach((r: any) => {
                                      if (r.proposed_assignment?.mentor_id) all.add(r.mentee_id);
                                    });
                                    setSelectedBatchRows(all);
                                  } else {
                                    setSelectedBatchRows(new Set());
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>Mentee</TableHead>
                            <TableHead>Assigned Mentor</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead>Why</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTop3Results.results.map((result: any) => {
                            const rec = result.recommendations?.[0];
                            const isSelected = selectedBatchRows.has(result.mentee_id);
                            return (
                              <TableRow
                                key={result.mentee_id}
                                className={`cursor-pointer hover:bg-muted/50 ${!isSelected ? 'opacity-50' : ''}`}
                                onClick={() => setBatchDetailResult(result)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isSelected}
                                    disabled={!result.proposed_assignment?.mentor_id}
                                    onCheckedChange={(checked) => {
                                      setSelectedBatchRows(prev => {
                                        const next = new Set(prev);
                                        if (checked) {
                                          next.add(result.mentee_id);
                                        } else {
                                          next.delete(result.mentee_id);
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {result.mentee_name || result.mentee_id}
                                </TableCell>
                                <TableCell>
                                  {result.proposed_assignment?.mentor_name || (
                                    <span className="text-muted-foreground">No match</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {rec && (
                                    <Badge variant={rec.score.total_score >= 80 ? "default" : rec.score.total_score >= 60 ? "secondary" : "destructive"}>
                                      {Math.round(rec.score.total_score)}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {rec?.score.reasons?.slice(0, 2).join("; ")}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {isSelected && (
                                    <input
                                      type="text"
                                      placeholder="Add notes..."
                                      className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={batchComments[result.mentee_id] || ""}
                                      onChange={(e) => setBatchComments(prev => ({
                                        ...prev,
                                        [result.mentee_id]: e.target.value
                                      }))}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Batch detail dialog */}
                  <Dialog open={!!batchDetailResult} onOpenChange={(open) => !open && setBatchDetailResult(null)}>
                    <DialogContent className="max-w-lg">
                      {batchDetailResult && (() => {
                        const rec = batchDetailResult.recommendations?.[0];
                        return (
                          <>
                            <DialogHeader>
                              <DialogTitle>Match Details</DialogTitle>
                              <DialogDescription>
                                {batchDetailResult.mentee_name} &rarr; {batchDetailResult.proposed_assignment?.mentor_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Score */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Overall Score</span>
                                {rec && (
                                  <ScoreBadge score={rec.score.total_score} size="lg" />
                                )}
                              </div>

                              {/* Score breakdown */}
                              {rec && (
                                <ScoreBreakdownVisual
                                  score={rec.score}
                                  variant="detailed"
                                  showReasons
                                  showRisks
                                />
                              )}

                              {/* Alternates */}
                              {batchDetailResult.recommendations.length > 1 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Other options considered</p>
                                  <div className="space-y-1">
                                    {batchDetailResult.recommendations.slice(1).map((alt: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50">
                                        <span className="text-muted-foreground">{alt.mentor_name}</span>
                                        <Badge variant="outline">{Math.round(alt.score.total_score)}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </DialogContent>
                  </Dialog>
                  </>
                ) : (
                  /* ---- TOP 3 MODE: full selection UI ---- */
                  <>
                    {/* View Mode Toggle */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Choose how to view and assign matches
                      </p>
                      <div className="flex gap-1 p-1 bg-muted rounded-lg">
                        <Button
                          size="sm"
                          variant={matchViewMode === 'mentor-centric' ? 'default' : 'ghost'}
                          onClick={() => setMatchViewMode('mentor-centric')}
                        >
                          By Mentor
                        </Button>
                        <Button
                          size="sm"
                          variant={matchViewMode === 'mentee-centric' ? 'default' : 'ghost'}
                          onClick={() => setMatchViewMode('mentee-centric')}
                        >
                          By Mentee
                        </Button>
                      </div>
                    </div>

                    {/* Render based on view mode */}
                    {matchViewMode === 'mentor-centric' ? (
                      <MentorCentricMatchSelection
                        matchingOutput={pendingTop3Results}
                        mentors={cohort.mentors}
                        mentees={cohort.mentees}
                        cohortId={cohort.id}
                        onSelectionsApproved={handleManualSelectionsApproved}
                        onCancel={handleCancelManualSelection}
                      />
                    ) : (
                      <ManualMatchSelection
                        matchingOutput={pendingTop3Results}
                        onSelectionsApproved={handleManualSelectionsApproved}
                        onCancel={handleCancelManualSelection}
                      />
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Approved Matches Section */}
                {cohort.matches.results.some(r => r.proposed_assignment?.mentor_id) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Approved Matches ({cohort.matches.results.filter(r => r.proposed_assignment?.mentor_id).length})</CardTitle>
                      <CardDescription>Finalized mentor-mentee pairings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mentee</TableHead>
                            <TableHead>Mentor</TableHead>
                            <TableHead>Match Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Top Reasons</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cohort.matches.results
                            .filter(result => result.proposed_assignment?.mentor_id)
                            .map((result, index) => {
                              const assignedMatch = result.proposed_assignment;
                              return (
                                <TableRow
                                  key={index}
                                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => setSelectedMatch(result)}
                                >
                                  <TableCell className="font-medium">
                                    {result.mentee_name || result.mentee_id}
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-medium">
                                      {assignedMatch.mentor_name || assignedMatch.mentor_id}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {Math.round(
                                        result.recommendations.find(
                                          (r) => r.mentor_id === assignedMatch.mentor_id
                                        )?.score.total_score || 0
                                      )}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="default">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Approved
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {result.recommendations
                                      .find((r) => r.mentor_id === assignedMatch.mentor_id)
                                      ?.score.reasons?.slice(0, 2)
                                      .map((reason, i) => (
                                        <div key={i} className="text-xs text-muted-foreground">
                                          • {reason}
                                        </div>
                                      ))}
                                  </TableCell>
                                  <TableCell>
                                    {assignedMatch.comment && (
                                      <span className="text-sm text-muted-foreground italic">
                                        {assignedMatch.comment}
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Pending Recommendations Section */}
                {cohort.matches.results.some(r => !r.proposed_assignment?.mentor_id) && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Pending Recommendations ({cohort.matches.results.filter(r => !r.proposed_assignment?.mentor_id).length})</CardTitle>
                          <CardDescription>Unassigned mentees with match recommendations</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleContinueSelection} variant="outline">
                            Continue Selection
                          </Button>
                          <Button onClick={handleClearPendingRecommendations} variant="destructive">
                            Clear All Pending
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mentee</TableHead>
                            <TableHead>Top Recommendation</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Alternatives</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cohort.matches.results
                            .filter(result => !result.proposed_assignment?.mentor_id)
                            .map((result, index) => {
                              const topMatch = result.recommendations[0];
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">
                                    {result.mentee_name || result.mentee_id}
                                  </TableCell>
                                  <TableCell>
                                    {topMatch ? (
                                      <span className="text-muted-foreground">
                                        {topMatch.mentor_name}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">No recommendations</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {topMatch && (
                                      <Badge variant="outline">
                                        {Math.round(topMatch.score.total_score)}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {result.recommendations.slice(1, 3).map((rec, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs">
                                          {rec.mentor_name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">Pending</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {/* Manual Matching Tab */}
        <TabsContent value="manual-matching">
          <ManualMatchingBoard
            cohort={cohort}
            existingManualMatches={cohort.manual_matches}
            onSave={async (manualMatches) => {
              const updated = await saveManualMatches(cohort.id, manualMatches);
              if (!updated) {
                throw new Error('Failed to save manual matches');
              }
              setCohort(updated);
            }}
            onCancel={() => setActiveTab("mentees")}
          />
        </TabsContent>

        {/* Compare Tab */}
        {cohort.manual_matches?.matches?.length && cohort.matches?.results?.length ? (
          <TabsContent value="compare">
            <MatchComparison
              cohort={cohort}
              manualMatches={cohort.manual_matches}
              aiMatches={cohort.matches}
            />
          </TabsContent>
        ) : null}
      </Tabs>
      )}

      {/* Match Detail Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
          {selectedMatch && (() => {
            const assignment = selectedMatch.proposed_assignment;
            const matchedRec = selectedMatch.recommendations.find(
              r => r.mentor_id === assignment?.mentor_id
            );
            const score = matchedRec?.score;
            const mentee = cohort.mentees?.find(m => m.id === selectedMatch.mentee_id);
            const mentor = cohort.mentors?.find(m => m.id === assignment?.mentor_id);
            const sharedTopics = mentee && mentor
              ? mentee.topics_to_learn.filter(t =>
                  mentor.topics_to_mentor.some(mt => mt.toLowerCase() === t.toLowerCase())
                )
              : [];

            return (
              <div className="overflow-y-auto max-h-[85vh] p-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    {selectedMatch.mentee_name || selectedMatch.mentee_id}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    {assignment?.mentor_name || assignment?.mentor_id}
                  </DialogTitle>
                  <DialogDescription>
                    Match details and compatibility breakdown
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-4">
                  {/* Score Summary */}
                  {score && (
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">{Math.round(score.total_score)}</div>
                        <div className="text-xs text-muted-foreground">Match Score</div>
                      </div>
                      <div className="flex-1">
                        <ScoreBreakdownVisual
                          score={score}
                          variant="detailed"
                          showReasons={false}
                          showRisks={false}
                        />
                      </div>
                    </div>
                  )}

                  {/* Profiles Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Mentee Profile */}
                    <Card>
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Mentee
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2 text-sm">
                        <div className="font-medium">{mentee?.name || selectedMatch.mentee_id}</div>
                        {mentee?.role && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Briefcase className="w-3 h-3" />
                            {mentee.role}
                          </div>
                        )}
                        {mentee?.experience_years && (
                          <div className="text-xs text-muted-foreground">
                            {mentee.experience_years} experience
                            {mentee.seniority_band && ` (${mentee.seniority_band})`}
                          </div>
                        )}
                        {mentee?.location_timezone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Globe className="w-3 h-3" />
                            {mentee.location_timezone}
                          </div>
                        )}
                        {mentee?.topics_to_learn && mentee.topics_to_learn.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Wants to learn:</div>
                            <div className="flex flex-wrap gap-1">
                              {mentee.topics_to_learn.map((t, i) => (
                                <Badge
                                  key={i}
                                  variant={sharedTopics.some(st => st.toLowerCase() === t.toLowerCase()) ? "default" : "secondary"}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {mentee?.preferred_mentor_style && (
                          <div className="text-xs text-muted-foreground">
                            Prefers: {mentee.preferred_mentor_style}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Mentor Profile */}
                    <Card>
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          Mentor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2 text-sm">
                        <div className="font-medium">{mentor?.name || assignment?.mentor_id}</div>
                        {mentor?.role && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Briefcase className="w-3 h-3" />
                            {mentor.role}
                          </div>
                        )}
                        {mentor?.experience_years && (
                          <div className="text-xs text-muted-foreground">
                            {mentor.experience_years} experience
                            {mentor.seniority_band && ` (${mentor.seniority_band})`}
                          </div>
                        )}
                        {mentor?.location_timezone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <Globe className="w-3 h-3" />
                            {mentor.location_timezone}
                          </div>
                        )}
                        {mentor?.topics_to_mentor && mentor.topics_to_mentor.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Can mentor in:</div>
                            <div className="flex flex-wrap gap-1">
                              {mentor.topics_to_mentor.map((t, i) => (
                                <Badge
                                  key={i}
                                  variant={sharedTopics.some(st => st.toLowerCase() === t.toLowerCase()) ? "default" : "secondary"}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {mentor?.mentoring_style && (
                          <div className="text-xs text-muted-foreground">
                            Style: {mentor.mentoring_style}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Shared Topics Highlight */}
                  {sharedTopics.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-green-800 mb-1.5 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {sharedTopics.length} Shared Topic{sharedTopics.length > 1 ? 's' : ''}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sharedTopics.map((t, i) => (
                          <Badge key={i} variant="default" className="text-xs bg-green-600">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Why This Match */}
                  {score && (score.reasons.length > 0 || score.risks.length > 0) && (
                    <div className="space-y-3">
                      {score.reasons.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            Why this is a good match
                          </div>
                          <div className="space-y-1">
                            {score.reasons.map((reason, i) => (
                              <div key={i} className="text-sm text-muted-foreground pl-5">
                                {reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {score.risks.length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Potential concerns
                          </div>
                          <div className="space-y-1">
                            {score.risks.map((risk, i) => (
                              <div key={i} className="text-sm text-muted-foreground pl-5">
                                {risk}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Logistics */}
                  {score?.logistics && (
                    <div className="flex flex-wrap gap-2">
                      {score.logistics.languages_shared.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {score.logistics.languages_shared.join(", ")}
                        </Badge>
                      )}
                      {score.logistics.timezone_mentee && score.logistics.timezone_mentor && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {score.logistics.timezone_mentee === score.logistics.timezone_mentor
                            ? score.logistics.timezone_mentee
                            : `${score.logistics.timezone_mentee} / ${score.logistics.timezone_mentor}`}
                        </Badge>
                      )}
                      {score.logistics.capacity_remaining != null && (
                        <Badge variant="outline" className="text-xs">
                          {score.logistics.capacity_remaining} mentor slot{score.logistics.capacity_remaining !== 1 ? 's' : ''} remaining
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Icebreaker */}
                  {score?.icebreaker && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Icebreaker Suggestion
                      </div>
                      <div className="text-sm text-blue-700">{score.icebreaker}</div>
                    </div>
                  )}

                  {/* AI Explanation */}
                  {score?.ai_explanation && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-purple-800 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Match Explanation
                      </div>
                      <div className="text-sm text-purple-700 italic">{score.ai_explanation}</div>
                    </div>
                  )}

                  {/* Admin Comment */}
                  {assignment?.comment && (
                    <div className="border rounded-lg p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Admin Notes</div>
                      <div className="text-sm italic">{assignment.comment}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      {viewingProfile && (
        <ProfileModal
          profile={{
            ...viewingProfile.profile,
            // Map id to expected field names for ProfileModal
            [viewingProfile.type === 'mentee' ? 'mentee_id' : 'mentor_id']: viewingProfile.profile.id,
            cohort_id: cohort.id
          }}
          type={viewingProfile.type}
          isOpen={!!viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingProfile?.type === 'mentee' ? 'Mentee' : 'Mentor'} Profile
            </DialogTitle>
            <DialogDescription>
              Update profile information for {editingProfile?.profile.id}
            </DialogDescription>
          </DialogHeader>
          {editingProfile && (
            <ProfileEditForm
              profile={editingProfile.profile}
              type={editingProfile.type}
              onSave={handleSaveProfile}
              onCancel={() => setEditingProfile(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
