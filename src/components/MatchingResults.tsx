import React, { useState, useEffect } from "react";
import { MatchingOutput, MatchingResult, ImportResult, MatchingHistoryEntry, Cohort, MenteeData, MentorData, MatchScore } from "@/types/mentoring";
import { performBatchMatching, performTop3Matching, performBatchMatchingAsync, performTop3MatchingAsync } from "@/lib/matchingEngine";
import { getActiveMatchingModels, getDefaultMatchingModel } from "@/lib/matchingModelService";
import { getOrGenerateExplanation, generateAllExplanations } from "@/lib/explanationService";
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
  History,
  Sparkles
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

  // AI embedding and explanation state
  const [embeddingStatus, setEmbeddingStatus] = useState<'idle' | 'loading' | 'success' | 'fallback'>('idle');
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});
  const [isGeneratingAllExplanations, setIsGeneratingAllExplanations] = useState(false);
  const [explanationProgress, setExplanationProgress] = useState<{ completed: number; total: number } | null>(null);

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
    setEmbeddingStatus('loading');
    setExplanations({});

    try {
      const mentees = importedData?.mentees || [];
      const mentors = importedData?.mentors || [];
      const cohortId = cohort?.id || '';

      let result: MatchingOutput;
      let usedEmbeddings = false;

      if (cohortId) {
        // Use AI-enhanced async matching with embeddings
        const asyncResult = mode === "batch"
          ? await performBatchMatchingAsync(mentees, mentors, cohortId)
          : await performTop3MatchingAsync(mentees, mentors, cohortId);

        result = asyncResult.output;
        usedEmbeddings = asyncResult.usedEmbeddings;
      } else {
        // No cohort ID — fall back to synchronous matching
        result = mode === "batch"
          ? performBatchMatching(mentees, mentors)
          : performTop3Matching(mentees, mentors);
      }

      setEmbeddingStatus(usedEmbeddings ? 'success' : 'fallback');

      if (!usedEmbeddings && cohortId) {
        toast({
          title: "AI embeddings unavailable",
          description: "Using keyword-based similarity as fallback",
        });
      }

      // Add timestamp to the result
      result.timestamp = new Date().toISOString();

      const modelInfo = selectedModel ? ` using "${selectedModel.name}"` : "";
      const aiInfo = usedEmbeddings ? " with AI embeddings" : "";

      toast({
        title: "Matching complete",
        description: `Generated ${result.results.length} match recommendations${modelInfo}${aiInfo}`,
      });

      // Always send results to the parent to display on-screen in the matches tab
      onTop3ResultsReady?.(result);
    } catch (error) {
      setEmbeddingStatus('idle');
      toast({
        variant: "destructive",
        title: "Matching failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleGenerateExplanation = async (menteeId: string, mentorId: string, score: MatchScore) => {
    const key = `${menteeId}_${mentorId}`;
    if (!cohort?.id) return;

    setLoadingExplanations(prev => ({ ...prev, [key]: true }));
    try {
      const mentee = importedData?.mentees?.find(m => m.id === menteeId);
      const mentor = importedData?.mentors?.find(m => m.id === mentorId);
      if (!mentee || !mentor) return;

      const explanation = await getOrGenerateExplanation(cohort.id, mentee, mentor, score);
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
    if (!matchingOutput || !cohort?.id) return;

    setIsGeneratingAllExplanations(true);
    setExplanationProgress({ completed: 0, total: 0 });
    try {
      const matches: { mentee: MenteeData; mentor: MentorData; score: MatchScore }[] = [];

      for (const result of matchingOutput.results) {
        const mentee = importedData?.mentees?.find(m => m.id === result.mentee_id);
        if (!mentee) continue;

        // For batch mode, use the proposed assignment; for top3, use the first recommendation
        const topRec = result.recommendations[0];
        if (!topRec) continue;

        const mentor = importedData?.mentors?.find(m => m.id === topRec.mentor_id);
        if (!mentor) continue;

        matches.push({ mentee, mentor, score: topRec.score });
      }

      setExplanationProgress({ completed: 0, total: matches.length });

      const allExplanations = await generateAllExplanations(
        cohort.id,
        matches,
        (completed, total) => {
          setExplanationProgress({ completed, total });
        },
        (key, explanation) => {
          setExplanations(prev => ({ ...prev, [key]: explanation }));
        },
      );

      // Ensure all results are set (in case any were missed by onResult)
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
      setIsGeneratingAllExplanations(false);
      setExplanationProgress(null);
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
      <div className="space-y-4">
        {/* Model Selection */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">Model:</label>
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
              <SelectTrigger className="w-full">
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

        {/* Quick stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{importedData?.mentees?.length || 0}</strong> mentees</span>
          <span><strong className="text-foreground">{importedData?.mentors?.length || 0}</strong> mentors</span>
          <span><strong className="text-foreground">{(importedData?.mentors || []).reduce((sum, m) => sum + (m.capacity_remaining || 0), 0)}</strong> slots</span>
        </div>

        {/* Matching Mode Buttons */}
        <div className="space-y-2">
          <Button
            onClick={() => runMatching("batch")}
            className="w-full justify-start"
            disabled={isMatching || !selectedModel}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            <div className="text-left">
              <div>Batch Assignment</div>
              <div className="text-xs font-normal opacity-80">Auto-assign each mentee to their best mentor</div>
            </div>
          </Button>

          <Button
            onClick={() => runMatching("top3_per_mentee")}
            className="w-full justify-start"
            variant="outline"
            disabled={isMatching || !selectedModel}
          >
            <Target className="h-4 w-4 mr-2" />
            <div className="text-left">
              <div>Top 3 Recommendations</div>
              <div className="text-xs font-normal opacity-60">Show 3 options per mentee for manual review</div>
            </div>
          </Button>
        </div>

        {isMatching && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm font-medium">
                {embeddingStatus === 'loading'
                  ? 'Computing AI embeddings...'
                  : 'Running matching algorithm...'}
              </span>
            </div>
            <Progress value={embeddingStatus === 'loading' ? 30 : 75} className="w-full" />
          </div>
        )}
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

          {/* AI Status Indicator */}
          {embeddingStatus === 'success' && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <Sparkles className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                AI-enhanced matching: semantic similarity powered by OpenAI embeddings
              </AlertDescription>
            </Alert>
          )}
          {embeddingStatus === 'fallback' && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                AI embeddings were unavailable. Results use keyword-based similarity as fallback.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <Button onClick={() => setMatchingOutput(null)} variant="outline">
              Run New Matching
            </Button>
            <Button onClick={handleApproveMatches}>
              Approve & Launch Matches
            </Button>
            {cohort?.id && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerateAllExplanations}
                  variant="outline"
                  disabled={isGeneratingAllExplanations}
                >
                  {isGeneratingAllExplanations ? (
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-purple-500 border-t-transparent rounded-full" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {isGeneratingAllExplanations
                    ? `Generating${explanationProgress ? ` (${explanationProgress.completed}/${explanationProgress.total})` : '...'}`
                    : 'AI Explain All Matches'}
                </Button>
                {isGeneratingAllExplanations && explanationProgress && explanationProgress.total > 0 && (
                  <div className="flex items-center gap-2 min-w-[160px]">
                    <Progress value={(explanationProgress.completed / explanationProgress.total) * 100} className="w-[120px]" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {Math.round((explanationProgress.completed / explanationProgress.total) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
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

                              {/* AI Explanation */}
                              {cohort?.id && (
                                <div className="mt-2 pt-2 border-t">
                                  {explanations[`${result.mentee_id}_${rec.mentor_id}`] ? (
                                    <div className="text-sm text-gray-700 italic">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Sparkles className="w-3 h-3 text-purple-500" />
                                        <span className="text-xs font-medium text-purple-600">AI Match Explanation</span>
                                      </div>
                                      {explanations[`${result.mentee_id}_${rec.mentor_id}`]}
                                    </div>
                                  ) : loadingExplanations[`${result.mentee_id}_${rec.mentor_id}`] ? (
                                    <div className="space-y-2 py-1">
                                      <div className="flex items-center gap-1 mb-1">
                                        <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full" />
                                        <span className="text-xs font-medium text-purple-600">Generating AI explanation...</span>
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                                        <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
                                        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5" />
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerateExplanation(result.mentee_id, rec.mentor_id, rec.score);
                                      }}
                                    >
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI Explain Match
                                    </Button>
                                  )}
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