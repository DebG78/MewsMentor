import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Info } from "lucide-react";
import { MatchingOutput } from "@/types/mentoring";
import { useToast } from "@/hooks/use-toast";

interface ManualMatchSelectionProps {
  matchingOutput: MatchingOutput;
  onSelectionsApproved: (selections: Record<string, string>) => void;
  onCancel: () => void;
}

export function ManualMatchSelection({ matchingOutput, onSelectionsApproved, onCancel }: ManualMatchSelectionProps) {
  const [manualSelections, setManualSelections] = useState<Record<string, string>>({});
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMentorDetail, setSelectedMentorDetail] = useState<any>(null);
  const { toast } = useToast();

  const handleSelectMentor = (menteeId: string, mentorId: string) => {
    setManualSelections(prev => ({
      ...prev,
      [menteeId]: mentorId
    }));
  };

  const handleShowDetails = (recommendation: any) => {
    setSelectedMentorDetail(recommendation);
    setDetailDialogOpen(true);
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const handleApprove = () => {
    if (Object.keys(manualSelections).length === 0) {
      toast({
        variant: "destructive",
        title: "No selections made",
        description: "Please select at least one mentor-mentee pair",
      });
      return;
    }
    onSelectionsApproved(manualSelections);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manual Match Selection</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on mentor names for details. Select your preferred match for each mentee.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={Object.keys(manualSelections).length === 0}
              >
                Approve {Object.keys(manualSelections).length > 0 && `(${Object.keys(manualSelections).length})`} Selections
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Selection Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{matchingOutput.stats.mentees_total}</p>
              <p className="text-xs text-muted-foreground">Total Mentees</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{Object.keys(manualSelections).length}</p>
              <p className="text-xs text-muted-foreground">Selected</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xl font-bold text-orange-600">
                {matchingOutput.stats.mentees_total - Object.keys(manualSelections).length}
              </p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-xl font-bold text-purple-600">{matchingOutput.stats.mentors_total}</p>
              <p className="text-xs text-muted-foreground">Available Mentors</p>
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentee</TableHead>
                <TableHead>Option 1</TableHead>
                <TableHead>Option 2</TableHead>
                <TableHead>Option 3</TableHead>
                <TableHead className="w-[200px]">Select Match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchingOutput.results.map((result) => (
                <TableRow key={result.mentee_id}>
                  <TableCell className="font-medium">
                    {result.mentee_name || result.mentee_id}
                  </TableCell>
                  {[0, 1, 2].map((idx) => (
                    <TableCell key={idx}>
                      {result.recommendations[idx] ? (
                        <div className="space-y-1">
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 font-semibold text-left"
                            onClick={() => handleShowDetails(result.recommendations[idx])}
                          >
                            <Info className="w-3 h-3 mr-1" />
                            {result.recommendations[idx].mentor_name}
                          </Button>
                          <div>
                            <Badge variant={getScoreBadgeVariant(result.recommendations[idx].score.total_score)} className="text-xs">
                              {Math.round(result.recommendations[idx].score.total_score)}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Select
                      value={manualSelections[result.mentee_id] || ""}
                      onValueChange={(value) => handleSelectMentor(result.mentee_id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mentor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {result.recommendations.slice(0, 3).map((rec) => (
                          <SelectItem key={rec.mentor_id} value={rec.mentor_id}>
                            {rec.mentor_name} ({Math.round(rec.score.total_score)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMentorDetail?.mentor_name}</DialogTitle>
            <DialogDescription>
              {selectedMentorDetail?.mentor_role}
            </DialogDescription>
          </DialogHeader>
          {selectedMentorDetail && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Match Score:</span>
                  <Badge variant={getScoreBadgeVariant(selectedMentorDetail.score.total_score)}>
                    {Math.round(selectedMentorDetail.score.total_score)}
                  </Badge>
                </div>
              </div>

              {selectedMentorDetail.score.reasons.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Why this is a good match:</h4>
                  <div className="space-y-2">
                    {selectedMentorDetail.score.reasons.map((reason: string, idx: number) => (
                      <div key={idx} className="flex items-start text-sm">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMentorDetail.score.risks.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Potential concerns:</h4>
                  <div className="space-y-2">
                    {selectedMentorDetail.score.risks.map((risk: string, idx: number) => (
                      <div key={idx} className="flex items-start text-sm">
                        <span className="text-red-600 mr-2">⚠</span>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
