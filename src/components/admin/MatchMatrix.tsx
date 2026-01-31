import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, Filter, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreBreakdown } from '@/types/matching';

interface MatrixScore {
  menteeId: string;
  menteeName: string;
  mentorId: string;
  mentorName: string;
  score: number;
  breakdown?: ScoreBreakdown[];
  isAssigned?: boolean;
}

interface MatchMatrixProps {
  mentees: Array<{ id: string; name: string; topics: string[] }>;
  mentors: Array<{ id: string; name: string; topics: string[]; capacity: number }>;
  scores: MatrixScore[];
  onSelectMatch: (menteeId: string, mentorId: string) => void;
}

export function MatchMatrix({
  mentees,
  mentors,
  scores,
  onSelectMatch,
}: MatchMatrixProps) {
  const [searchMentee, setSearchMentee] = useState('');
  const [searchMentor, setSearchMentor] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [selectedCell, setSelectedCell] = useState<MatrixScore | null>(null);

  // Filter mentees and mentors based on search
  const filteredMentees = useMemo(() => {
    if (!searchMentee) return mentees;
    return mentees.filter(m =>
      m.name.toLowerCase().includes(searchMentee.toLowerCase())
    );
  }, [mentees, searchMentee]);

  const filteredMentors = useMemo(() => {
    if (!searchMentor) return mentors;
    return mentors.filter(m =>
      m.name.toLowerCase().includes(searchMentor.toLowerCase())
    );
  }, [mentors, searchMentor]);

  // Get score for a specific mentee-mentor pair
  const getScore = (menteeId: string, mentorId: string): MatrixScore | undefined => {
    return scores.find(s => s.menteeId === menteeId && s.mentorId === mentorId);
  };

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-green-400';
    if (score >= 30) return 'bg-yellow-400';
    if (score >= 15) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 30) return 'text-white';
    return 'text-gray-900';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Search Mentee</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter mentees..."
                  value={searchMentee}
                  onChange={(e) => setSearchMentee(e.target.value)}
                  className="pl-8 h-9 w-48"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Search Mentor</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter mentors..."
                  value={searchMentor}
                  onChange={(e) => setSearchMentor(e.target.value)}
                  className="pl-8 h-9 w-48"
                />
              </div>
            </div>
            <div className="space-y-1 flex-1 max-w-xs">
              <Label className="text-xs">Minimum Score: {minScore}</Label>
              <Slider
                value={[minScore]}
                onValueChange={([v]) => setMinScore(v)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Match Score Matrix
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredMentees.length} mentees × {filteredMentors.length} mentors)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium border-b bg-muted/30 sticky left-0 z-10">
                    Mentee / Mentor →
                  </th>
                  {filteredMentors.map(mentor => (
                    <th
                      key={mentor.id}
                      className="p-2 text-center font-medium border-b bg-muted/30 min-w-[80px]"
                    >
                      <div className="truncate max-w-[80px]" title={mentor.name}>
                        {mentor.name.split(' ')[0]}
                      </div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        Cap: {mentor.capacity}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMentees.map(mentee => (
                  <tr key={mentee.id} className="hover:bg-muted/20">
                    <td className="p-2 border-b font-medium sticky left-0 bg-background z-10">
                      <div className="truncate max-w-[120px]" title={mentee.name}>
                        {mentee.name}
                      </div>
                    </td>
                    {filteredMentors.map(mentor => {
                      const scoreData = getScore(mentee.id, mentor.id);
                      const score = scoreData?.score ?? 0;
                      const meetsThreshold = score >= minScore;

                      return (
                        <td
                          key={`${mentee.id}-${mentor.id}`}
                          className="p-1 border-b text-center"
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (scoreData) {
                                      setSelectedCell(scoreData);
                                    }
                                  }}
                                  disabled={!meetsThreshold}
                                  className={cn(
                                    'w-full h-8 rounded text-xs font-medium transition-all',
                                    meetsThreshold
                                      ? cn(getScoreColor(score), getScoreTextColor(score), 'hover:ring-2 hover:ring-primary')
                                      : 'bg-gray-100 text-gray-400',
                                    scoreData?.isAssigned && 'ring-2 ring-primary'
                                  )}
                                >
                                  {score.toFixed(0)}
                                  {scoreData?.isAssigned && (
                                    <CheckCircle className="w-3 h-3 inline ml-1" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="text-xs">
                                  <p className="font-medium">{mentee.name} → {mentor.name}</p>
                                  <p>Score: {score.toFixed(1)}</p>
                                  {scoreData?.isAssigned && (
                                    <p className="text-green-400">Currently Assigned</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="text-muted-foreground">Score:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-400" />
              <span>0-15</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-400" />
              <span>15-30</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-400" />
              <span>30-50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-400" />
              <span>50-70</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>70+</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Detail Dialog */}
      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match Score Details</DialogTitle>
          </DialogHeader>
          {selectedCell && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedCell.menteeName}</p>
                  <p className="text-sm text-muted-foreground">Mentee</p>
                </div>
                <div className="text-2xl font-bold">→</div>
                <div className="text-right">
                  <p className="font-medium">{selectedCell.mentorName}</p>
                  <p className="text-sm text-muted-foreground">Mentor</p>
                </div>
              </div>

              <div className="text-center py-4">
                <div className="text-4xl font-bold">{selectedCell.score.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Total Score</div>
              </div>

              {selectedCell.breakdown && selectedCell.breakdown.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Score Breakdown</h4>
                  {selectedCell.breakdown.map(item => (
                    <div key={item.criterion} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.criterion_name}</span>
                      <span className="font-medium">
                        {item.weighted_score.toFixed(1)}
                        <span className="text-muted-foreground text-xs ml-1">
                          ({(item.raw_score * 100).toFixed(0)}% × {item.weight})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => {
                    onSelectMatch(selectedCell.menteeId, selectedCell.mentorId);
                    setSelectedCell(null);
                  }}
                >
                  Assign This Match
                </Button>
                <Button variant="outline" onClick={() => setSelectedCell(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
