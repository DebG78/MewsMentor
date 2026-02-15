import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Users,
  ArrowRight,
  X,
  Undo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDisplayName } from '@/lib/displayName';

interface MentorCard {
  id: string;
  name: string;
  role: string;
  topics: string[];
  capacity: number;
  capacityUsed: number;
  assignedMentees: string[];
}

interface MenteeCard {
  id: string;
  name: string;
  role: string;
  topics: string[];
  matchScore?: number;
  assignedMentorId?: string;
  status: 'unmatched' | 'pending' | 'approved';
}

interface MatchBoardProps {
  mentors: MentorCard[];
  mentees: MenteeCard[];
  onAssign: (menteeId: string, mentorId: string) => void;
  onUnassign: (menteeId: string) => void;
  onApprove: (menteeId: string) => void;
  onApproveAll: () => void;
}

export function MatchBoard({
  mentors,
  mentees,
  onAssign,
  onUnassign,
  onApprove,
  onApproveAll,
}: MatchBoardProps) {
  const [selectedMentee, setSelectedMentee] = useState<string | null>(null);
  const [dragOverMentor, setDragOverMentor] = useState<string | null>(null);

  const unmatchedMentees = mentees.filter(m => m.status === 'unmatched');
  const pendingMentees = mentees.filter(m => m.status === 'pending');
  const approvedMentees = mentees.filter(m => m.status === 'approved');

  const handleDragStart = (e: React.DragEvent, menteeId: string) => {
    e.dataTransfer.setData('menteeId', menteeId);
    setSelectedMentee(menteeId);
  };

  const handleDragOver = (e: React.DragEvent, mentorId: string) => {
    e.preventDefault();
    setDragOverMentor(mentorId);
  };

  const handleDragLeave = () => {
    setDragOverMentor(null);
  };

  const handleDrop = (e: React.DragEvent, mentorId: string) => {
    e.preventDefault();
    const menteeId = e.dataTransfer.getData('menteeId');
    if (menteeId) {
      onAssign(menteeId, mentorId);
    }
    setDragOverMentor(null);
    setSelectedMentee(null);
  };

  const getMentorForMentee = (menteeId: string) => {
    const mentee = mentees.find(m => m.id === menteeId);
    if (!mentee?.assignedMentorId) return null;
    return mentors.find(m => m.id === mentee.assignedMentorId);
  };

  const getCapacityColor = (used: number, total: number) => {
    const ratio = used / total;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio >= 0.8) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Unmatched: {unmatchedMentees.length}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Pending: {pendingMentees.length}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Approved: {approvedMentees.length}
          </span>
        </div>
        {pendingMentees.length > 0 && (
          <Button onClick={onApproveAll} variant="outline" size="sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve All Pending
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unmatched Mentees Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Unmatched Mentees
              <Badge variant="secondary">{unmatchedMentees.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {unmatchedMentees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All mentees have been matched
              </p>
            ) : (
              unmatchedMentees.map(mentee => (
                <div
                  key={mentee.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, mentee.id)}
                  className={cn(
                    'p-3 border rounded-lg cursor-grab active:cursor-grabbing',
                    'hover:border-primary/50 hover:bg-accent/50 transition-colors',
                    selectedMentee === mentee.id && 'border-primary bg-accent'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{toDisplayName(mentee.name)}</span>
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{mentee.role}</div>
                  <div className="flex flex-wrap gap-1">
                    {mentee.topics.slice(0, 2).map(topic => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                    {mentee.topics.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{mentee.topics.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Mentors Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Mentors
              <Badge variant="secondary">{mentors.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {mentors.map(mentor => {
              const isOver = dragOverMentor === mentor.id;
              const isFull = mentor.capacityUsed >= mentor.capacity;

              return (
                <div
                  key={mentor.id}
                  onDragOver={(e) => handleDragOver(e, mentor.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, mentor.id)}
                  className={cn(
                    'p-3 border rounded-lg transition-all',
                    isOver && !isFull && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                    isOver && isFull && 'border-red-500 bg-red-50',
                    isFull && 'opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{toDisplayName(mentor.name)}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 text-xs">
                            <span>{mentor.capacityUsed}/{mentor.capacity}</span>
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                getCapacityColor(mentor.capacityUsed, mentor.capacity)
                              )}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {mentor.capacity - mentor.capacityUsed} slots available
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{mentor.role}</div>
                  <Progress
                    value={(mentor.capacityUsed / mentor.capacity) * 100}
                    className="h-1 mb-2"
                  />
                  <div className="flex flex-wrap gap-1">
                    {mentor.topics.slice(0, 2).map(topic => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  {mentor.assignedMentees.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      Assigned: {mentor.assignedMentees.length} mentee(s)
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Pending/Approved Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Matched
              <Badge variant="secondary">{pendingMentees.length + approvedMentees.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {/* Pending matches */}
            {pendingMentees.map(mentee => {
              const mentor = getMentorForMentee(mentee.id);
              return (
                <div
                  key={mentee.id}
                  className="p-3 border rounded-lg border-yellow-200 bg-yellow-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Pending Review
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onApprove(mentee.id)}
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onUnassign(mentee.id)}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{toDisplayName(mentee.name)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{toDisplayName(mentor?.name) || 'Unknown'}</span>
                  </div>
                  {mentee.matchScore !== undefined && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Score: {mentee.matchScore.toFixed(1)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Approved matches */}
            {approvedMentees.map(mentee => {
              const mentor = getMentorForMentee(mentee.id);
              return (
                <div
                  key={mentee.id}
                  className="p-3 border rounded-lg border-green-200 bg-green-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Approved
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onUnassign(mentee.id)}
                    >
                      <Undo className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{toDisplayName(mentee.name)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{toDisplayName(mentor?.name) || 'Unknown'}</span>
                  </div>
                </div>
              );
            })}

            {pendingMentees.length === 0 && approvedMentees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Drag mentees to mentors to create matches
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
