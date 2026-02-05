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
import { ArrowLeft, MoreHorizontal, Eye, Edit, CheckCircle, Users, UserCheck, Target } from "lucide-react";
import { getCohortById, calculateCohortStats, validateCohortForMatching } from "@/lib/cohortManager";
import { Cohort } from "@/types/mentoring";
import { useToast } from "@/hooks/use-toast";
import { MatchingResults } from "@/components/MatchingResults";
import { ManualMatchSelection } from "@/components/ManualMatchSelection";
import { MentorCentricMatchSelection } from "@/components/MentorCentricMatchSelection";
import { saveMatchesToCohort } from "@/lib/cohortManager";

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

  const handleTop3ResultsReady = (results: any) => {
    setPendingTop3Results(results);
    setManualSelections({});
    setIsMatchingDialogOpen(false);
    setActiveTab("matches");
  };

  const handleManualSelectionsApproved = async (selections: Record<string, string>) => {
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
                mentor_name: selectedRecommendation.mentor_name
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/mentoring/cohorts/${cohortId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cohort
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{cohort.name}</h1>
            <p className="text-muted-foreground">{cohort.description}</p>
          </div>
        </div>
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
      </div>

      {/* Stats Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
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

        <Card>
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

        <Card>
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

      {/* Tables */}
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
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
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
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
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
    </div>
  );
}
