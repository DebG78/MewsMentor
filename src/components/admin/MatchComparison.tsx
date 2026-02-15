import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  ArrowRight,
  Star,
  AlertTriangle,
  Equal,
  Minus,
  GitCompareArrows,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Cohort,
  MenteeData,
  MentorData,
  ManualMatchingOutput,
  MatchingOutput,
  MatchScore,
} from '@/types/mentoring';
import { calculateMatchScore } from '@/lib/matchingEngine';
import { ScoreBreakdownVisual, ScoreBadge } from '@/components/ScoreBreakdownVisual';
import { toDisplayName } from '@/lib/displayName';

interface MatchComparisonProps {
  cohort: Cohort;
  manualMatches: ManualMatchingOutput;
  aiMatches: MatchingOutput;
}

type ComparisonStatus = 'agreed' | 'different' | 'manual_only' | 'ai_only';

interface ComparisonRow {
  mentee_id: string;
  mentee_name: string;
  manual_mentor_id?: string;
  manual_mentor_name?: string;
  manual_confidence?: number;
  manual_notes?: string;
  ai_mentor_id?: string;
  ai_mentor_name?: string;
  ai_score?: number;
  ai_match_score?: MatchScore;
  manual_ai_score?: MatchScore; // What AI would score the manual pair
  status: ComparisonStatus;
}

function ConfidenceStars({ confidence }: { confidence: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: confidence }, (_, i) => (
        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      ))}
      {Array.from({ length: 5 - confidence }, (_, i) => (
        <Star key={i + confidence} className="w-3 h-3 text-gray-200" />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: ComparisonStatus }) {
  switch (status) {
    case 'agreed':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <Equal className="w-3 h-3 mr-1" />
          Agreed
        </Badge>
      );
    case 'different':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Different
        </Badge>
      );
    case 'manual_only':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Minus className="w-3 h-3 mr-1" />
          Manual Only
        </Badge>
      );
    case 'ai_only':
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
          <Minus className="w-3 h-3 mr-1" />
          AI Only
        </Badge>
      );
  }
}

