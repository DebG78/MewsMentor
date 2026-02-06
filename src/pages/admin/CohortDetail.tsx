import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
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
} from "lucide-react";
import {
  getCohortById,
  calculateCohortStats,
  validateCohortForMatching,
  updateCohort,
  deleteCohort,
  getCohortStatusInfo,
  addImportDataToCohort,
  saveMatchesToCohort,
} from "@/lib/cohortManager";
import { updateMenteeProfile, updateMentorProfile } from "@/lib/supabaseService";
import { Cohort, ImportResult } from "@/types/mentoring";
import { useToast } from "@/hooks/use-toast";
import { MatchingResults } from "@/components/MatchingResults";
import { ManualMatchSelection } from "@/components/ManualMatchSelection";
import { MentorCentricMatchSelection } from "@/components/MentorCentricMatchSelection";
import { DataImport } from "@/components/DataImport";
import { ProfileModal } from "@/components/ProfileModal";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { MenteeData, MentorData } from "@/types/mentoring";

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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [pendingImportResult, setPendingImportResult] = useState<ImportResult | null>(null);
  const [viewingProfile, setViewingProfile] = useState<{ profile: MenteeData | MentorData; type: 'mentee' | 'mentor' } | null>(null);
  const [editingProfile, setEditingProfile] = useState<{ profile: MenteeData | MentorData; type: 'mentee' | 'mentor' } | null>(null);

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

  const handleStatusChange = async (newStatus: Cohort['status']) => {
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
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update status",
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
  };

  const handleManualSelectionsApproved = async (selections: Record<string, string>, comments?: Record<string, string>) => {
    if (!pendingTop3Results || !cohort) return;

    // Create a modified matching output with user's selections
    const modifiedOutput = {
      ...pendingTop3Results,
      results: pendingTop3Results.results.map((result: any) => {
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
                // Include comment if provided
                ...(comments?.[result.mentee_id] && { comment: comments[result.mentee_id] })
              }
            };
          }
        }
        return result;
      })
    };

    try {
      // Save matches to cohort (updates both matches field and history)
      const updatedCohort = await saveMatchesToCohort(cohort.id, modifiedOutput);
      if (updatedCohort) {
        setCohort(updatedCohort);
      }

      toast({
        title: "Matches saved successfully",
        description: `${Object.keys(selections).length} mentor-mentee pairs have been saved`,
      });

      // Clear pending results
      setPendingTop3Results(null);
      setManualSelections({});
    } catch (error) {
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
          role: menteeProfile.role,
          experience_years: menteeProfile.experience_years,
          location_timezone: menteeProfile.location_timezone,
          topics_to_learn: menteeProfile.topics_to_learn,
          meeting_frequency: menteeProfile.meeting_frequency,
          languages: menteeProfile.languages,
          industry: menteeProfile.industry,
        });
      } else {
        const mentorProfile = updatedProfile as MentorData;
        result = await updateMentorProfile(mentorProfile.id, {
          role: mentorProfile.role,
          experience_years: mentorProfile.experience_years,
          location_timezone: mentorProfile.location_timezone,
          topics_to_mentor: mentorProfile.topics_to_mentor,
          capacity_remaining: mentorProfile.capacity_remaining,
          meeting_frequency: mentorProfile.meeting_frequency,
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
  const validation = validateCohortForMatching(cohort);
  const statusInfo = getCohortStatusInfo(cohort.status);
  const isEmpty = cohort.mentees.length === 0 && cohort.mentors.length === 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/mentoring/cohorts")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cohorts
          </Button>
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
          {validation.isReady && (
            <Dialog open={isMatchingDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Target className="h-4 w-4 mr-2" />
                  Start Matching
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Run Matching Algorithm</DialogTitle>
                  <DialogDescription>
                    Generate match recommendations for "{cohort.name}"
                  </DialogDescription>
                </DialogHeader>
                <MatchingResults
                  key={matchingKey}
                  importedData={{ mentees: cohort.mentees, mentors: cohort.mentors, errors: [], warnings: [] }}
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
              <DropdownMenuItem onClick={() => handleStatusChange('active')}>
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
          <span className="font-semibold">{stats.total_capacity}</span>
          <span className="text-muted-foreground">capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-indigo-600" />
          <span className="font-semibold">{stats.matches_approved}</span>
          <span className="text-muted-foreground">matched</span>
        </div>
      </div>

      {/* Matching Readiness Warning */}
      {!validation.isReady && !isEmpty && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Not ready for matching:</strong>{" "}
            {validation.issues.join(", ")}
          </AlertDescription>
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
        </TabsList>

        {/* Mentors Tab */}
        <TabsContent value="mentors">
          <Card>
            <CardHeader>
              <CardTitle>Mentors</CardTitle>
              <CardDescription>All mentors in this cohort</CardDescription>
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
                  {cohort.mentors.map((mentor, index) => {
                    const isAtCapacity = (mentor.capacity_remaining || 0) === 0;
                    return (
                      <TableRow
                        key={index}
                        className={isAtCapacity ? "opacity-50 bg-gray-50" : ""}
                      >
                        <TableCell className="font-medium">
                          {mentor.id}
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
                            {mentor.capacity_remaining || 0}
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
                  {cohort.mentees.map((mentee, index) => {
                    const hasMatch = cohort.matches?.results?.find(
                      (r) => r.mentee_id === mentee.id && r.proposed_assignment?.mentor_id
                    );
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{mentee.id}</TableCell>
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
                                <TableRow key={index}>
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
      </Tabs>
      )}

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
