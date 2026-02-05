import React, { useState, useEffect } from "react";
import { MatchingOutput, MatchingResult, ImportResult, MatchingHistoryEntry, Cohort } from "@/types/mentoring";
import { performBatchMatching, performTop3Matching } from "@/lib/matchingEngine";
import { getActiveMatchingModels, getDefaultMatchingModel } from "@/lib/matchingModelService";
import type { MatchingModel } from "@/types/matching";
import { saveMatchesToCohort } from "@/lib/cohortManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  Globe,
  MessageCircle,
  TrendingUp,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MatchingResultsProps {
  importedData: ImportResult;
  cohort?: Cohort;
  onMatchesApproved?: (matches: MatchingOutput) => void;
  onCohortUpdated?: (cohort: Cohort) => void;
  onReset?: () => void;
  onTop3ResultsReady?: (results: MatchingOutput) => void;
}

export function MatchingResults({ importedData, cohort, onMatchesApproved, onCohortUpdated, onReset, onTop3ResultsReady }: MatchingResultsProps) {
  const [matchingOutput, setMatchingOutput] = useState<MatchingOutput | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"batch" | "top3_per_mentee">("batch");
  const [manualSelections, setManualSelections] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Model selection state
  const [activeModels, setActiveModels] = useState<MatchingModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<MatchingModel | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Fetch active matching models on mount
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const [models, defaultModel] = await Promise.all([
          getActiveMatchingModels(),
          getDefaultMatchingModel()
        ]);
        setActiveModels(models);

        // Pre-select default model if exists, otherwise first active model
        if (defaultModel && defaultModel.status === 'active') {
          setSelectedModel(defaultModel);
        } else if (models.length > 0) {
          setSelectedModel(models[0]);
        }
      } catch (error) {
        console.error("Error loading matching models:", error);
        toast({
          variant: "destructive",
          title: "Failed to load matching models",
          description: "Please try again or contact support",
        });
      } finally {
        setIsLoadingModels(false);
      }
    };
    loadModels();
  }, [toast]);

  const runMatching = async (mode: "batch" | "top3_per_mentee") => {
    setIsMatching(true);
    setSelectedMode(mode);

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = mode === "batch"
        ? performBatchMatching(importedData?.mentees || [], importedData?.mentors || [])
        : performTop3Matching(importedData?.mentees || [], importedData?.mentors || []);

      // Add timestamp to the result
      result.timestamp = new Date().toISOString();

      const modelInfo = selectedModel ? ` using "${selectedModel.name}"` : "";

      if (mode === "top3_per_mentee") {
        // For Top 3 mode, pass results to parent and close dialog
        toast({
          title: "Matching complete",
          description: `Generated ${result.results.length} match recommendations${modelInfo}`,
        });
        onTop3ResultsReady?.(result);
      } else {
        // For batch mode, show results in dialog
        setMatchingOutput(result);
        toast({
          title: "Matching complete",
          description: `Generated ${result.results.length} match recommendations${modelInfo} (not saved yet)`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Matching failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleApproveMatches = async () => {
    if (!matchingOutput || !cohort) return;

    try {
      // Save matches to cohort (updates both matches field and history)
      const updatedCohort = await saveMatchesToCohort(cohort.id, matchingOutput);
      if (updatedCohort) {
        onCohortUpdated?.(updatedCohort);
      }

      toast({
        title: "Matches saved",
        description: "Matching results have been saved and launched",
      });

      // Call the original callback
      onMatchesApproved?.(matchingOutput);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to save matches",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleSelectMentor = (menteeId: string, mentorId: string) => {
    setManualSelections(prev => ({
      ...prev,
      [menteeId]: mentorId
    }));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  if (!matchingOutput) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI Matching Engine
            </CardTitle>
            <CardDescription>
              Run the matching algorithm to find optimal mentor-mentee pairs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Model Selection Dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">Matching Model:</label>
              {isLoadingModels ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : activeModels.length === 0 ? (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    No active models.{" "}
                    <a href="/admin/mentoring/matching-models" className="underline font-medium">
                      Configure one
                    </a>
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={selectedModel?.id || ""}
                  onValueChange={(value) => {
                    const model = activeModels.find(m => m.id === value);
                    if (model) setSelectedModel(model);
                  }}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} v{model.version}
                        {model.is_default && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Statistics */}
                <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{importedData?.mentees?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Mentees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{importedData?.mentors?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Mentors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {(importedData?.mentees?.length || 0) * (importedData?.mentors?.length || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Combinations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {(importedData?.mentors || []).reduce((sum, m) => sum + (m.capacity_remaining || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Capacity</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Matching Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Matching Mode</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-2 hover:border-green-500 hover:shadow-lg transition-all">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold">Batch Assignment</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Assign each mentee to their single best available mentor, respecting capacity constraints.
                    </p>
                    <div className="space-y-2 text-xs text-muted-foreground mb-4 flex-grow">
                      <p>• Each mentee gets one mentor</p>
                      <p>• Respects mentor capacity limits</p>
                      <p>• Optimal for program launch</p>
                    </div>
                    <Button
                      onClick={() => runMatching("batch")}
                      className="w-full"
                      disabled={isMatching || !selectedModel}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Run Batch Assignment
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-blue-500 hover:shadow-lg transition-all">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <Target className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold">Top 3 Recommendations</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Show the top 3 mentor options for each mentee with detailed scoring.
                    </p>
                    <div className="space-y-2 text-xs text-muted-foreground mb-4 flex-grow">
                      <p>• Multiple options per mentee</p>
                      <p>• Detailed match explanations</p>
                      <p>• Good for manual review</p>
                    </div>
                    <Button
                      onClick={() => runMatching("top3_per_mentee")}
                      className="w-full"
                      variant="outline"
                      disabled={isMatching || !selectedModel}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Show Top 3 Options
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {isMatching && (
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="font-medium">Running AI Matching Algorithm...</span>
                  </div>
                  <Progress value={75} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Applying hard filters, calculating feature scores, and ranking matches...
                  </p>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Matching Results
          </CardTitle>
          <CardDescription>
            {matchingOutput.mode === "batch"
              ? "Optimal mentor assignments for program launch"
              : "Top 3 mentor recommendations per mentee"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{matchingOutput.stats.mentees_total}</p>
              <p className="text-sm text-blue-600">Total Mentees</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{matchingOutput.stats.mentors_total}</p>
              <p className="text-sm text-green-600">Total Mentors</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{matchingOutput.stats.pairs_evaluated}</p>
              <p className="text-sm text-purple-600">Pairs Evaluated</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">{matchingOutput.stats.after_filters}</p>
              <p className="text-sm text-indigo-600">Valid Matches</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <Button onClick={() => setMatchingOutput(null)} variant="outline">
              Run New Matching
            </Button>
            <Button onClick={handleApproveMatches}>
              Approve & Launch Matches
            </Button>
          </div>

          {/* Results Display */}
          {matchingOutput.mode === "batch" ? (
            <ScrollArea className="h-[600px] w-full">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentee</TableHead>
                      <TableHead>Assigned Mentor</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Alternates</TableHead>
                      <TableHead>Key Reasons</TableHead>
                      <TableHead>Risks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingOutput.results.map((result) => (
                      <TableRow key={result.mentee_id}>
                        <TableCell className="font-medium">
                          {result.mentee_name || result.mentee_id}
                        </TableCell>
                        <TableCell>
                          {result.proposed_assignment?.mentor_name ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              {result.proposed_assignment.mentor_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No match</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.recommendations[0] && (
                            <Badge variant={getScoreBadgeVariant(result.recommendations[0].score.total_score)}>
                              {Math.round(result.recommendations[0].score.total_score)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {result.recommendations.slice(1, 3).map((rec, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {rec.mentor_name} ({Math.round(rec.score.total_score)})
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {result.recommendations[0] && (
                            <div className="space-y-1">
                              {result.recommendations[0].score.reasons.slice(0, 2).map((reason, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs mr-1">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {result.recommendations[0] && result.recommendations[0].score.risks.length > 0 && (
                            <div className="space-y-1">
                              {result.recommendations[0].score.risks.slice(0, 2).map((risk, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs mr-1">
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-[600px] w-full">
              <div className="space-y-4 pr-4">
                {matchingOutput.results.map((result) => (
                  <Card key={result.mentee_id} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{result.mentee_name || result.mentee_id}</span>
                        {manualSelections[result.mentee_id] && (
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.recommendations.slice(0, 3).map((rec, idx) => {
                        const isSelected = manualSelections[result.mentee_id] === rec.mentor_id;
                        return (
                          <Card
                            key={rec.mentor_id}
                            className={`transition-all ${
                              isSelected
                                ? "border-2 border-green-500 bg-green-50"
                                : "border hover:border-gray-400 cursor-pointer"
                            }`}
                            onClick={() => handleSelectMentor(result.mentee_id, rec.mentor_id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-base">{rec.mentor_name}</h4>
                                    <Badge variant={getScoreBadgeVariant(rec.score.total_score)}>
                                      Score: {Math.round(rec.score.total_score)}
                                    </Badge>
                                  </div>
                                  {rec.mentor_role && (
                                    <p className="text-sm text-muted-foreground mb-2">{rec.mentor_role}</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectMentor(result.mentee_id, rec.mentor_id);
                                  }}
                                >
                                  {isSelected ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Selected
                                    </>
                                  ) : (
                                    "Select"
                                  )}
                                </Button>
                              </div>

                              {rec.score.reasons.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Why this is a good match:</p>
                                  <div className="space-y-1">
                                    {rec.score.reasons.slice(0, 3).map((reason, ridx) => (
                                      <div key={ridx} className="text-xs text-green-700 flex items-start">
                                        <span className="mr-1">✓</span>
                                        <span>{reason}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {rec.score.risks.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-700 mb-1">Potential concerns:</p>
                                  <div className="space-y-1">
                                    {rec.score.risks.slice(0, 2).map((risk, ridx) => (
                                      <div key={ridx} className="text-xs text-red-700 flex items-start">
                                        <span className="mr-1">⚠</span>
                                        <span>{risk}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}