export function MatchComparison({
  cohort,
  manualMatches,
  aiMatches,
}: MatchComparisonProps) {
  const [selectedRow, setSelectedRow] = useState<ComparisonRow | null>(null);

  // Build lookup maps
  const menteeMap = useMemo(() => {
    const map: Record<string, MenteeData> = {};
    cohort.mentees.forEach(m => { map[m.id] = m; });
    return map;
  }, [cohort.mentees]);

  const mentorMap = useMemo(() => {
    const map: Record<string, MentorData> = {};
    cohort.mentors.forEach(m => { map[m.id] = m; });
    return map;
  }, [cohort.mentors]);

  // Build comparison rows
  const comparisonRows = useMemo(() => {
    const rows: ComparisonRow[] = [];
    const processedMentees = new Set<string>();

    // Process manual matches
    manualMatches.matches.forEach(mm => {
      processedMentees.add(mm.mentee_id);

      // Find AI match for same mentee
      const aiResult = aiMatches.results.find(
        r => r.mentee_id === mm.mentee_id && r.proposed_assignment?.mentor_id
      );

      const aiMentorId = aiResult?.proposed_assignment?.mentor_id || undefined;
      const aiMentorName = aiResult?.proposed_assignment?.mentor_name || undefined;

      // Get AI score for AI's chosen pair
      const aiRec = aiResult?.recommendations?.find(
        r => r.mentor_id === aiMentorId
      );

      // Compute what AI would score the manual pair
      const mentee = menteeMap[mm.mentee_id];
      const manualMentor = mentorMap[mm.mentor_id];
      const manualAiScore =
        mentee && manualMentor
          ? calculateMatchScore(mentee, manualMentor)
          : undefined;

      const status: ComparisonStatus =
        !aiMentorId
          ? 'manual_only'
          : aiMentorId === mm.mentor_id
            ? 'agreed'
            : 'different';

      rows.push({
        mentee_id: mm.mentee_id,
        mentee_name: mm.mentee_name || mm.mentee_id,
        manual_mentor_id: mm.mentor_id,
        manual_mentor_name: mm.mentor_name || mm.mentor_id,
        manual_confidence: mm.confidence,
        manual_notes: mm.notes,
        ai_mentor_id: aiMentorId,
        ai_mentor_name: aiMentorName || aiMentorId,
        ai_score: aiRec?.score?.total_score,
        ai_match_score: aiRec?.score,
        manual_ai_score: manualAiScore,
        status,
      });
    });

    // Process AI matches not in manual
    aiMatches.results.forEach(ar => {
      if (processedMentees.has(ar.mentee_id)) return;
      if (!ar.proposed_assignment?.mentor_id) return;

      const aiRec = ar.recommendations?.find(
        r => r.mentor_id === ar.proposed_assignment?.mentor_id
      );

      rows.push({
        mentee_id: ar.mentee_id,
        mentee_name: ar.mentee_name || ar.mentee_id,
        ai_mentor_id: ar.proposed_assignment.mentor_id,
        ai_mentor_name: ar.proposed_assignment.mentor_name || ar.proposed_assignment.mentor_id,
        ai_score: aiRec?.score?.total_score,
        ai_match_score: aiRec?.score,
        status: 'ai_only',
      });
    });

    // Sort: different first, then agreed, then one-sided
    const order: Record<ComparisonStatus, number> = {
      different: 0,
      agreed: 1,
      manual_only: 2,
      ai_only: 3,
    };
    rows.sort((a, b) => order[a.status] - order[b.status]);

    return rows;
  }, [manualMatches, aiMatches, menteeMap, mentorMap]);

  // Compute stats
  const stats = useMemo(() => {
    const agreed = comparisonRows.filter(r => r.status === 'agreed').length;
    const different = comparisonRows.filter(r => r.status === 'different').length;
    const manualOnly = comparisonRows.filter(r => r.status === 'manual_only').length;
    const aiOnly = comparisonRows.filter(r => r.status === 'ai_only').length;
    const total = agreed + different;
    const agreementRate = total > 0 ? Math.round((agreed / total) * 100) : 0;

    const manualConfidences = comparisonRows
      .filter(r => r.manual_confidence !== undefined)
      .map(r => r.manual_confidence!);
    const avgConfidence =
      manualConfidences.length > 0
        ? (manualConfidences.reduce((s, c) => s + c, 0) / manualConfidences.length).toFixed(1)
        : '—';

    const aiScores = comparisonRows
      .filter(r => r.ai_score !== undefined)
      .map(r => r.ai_score!);
    const avgAiScore =
      aiScores.length > 0
        ? Math.round(aiScores.reduce((s, c) => s + c, 0) / aiScores.length)
        : '—';

    const manualAiScores = comparisonRows
      .filter(r => r.manual_ai_score?.total_score !== undefined)
      .map(r => r.manual_ai_score!.total_score);
    const avgManualAiScore =
      manualAiScores.length > 0
        ? Math.round(manualAiScores.reduce((s, c) => s + c, 0) / manualAiScores.length)
        : '—';

    return {
      agreed,
      different,
      manualOnly,
      aiOnly,
      agreementRate,
      avgConfidence,
      avgAiScore,
      avgManualAiScore,
      totalManual: manualMatches.matches.length,
      totalAi: aiMatches.results.filter(r => r.proposed_assignment?.mentor_id).length,
    };
  }, [comparisonRows, manualMatches, aiMatches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitCompareArrows className="w-5 h-5" />
          Manual vs AI Matching Comparison
        </h2>
        <p className="text-sm text-muted-foreground">
          Compare your manual matches with AI-generated matches to see where they agree and differ.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.agreementRate}%</div>
            <div className="text-xs text-muted-foreground">Agreement Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.agreed}</div>
            <div className="text-xs text-muted-foreground">Same Mentor</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.different}</div>
            <div className="text-xs text-muted-foreground">Different Mentor</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.avgConfidence}</div>
            <div className="text-xs text-muted-foreground">Avg Confidence /5</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.avgAiScore}</div>
            <div className="text-xs text-muted-foreground">Avg AI Score (AI picks)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.avgManualAiScore}</div>
            <div className="text-xs text-muted-foreground">Avg AI Score (your picks)</div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            All Pairs ({comparisonRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentee</TableHead>
                <TableHead>Your Pick</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead className="text-center">AI Score (your pick)</TableHead>
                <TableHead>AI Pick</TableHead>
                <TableHead className="text-center">AI Score</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map(row => (
                <TableRow
                  key={row.mentee_id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/50',
                    row.status === 'agreed' && 'bg-green-50/50',
                    row.status === 'different' && 'bg-amber-50/50'
                  )}
                  onClick={() => setSelectedRow(row)}
                >
                  <TableCell className="font-medium">{toDisplayName(row.mentee_name)}</TableCell>
                  <TableCell>
                    {row.manual_mentor_name ? toDisplayName(row.manual_mentor_name) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.manual_confidence !== undefined ? (
                      <ConfidenceStars confidence={row.manual_confidence} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.manual_ai_score ? (
                      <ScoreBadge score={row.manual_ai_score.total_score} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.ai_mentor_name ? toDisplayName(row.ai_mentor_name) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.ai_score !== undefined ? (
                      <ScoreBadge score={row.ai_score} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={selectedRow !== null}
        onOpenChange={open => {
          if (!open) setSelectedRow(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match Comparison — {toDisplayName(selectedRow?.mentee_name)}</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manual match side */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  Your Manual Pick
                </h3>
                {selectedRow.manual_mentor_name ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="font-medium">
                          {toDisplayName(selectedRow.manual_mentor_name)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {mentorMap[selectedRow.manual_mentor_id!]?.role}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Confidence: </span>
                        <ConfidenceStars confidence={selectedRow.manual_confidence!} />
                      </div>
                      {selectedRow.manual_notes && (
                        <div>
                          <span className="text-sm font-medium">Notes: </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedRow.manual_notes}
                          </p>
                        </div>
                      )}
                      {selectedRow.manual_ai_score && (
                        <div>
                          <span className="text-sm font-medium">
                            What AI thinks of this pair:
                          </span>
                          <div className="mt-2">
                            <ScoreBreakdownVisual
                              score={selectedRow.manual_ai_score}
                              variant="compact"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No manual match for this mentee
                  </p>
                )}
              </div>

              {/* AI match side */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  AI Pick
                </h3>
                {selectedRow.ai_mentor_name ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="font-medium">
                          {toDisplayName(selectedRow.ai_mentor_name)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {mentorMap[selectedRow.ai_mentor_id!]?.role}
                        </div>
                      </div>
                      {selectedRow.ai_match_score && (
                        <div>
                          <span className="text-sm font-medium">
                            AI Score Breakdown:
                          </span>
                          <div className="mt-2">
                            <ScoreBreakdownVisual
                              score={selectedRow.ai_match_score}
                              variant="compact"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No AI match for this mentee
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
