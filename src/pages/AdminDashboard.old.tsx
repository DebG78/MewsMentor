import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Target,
  Search,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  Copy,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  Award,
  AlertCircle,
  Mail,
  Database,
  Upload,
  Edit,
  Save,
  X,
  Trash2,
  FileText,
  Play,
  Pause,
  Square,
  LayoutDashboard,
  Eye,
  BarChart3,
  UserCog
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AutomatedMessages } from "@/components/AutomatedMessages";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { AllProfiles } from "@/components/AllProfiles";
import { DataImport } from "@/components/DataImport";
import { MatchingResults } from "@/components/MatchingResults";
import { CohortManagement } from "@/components/CohortManagement";
import { CohortSurveyAssignment } from "@/components/CohortSurveyAssignment";
import { HoldingArea } from "@/components/HoldingArea";
import { ImportResult, MatchingOutput, Cohort } from "@/types/mentoring";
import { addImportDataToCohort, updateCohort, saveMatchesToCohort, deleteCohort } from "@/lib/cohortManager";
import { deletePair, assignPair } from "@/lib/supabaseService";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [mentoringTab, setMentoringTab] = useState("cohorts");
  const [crossExposureTab, setCrossExposureTab] = useState("offerings");
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [isEditingCohort, setIsEditingCohort] = useState(false);
  const [cohortListKey, setCohortListKey] = useState(0);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    program_manager: "",
    target_skills: [] as string[],
    success_rate_target: 85
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCohortSelected = (cohort: Cohort | null) => {
    setSelectedCohort(cohort);
    if (cohort) {
      setMentoringTab("cohort-overview");
    }
  };

  const handleLaunchSelected = async (matches: MatchingOutput) => {
    if (selectedCohort) {
      try {
        console.log('Launching matches for cohort:', selectedCohort.id);
        console.log('Matches to save:', matches);

        const updatedCohort = await saveMatchesToCohort(selectedCohort.id, matches);
        console.log('Updated cohort result:', updatedCohort);

        if (updatedCohort) {
          setSelectedCohort(updatedCohort);
          toast({
            title: "Matches launched successfully!",
            description: `${matches.results?.length || 0} mentor-mentee pairs have been saved and are ready for launch.`,
          });
        } else {
          console.error('saveMatchesToCohort returned null');
          toast({
            variant: "destructive",
            title: "Failed to save matches",
            description: "Could not save the matches to the cohort.",
          });
        }
      } catch (error) {
        console.error('Error in handleLaunchSelected:', error);
        toast({
          variant: "destructive",
          title: "Failed to save matches",
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const handleDataImported = async (importResult: ImportResult) => {
    if (selectedCohort) {
      try {
        const updatedCohort = await addImportDataToCohort(selectedCohort.id, importResult);
        if (updatedCohort) {
          setSelectedCohort(updatedCohort);
          toast({
            title: "Data imported successfully!",
            description: `Added ${importResult.mentees.length} mentees and ${importResult.mentors.length} mentors to cohort.`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Import failed",
            description: "Failed to add data to cohort. Please try again.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        });
      }
    }
  };

  const handleEditCohort = () => {
    if (selectedCohort) {
      setEditForm({
        name: selectedCohort.name,
        description: selectedCohort.description || "",
        program_manager: selectedCohort.program_manager || "",
        target_skills: selectedCohort.target_skills || [],
        success_rate_target: selectedCohort.success_rate_target
      });
      setIsEditingCohort(true);
    }
  };

  const handleSaveCohort = () => {
    if (selectedCohort) {
      const updatedCohort = updateCohort(selectedCohort.id, {
        name: editForm.name,
        description: editForm.description,
        program_manager: editForm.program_manager,
        target_skills: editForm.target_skills,
        success_rate_target: editForm.success_rate_target
      });

      if (updatedCohort) {
        setSelectedCohort(updatedCohort);
        setIsEditingCohort(false);
        setCohortListKey(prev => prev + 1); // Force refresh of cohort list
        toast({
          title: "Cohort updated successfully!",
          description: "Changes have been saved.",
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditingCohort(false);
    setEditForm({
      name: "",
      description: "",
      program_manager: "",
      target_skills: [],
      success_rate_target: 85
    });
  };

  const addTargetSkill = (skill: string) => {
    if (skill.trim() && !editForm.target_skills.includes(skill.trim())) {
      setEditForm(prev => ({
        ...prev,
        target_skills: [...prev.target_skills, skill.trim()]
      }));
    }
  };

  const removeTargetSkill = (skillToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      target_skills: prev.target_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleDeleteCohort = async (cohortId: string) => {
    if (window.confirm('Are you sure you want to delete this cohort? This action cannot be undone.')) {
      try {
        const success = await deleteCohort(cohortId);

        if (success) {
          toast({
            title: "Cohort deleted successfully",
            description: "The cohort has been removed. Mentees and mentors have been moved to the unassigned area.",
          });

          // Navigate back to cohorts list
          setSelectedCohort(null);
          setActiveTab("cohorts");
          setCohortListKey(prev => prev + 1); // Force refresh of cohort list
        } else {
          throw new Error('Failed to delete cohort');
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to delete cohort",
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedCohort) return;

    try {
      const updatedCohort = await updateCohort(selectedCohort.id, { status: newStatus });

      if (updatedCohort) {
        setSelectedCohort(updatedCohort);
        setCohortListKey(prev => prev + 1); // Force refresh of cohort list

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
      } else {
        throw new Error('Failed to update cohort status');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleDeletePair = async (menteeId: string) => {
    if (!selectedCohort) return;

    if (window.confirm('Are you sure you want to unassign this mentor-mentee pair?')) {
      try {
        const updatedCohort = await deletePair(selectedCohort.id, menteeId);

        if (updatedCohort) {
          setSelectedCohort(updatedCohort);
          toast({
            title: "Pair unassigned successfully",
            description: "The mentor-mentee pair has been unassigned. Both are now available for re-matching.",
          });
        } else {
          throw new Error('Failed to unassign pair');
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to unassign pair",
          description: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const handleAssignPair = async (menteeId: string, mentorId: string, mentorName?: string) => {
    if (!selectedCohort) return;

    try {
      const updatedCohort = await assignPair(selectedCohort.id, menteeId, mentorId, mentorName);

      if (updatedCohort) {
        setSelectedCohort(updatedCohort);
        toast({
          title: "Pair assigned successfully",
          description: "The mentor-mentee pair has been created.",
        });
      } else {
        throw new Error('Failed to assign pair');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to assign pair",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage all programs and participants</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Main Program-Based Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="mentoring">
                <Target className="w-4 h-4 mr-2" />
                Mentoring Program
              </TabsTrigger>
              <TabsTrigger value="cross-exposure">
                <Eye className="w-4 h-4 mr-2" />
                Cross-Exposure Program
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                People & Analytics
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      Mentoring Program
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Active Cohorts</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Active Pairs</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                        <span className="font-semibold">--</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => setActiveTab("mentoring")}
                    >
                      Manage Mentoring
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-green-600" />
                      Cross-Exposure Program
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Active Offerings</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Bookings</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Active Hosts</span>
                        <span className="font-semibold">--</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => setActiveTab("cross-exposure")}
                    >
                      Manage Cross-Exposure
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-purple-600" />
                      Overall Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Participants</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Growth Events</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Skills Developed</span>
                        <span className="font-semibold">--</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => setActiveTab("analytics")}
                    >
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates across all programs</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Activity feed coming soon...
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* MENTORING PROGRAM TAB */}
            <TabsContent value="mentoring" className="space-y-6">
              {selectedCohort && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedCohort(null);
                  setMentoringTab("cohorts");
                  setCohortListKey(prev => prev + 1);
                }}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to cohorts
                </Button>
              )}

              <Tabs value={mentoringTab} onValueChange={setMentoringTab} className="w-full">
                {!selectedCohort ? (
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="cohorts">
                      <Users className="w-4 h-4 mr-2" />
                      Cohorts
                    </TabsTrigger>
                    <TabsTrigger value="holding">
                      <Clock className="w-4 h-4 mr-2" />
                      Unassigned
                    </TabsTrigger>
                    <TabsTrigger value="sessions">
                      <Calendar className="w-4 h-4 mr-2" />
                      Sessions
                    </TabsTrigger>
                    <TabsTrigger value="messages">
                      <Mail className="w-4 h-4 mr-2" />
                      Messages
                    </TabsTrigger>
                  </TabsList>
                ) : (
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="cohort-overview">
                      <Users className="w-4 h-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="matching">
                      <Target className="w-4 h-4 mr-2" />
                      AI Matching
                    </TabsTrigger>
                    <TabsTrigger value="pairs">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Pairs
                    </TabsTrigger>
                    <TabsTrigger value="profiles">
                      <Users className="w-4 h-4 mr-2" />
                      Profiles
                    </TabsTrigger>
                    <TabsTrigger value="cohort-sessions">
                      <Calendar className="w-4 h-4 mr-2" />
                      Sessions
                    </TabsTrigger>
                    <TabsTrigger value="cohort-messages">
                      <Mail className="w-4 h-4 mr-2" />
                      Messages
                    </TabsTrigger>
                  </TabsList>
                )}

            <TabsContent value="cohorts" className="space-y-6">
              <CohortManagement
                onCohortSelected={handleCohortSelected}
                key={`cohort-management-${cohortListKey}`}
              />
            </TabsContent>

            <TabsContent value="holding" className="space-y-6">
              <HoldingArea />
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              {selectedCohort && (
                <div className="space-y-6">
                  {/* Cohort Stats */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium">Mentees</span>
                      </div>
                      <div className="text-2xl font-bold">{selectedCohort.mentees?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Total enrolled</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">Mentors</span>
                      </div>
                      <div className="text-2xl font-bold">{selectedCohort.mentors?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium">Status</span>
                      </div>
                      <div className="text-lg font-bold capitalize">{selectedCohort.status}</div>
                      <p className="text-xs text-muted-foreground">Current state</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-amber-600" />
                        <span className="text-sm font-medium">Target Rate</span>
                      </div>
                      <div className="text-2xl font-bold">{selectedCohort.success_rate_target}%</div>
                      <p className="text-xs text-muted-foreground">Success goal</p>
                    </Card>
                  </div>

                  {/* Cohort Details */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">Cohort Information</h3>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleEditCohort}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteCohort(selectedCohort.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              <span className="text-destructive">Delete Cohort</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="mt-1">{selectedCohort.description || "No description provided"}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Program Manager</label>
                          <p className="mt-1">{selectedCohort.program_manager || "Not assigned"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Created</label>
                          <p className="mt-1">{new Date(selectedCohort.created_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {selectedCohort.target_skills && selectedCohort.target_skills?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Target Skills</label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {selectedCohort.target_skills.map((skill, index) => (
                              <Badge key={index} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status Management */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status Actions</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('active')}
                            disabled={selectedCohort.status === 'active'}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Mark Active
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('paused')}
                            disabled={selectedCohort.status === 'paused'}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to mark this cohort as completed? All mentees and mentors will be moved to the unassigned area.')) {
                                handleStatusChange('completed');
                              }
                            }}
                            disabled={selectedCohort.status === 'completed'}
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Mark Completed
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>

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
                        cohort={selectedCohort}
                        onUpdate={async (updates) => {
                          const updatedCohort = await updateCohort(selectedCohort.id, updates);
                          if (updatedCohort) {
                            setSelectedCohort(updatedCohort);
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Data Import Section */}
                  <Card className="p-6 border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                      <Upload className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-primary">🔄 Import Mentors & Mentees</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Upload a CSV file to add new mentors and mentees to this cohort. The system will automatically parse the data and add it to the existing cohort members.
                    </p>
                    <DataImport onDataImported={handleDataImported} />
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="matching" className="space-y-6">
              {selectedCohort ? (
                <MatchingResults
                  importedData={{
                    mentees: selectedCohort.mentees,
                    mentors: selectedCohort.mentors,
                    summary: {
                      total_imported: (selectedCohort.mentees?.length || 0) + (selectedCohort.mentors?.length || 0),
                      mentees_imported: selectedCohort.mentees?.length || 0,
                      mentors_imported: selectedCohort.mentors?.length || 0,
                      validation_errors: []
                    }
                  }}
                  cohort={selectedCohort}
                  onMatchesApproved={handleLaunchSelected}
                  onCohortUpdated={setSelectedCohort}
                />
              ) : (
                <Card className="p-12 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Cohort</h3>
                  <p className="text-muted-foreground">
                    Choose a cohort from the Cohorts tab to run AI matching
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pairs" className="space-y-6">
              {selectedCohort ? (
                <div className="space-y-6">
                  {/* Pairs Overview Stats */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium">Active Pairs</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {(() => {
                          console.log('Cohort matches data:', selectedCohort.matches);
                          console.log('Match results:', selectedCohort.matches?.results);
                          const pairs = selectedCohort.matches?.results?.filter(r => r.proposed_assignment?.mentor_id)?.length || 0;
                          console.log('Active pairs count:', pairs);
                          return pairs;
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">Launched matches</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium">Sessions</span>
                      </div>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Total scheduled</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-amber-600" />
                        <span className="text-sm font-medium">Avg Score</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {selectedCohort.matches?.results?.length > 0 ?
                          Math.round(
                            (selectedCohort.matches.results || [])
                              .filter(r => r.proposed_assignment?.mentor_id && r.recommendations?.[0])
                              .reduce((sum, r) => sum + (r.recommendations?.[0]?.score?.total_score || 0), 0) /
                            Math.max(1, (selectedCohort.matches.results?.filter(r => r.proposed_assignment?.mentor_id)?.length || 1))
                          ) : 0
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">Match quality</p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-medium">Success Rate</span>
                      </div>
                      <div className="text-2xl font-bold">--</div>
                      <p className="text-xs text-muted-foreground">Coming soon</p>
                    </Card>
                  </div>

                  {/* Active Pairs List */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="text-lg font-semibold">Active Mentor-Mentee Pairs</h3>
                      </div>
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4 mr-2" />
                        Send Update to All
                      </Button>
                    </div>

                    {(selectedCohort.matches?.results?.filter(r => r.proposed_assignment?.mentor_id)?.length || 0) > 0 ? (
                      <div className="space-y-4">
                        {(selectedCohort.matches?.results || [])
                          .filter(result => result.proposed_assignment?.mentor_id)
                          .map((result, index) => (
                          <Card key={index} className="p-4 border-l-4 border-l-green-500">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Mentee */}
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{result.mentee_name || result.mentee_id}</div>
                                    <div className="text-sm text-muted-foreground">Mentee</div>
                                  </div>
                                </div>

                                <ArrowRight className="w-5 h-5 text-muted-foreground mx-2" />

                                {/* Mentor */}
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <Target className="w-5 h-5 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{result.proposed_assignment?.mentor_name}</div>
                                    <div className="text-sm text-muted-foreground">Mentor</div>
                                  </div>
                                </div>

                                {/* Match Info */}
                                <div className="ml-4">
                                  {result.recommendations[0] && (
                                    <Badge variant="default" className="mb-1">
                                      {Math.round(result.recommendations[0].score.total_score)} match score
                                    </Badge>
                                  )}
                                  <div className="flex gap-1 flex-wrap">
                                    {result.recommendations[0]?.score.reasons.slice(0, 2).map((reason, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {reason}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-green-600">
                                  Active
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Calendar className="w-4 h-4 mr-2" />
                                      Schedule Session
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Mail className="w-4 h-4 mr-2" />
                                      Send Message
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeletePair(result.mentee_id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Unassign Pair
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-semibold mb-2">No Active Pairs</h4>
                        <p className="mb-4">Run AI matching and launch pairs to see them here.</p>
                        <Button variant="outline" onClick={() => setActiveTab("matching")}>
                          <Target className="w-4 h-4 mr-2" />
                          Go to AI Matching
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Unassigned Pairs */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <h3 className="text-lg font-semibold">Unassigned Mentees</h3>
                        <Badge variant="outline" className="border-amber-200 text-amber-700">
                          {selectedCohort.matches?.results?.filter(r => !r.proposed_assignment?.mentor_id)?.length || 0}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("matching")}>
                        <Target className="w-4 h-4 mr-2" />
                        Re-match All
                      </Button>
                    </div>

                    {(selectedCohort.matches?.results?.filter(r => !r.proposed_assignment?.mentor_id)?.length || 0) > 0 ? (
                      <div className="space-y-4">
                        {(selectedCohort.matches?.results || [])
                          .filter(result => !result.proposed_assignment?.mentor_id)
                          .map((result, index) => (
                          <Card key={index} className="p-4 border-l-4 border-l-amber-500">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Mentee */}
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{result.mentee_name || result.mentee_id}</div>
                                    <div className="text-sm text-muted-foreground">Mentee • Unassigned</div>
                                  </div>
                                </div>

                                {/* Available Mentors */}
                                <div className="ml-4 flex-1">
                                  <div className="text-sm text-muted-foreground mb-2">Top recommendations:</div>
                                  <div className="flex gap-2 flex-wrap">
                                    {result.recommendations?.slice(0, 3).map((rec, idx) => (
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAssignPair(result.mentee_id, rec.mentor_id, rec.mentor_name)}
                                        className="text-xs"
                                      >
                                        {rec.mentor_name || rec.mentor_id} ({Math.round(rec.score.total_score)})
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setActiveTab("matching")}>
                                    <Target className="w-4 h-4 mr-2" />
                                    Find New Matches
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-semibold mb-2">No Unassigned Mentees</h4>
                        <p className="mb-4">All mentees have been assigned to mentors.</p>
                      </div>
                    )}
                  </Card>
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Cohort</h3>
                  <p className="text-muted-foreground">
                    Choose a cohort from the Cohorts tab to view mentor-mentee pairs
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="profiles" className="space-y-6">
              <AllProfiles selectedCohort={selectedCohort} />
            </TabsContent>

            <TabsContent value="sessions" className="space-y-6">
              <SessionAnalytics selectedCohort={selectedCohort} />
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <AutomatedMessages />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Cohort Dialog */}
      <Dialog open={isEditingCohort} onOpenChange={setIsEditingCohort}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Cohort Details</DialogTitle>
            <DialogDescription>
              Update the cohort information and settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cohort Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cohort Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter cohort name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter cohort description"
                rows={3}
              />
            </div>

            {/* Program Manager */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Program Manager</label>
              <Input
                value={editForm.program_manager}
                onChange={(e) => setEditForm(prev => ({ ...prev, program_manager: e.target.value }))}
                placeholder="Enter program manager name"
              />
            </div>

            {/* Success Rate Target */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Success Rate Target (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={editForm.success_rate_target}
                onChange={(e) => setEditForm(prev => ({ ...prev, success_rate_target: parseInt(e.target.value) || 85 }))}
                placeholder="85"
              />
            </div>

            {/* Target Skills */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Skills</label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {editForm.target_skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeTargetSkill(skill)}
                    >
                      {skill}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill (press Enter)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTargetSkill(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Click on skills to remove them, or type and press Enter to add new ones
                </p>
              </div>
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveCohort}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;