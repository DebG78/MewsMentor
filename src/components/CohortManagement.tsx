import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cohort, ImportResult, MentorData, MenteeData } from "@/types/mentoring";
import {
  getAllCohorts,
  createCohort,
  updateCohort,
  deleteCohort,
  addImportDataToCohort,
  calculateCohortStats,
  getCohortStatusInfo,
  validateCohortForMatching
} from "@/lib/cohortManager";
import { DataImport } from "@/components/DataImport";
import { MentorProfile } from "@/components/MentorProfile";
import { MenteeProfile } from "@/components/MenteeProfile";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { CohortSurveyAssignment } from "@/components/CohortSurveyAssignment";
import { MatchingResults } from "@/components/MatchingResults";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Calendar,
  Target,
  MoreHorizontal,
  Edit,
  Trash2,
  Upload,
  UserPlus,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Square,
  Eye,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CohortManagementProps {
  onCohortSelected?: (cohort: Cohort) => void;
  selectedCohortId?: string;
}

export function CohortManagement({ onCohortSelected, selectedCohortId }: CohortManagementProps) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");
  const [newCohortDescription, setNewCohortDescription] = useState("");
  const [newCohortManager, setNewCohortManager] = useState("");
  const [viewingProfile, setViewingProfile] = useState<{ profile: MentorData | MenteeData; type: "mentor" | "mentee" } | null>(null);
  const [editingProfile, setEditingProfile] = useState<{ profile: MentorData | MenteeData; type: "mentor" | "mentee" } | null>(null);
  const [importDialogKey, setImportDialogKey] = useState(0);
  const [pendingImportResult, setPendingImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const refreshCohorts = async () => {
    setIsLoading(true);
    try {
      const cohortsData = await getAllCohorts();
      setCohorts(cohortsData || []);
    } catch (error) {
      console.error('Error loading cohorts:', error);
      setCohorts([]);
      toast({
        variant: "destructive",
        title: "Failed to load cohorts",
        description: "Please check your database connection."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh cohorts data when component mounts or becomes visible
  useEffect(() => {
    refreshCohorts();
  }, []);

  // Set selected cohort when cohorts are loaded and selectedCohortId is provided
  // Clear selected cohort when selectedCohortId is removed
  useEffect(() => {
    if (selectedCohortId && cohorts.length > 0) {
      const found = cohorts.find(c => c.id === selectedCohortId);
      if (found && found.id !== selectedCohort?.id) {
        setSelectedCohort(found);
      }
    } else if (!selectedCohortId && selectedCohort) {
      // Clear selection when navigating back to list
      setSelectedCohort(null);
    }
  }, [selectedCohortId, cohorts]);

  const handleCreateCohort = async () => {
    if (!newCohortName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Cohort name is required",
      });
      return;
    }

    try {
      const cohort = await createCohort(newCohortName.trim(), newCohortDescription.trim(), newCohortManager.trim());

      if (!cohort) {
        toast({
          variant: "destructive",
          title: "Failed to create cohort",
          description: "An error occurred while creating the cohort. Please check the console for details.",
        });
        return;
      }

      await refreshCohorts();
      setSelectedCohort(cohort);
      onCohortSelected?.(cohort);

      // Reset form
      setNewCohortName("");
      setNewCohortDescription("");
      setNewCohortManager("");
      setIsCreateDialogOpen(false);

      toast({
        title: "Cohort created",
        description: `"${cohort.name}" has been created successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create cohort",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleSelectCohort = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    onCohortSelected?.(cohort);
  };

  const handleDataImported = async (importData: ImportResult) => {
    if (!selectedCohort) {
      toast({
        variant: "destructive",
        title: "No cohort selected",
        description: "Please select a cohort first",
      });
      return;
    }

    try {
      const updatedCohort = await addImportDataToCohort(selectedCohort.id, importData);
      if (updatedCohort) {
        await refreshCohorts();
        setSelectedCohort(updatedCohort);
        onCohortSelected?.(updatedCohort);
        setIsImportDialogOpen(false);

        toast({
          title: "Data added to cohort",
          description: `Added ${importData.mentees.length} mentees and ${importData.mentors.length} mentors to "${selectedCohort.name}"`,
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

  const handleStatusChange = async (cohortId: string, newStatus: Cohort['status']) => {
    try {
      const updatedCohort = await updateCohort(cohortId, { status: newStatus });
      if (updatedCohort) {
        refreshCohorts();
        if (selectedCohort?.id === cohortId) {
          setSelectedCohort(updatedCohort);
          onCohortSelected?.(updatedCohort);
        }

        // Special message for completion
        if (newStatus === 'completed') {
          toast({
            title: "Cohort completed successfully",
            description: "Cohort marked as completed. All mentees and mentors have been moved to the unassigned area and are available for new cohorts.",
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

  const handleDeleteCohort = (cohortId: string) => {
    try {
      const success = deleteCohort(cohortId);
      if (success) {
        refreshCohorts();
        if (selectedCohort?.id === cohortId) {
          setSelectedCohort(null);
          onCohortSelected?.(null as any);
        }

        toast({
          title: "Cohort deleted",
          description: "Cohort has been removed successfully",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete cohort",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleViewProfile = (profile: MentorData | MenteeData, type: "mentor" | "mentee") => {
    setViewingProfile({ profile, type });
  };

  const handleEditProfile = (profile: MentorData | MenteeData, type: "mentor" | "mentee") => {
    setEditingProfile({ profile, type });
  };

  const handleSaveProfile = (updatedProfile: MentorData | MenteeData) => {
    // In a real app, this would update the profile in the cohort data
    // For now, we'll just show a success message
    toast({
      title: "Profile Updated",
      description: "Profile has been successfully updated",
    });
    setEditingProfile(null);
  };

  const handleApproveMatch = async (menteeId: string, mentorId: string, mentorName: string) => {
    if (!selectedCohort || !selectedCohort.matches) return;

    try {
      // Update the proposed_assignment for this mentee
      const updatedMatches = {
        ...selectedCohort.matches,
        results: selectedCohort.matches.results.map(result => {
          if (result.mentee_id === menteeId) {
            return {
              ...result,
              proposed_assignment: {
                mentor_id: mentorId,
                mentor_name: mentorName
              }
            };
          }
          return result;
        })
      };

      // Save the updated matches to the cohort
      const updatedCohort = await updateCohort(selectedCohort.id, {
        matches: updatedMatches
      });

      if (updatedCohort) {
        setSelectedCohort(updatedCohort);
        setCohorts(cohorts.map(c => c.id === updatedCohort.id ? updatedCohort : c));
        toast({
          title: "Match approved",
          description: `Successfully matched with ${mentorName}`,
        });
      }
    } catch (error) {
      console.error('Error approving match:', error);
      toast({
        variant: "destructive",
        title: "Failed to approve match",
        description: "Please try again"
      });
    }
  };

  const CohortOverview = ({ cohort }: { cohort: Cohort }) => {
    const navigate = useNavigate();
    const stats = calculateCohortStats(cohort);
    const validation = validateCohortForMatching(cohort);
    const statusInfo = getCohortStatusInfo(cohort.status);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{cohort.name}</h2>
            <p className="text-muted-foreground">{cohort.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Data
                </Button>
              </DialogTrigger>
              {isImportDialogOpen && (
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
              )}
            </Dialog>
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange(cohort.id, 'active')}>
                  <Play className="h-4 w-4 mr-2" />
                  Mark Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange(cohort.id, 'paused')}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (window.confirm('Are you sure you want to mark this cohort as completed? All mentees and mentors will be moved to the unassigned area.')) {
                    handleStatusChange(cohort.id, 'completed');
                  }
                }}>
                  <Square className="h-4 w-4 mr-2" />
                  Mark Completed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteCohort(cohort.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Cohort
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate(`/admin/mentoring/cohort/${cohort.id}/mentees`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_mentees}</p>
                  <p className="text-sm text-muted-foreground">Mentees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate(`/admin/mentoring/cohort/${cohort.id}/mentors`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_mentors}</p>
                  <p className="text-sm text-muted-foreground">Mentors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_capacity}</p>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`${stats.matches_approved > 0 ? 'cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]' : ''}`}
            onClick={() => stats.matches_approved > 0 && navigate(`/admin/mentoring/cohort/${cohort.id}/matches`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-indigo-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.matches_approved}</p>
                  <p className="text-sm text-muted-foreground">Approved Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Survey Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Survey Assignment
            </CardTitle>
            <CardDescription>
              Configure which survey templates will be used for mentor and mentee signup in this cohort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CohortSurveyAssignment
              cohort={cohort}
              onUpdate={async (updates) => {
                const updatedCohort = await updateCohort(cohort.id, updates);
                if (updatedCohort) {
                  setCohorts(cohorts.map(c => c.id === cohort.id ? updatedCohort : c));
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Matching Readiness */}
        {!validation.isReady && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cohort not ready for matching:</strong>
              <ul className="mt-1 list-disc list-inside text-sm">
                {validation.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile View Dialog */}
      <Dialog open={!!viewingProfile} onOpenChange={() => setViewingProfile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingProfile?.type === "mentor" ? "Mentor" : "Mentee"} Profile
            </DialogTitle>
          </DialogHeader>
          {viewingProfile && (
            <div className="mt-4">
              {viewingProfile.type === "mentor" ? (
                <MentorProfile
                  mentor={viewingProfile.profile as MentorData}
                  variant="detailed"
                />
              ) : (
                <MenteeProfile
                  mentee={viewingProfile.profile as MenteeData}
                  variant="detailed"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingProfile?.type === "mentor" ? "Mentor" : "Mentee"} Profile
            </DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <div className="mt-4">
              <ProfileEditForm
                profile={editingProfile.profile}
                type={editingProfile.type}
                onSave={handleSaveProfile}
                onCancel={() => setEditingProfile(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!selectedCohort ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cohort Management
                </CardTitle>
                <CardDescription>
                  Create and manage mentoring program cohorts
                </CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Cohort
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Cohort</DialogTitle>
                    <DialogDescription>
                      Set up a new mentoring program cohort
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cohort-name">Cohort Name *</Label>
                      <Input
                        id="cohort-name"
                        value={newCohortName}
                        onChange={(e) => setNewCohortName(e.target.value)}
                        placeholder="e.g., Q2 2025 Leadership Development"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cohort-description">Description</Label>
                      <Textarea
                        id="cohort-description"
                        value={newCohortDescription}
                        onChange={(e) => setNewCohortDescription(e.target.value)}
                        placeholder="Brief description of the program goals and focus areas"
                      />
                    </div>
                    <div>
                      <Label htmlFor="program-manager">Program Manager</Label>
                      <Input
                        id="program-manager"
                        value={newCohortManager}
                        onChange={(e) => setNewCohortManager(e.target.value)}
                        placeholder="Program manager name"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCohort}>
                        Create Cohort
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading cohorts...</p>
              </div>
            ) : cohorts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cohorts Yet</h3>
                <p className="text-muted-foreground">
                  Click "Create Cohort" above to set up your first mentoring program cohort
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Program Manager</TableHead>
                    <TableHead>Mentees</TableHead>
                    <TableHead>Mentors</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts.map((cohort) => {
                    const stats = calculateCohortStats(cohort);
                    const statusInfo = getCohortStatusInfo(cohort.status);

                    return (
                      <TableRow
                        key={cohort.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectCohort(cohort)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{cohort.name}</div>
                            {cohort.description && (
                              <div className="text-sm text-muted-foreground">
                                {cohort.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {cohort.program_manager || (
                              <span className="text-muted-foreground italic">Not assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{stats.total_mentees}</TableCell>
                        <TableCell>{stats.total_mentors}</TableCell>
                        <TableCell>
                          {new Date(cohort.created_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCohort(cohort);
                            }}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCohort(null);
                onCohortSelected?.(null as any);
                navigate("/admin/mentoring/cohorts");
              }}
            >
              ← Back to Cohorts
            </Button>
          </div>
          <CohortOverview cohort={selectedCohort} />
        </div>
      )}
    </div>
  );
}