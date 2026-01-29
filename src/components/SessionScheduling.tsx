import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session, SessionCreateInput, Cohort } from "@/types/mentoring";
import {
  createSession,
  updateSession,
  deleteSession,
  getSessionsByCohort,
  completeSession,
  cancelSession,
  markNoShow
} from "@/lib/sessionService";

interface SessionSchedulingProps {
  selectedCohort: Cohort | null;
}

export const SessionScheduling = ({ selectedCohort }: SessionSchedulingProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    mentor_id: "",
    mentee_id: "",
    pair_id: "",
    title: "",
    description: "",
    scheduled_datetime: "",
    duration_minutes: 60,
    meeting_url: ""
  });

  useEffect(() => {
    if (selectedCohort) {
      loadSessions();
    }
  }, [selectedCohort]);

  const loadSessions = async () => {
    if (!selectedCohort) return;

    setIsLoading(true);
    try {
      const sessionsData = await getSessionsByCohort(selectedCohort.id);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast({
        variant: "destructive",
        title: "Failed to load sessions",
        description: "Could not fetch sessions data."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      mentor_id: "",
      mentee_id: "",
      pair_id: "",
      title: "",
      description: "",
      scheduled_datetime: "",
      duration_minutes: 60,
      meeting_url: ""
    });
    setEditingSession(null);
  };

  const handleSubmit = async () => {
    if (!selectedCohort) return;

    if (!formData.pair_id || !formData.title || !formData.scheduled_datetime) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please select a mentor-mentee pair and fill in all required fields."
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editingSession) {
        // Update existing session
        await updateSession(editingSession.id, {
          title: formData.title,
          description: formData.description,
          scheduled_datetime: formData.scheduled_datetime,
          duration_minutes: formData.duration_minutes,
          meeting_url: formData.meeting_url
        });

        toast({
          title: "Session updated",
          description: "The session has been updated successfully."
        });
      } else {
        // Create new session
        const sessionInput: SessionCreateInput = {
          ...formData,
          cohort_id: selectedCohort.id
        };

        await createSession(sessionInput);

        toast({
          title: "Session scheduled",
          description: "The mentoring session has been scheduled successfully."
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadSessions();
    } catch (error) {
      console.error('Failed to save session:', error);
      toast({
        variant: "destructive",
        title: "Failed to save session",
        description: "Could not save the session. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    const pairId = `${session.mentor_id}|${session.mentee_id}`;
    setFormData({
      mentor_id: session.mentor_id,
      mentee_id: session.mentee_id,
      pair_id: pairId,
      title: session.title,
      description: session.description || "",
      scheduled_datetime: session.scheduled_datetime.slice(0, 16), // Format for datetime-local input
      duration_minutes: session.duration_minutes,
      meeting_url: session.meeting_url || ""
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;

    setIsLoading(true);
    try {
      await deleteSession(sessionId);
      toast({
        title: "Session deleted",
        description: "The session has been deleted successfully."
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete session",
        description: "Could not delete the session. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (sessionId: string, status: 'completed' | 'cancelled' | 'no_show') => {
    setIsLoading(true);
    try {
      let result;
      switch (status) {
        case 'completed':
          result = await completeSession(sessionId);
          break;
        case 'cancelled':
          result = await cancelSession(sessionId);
          break;
        case 'no_show':
          result = await markNoShow(sessionId);
          break;
      }

      if (result) {
        toast({
          title: "Session updated",
          description: `Session marked as ${status.replace('_', ' ')}.`
        });
        loadSessions();
      }
    } catch (error) {
      console.error('Failed to update session status:', error);
      toast({
        variant: "destructive",
        title: "Failed to update session",
        description: "Could not update the session status."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'no_show':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (!selectedCohort) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select a Cohort</h3>
        <p className="text-muted-foreground">
          Choose a cohort to view and schedule mentoring sessions
        </p>
      </Card>
    );
  }

  // Get available mentor-mentee pairs
  const availablePairs = selectedCohort.matches?.results?.filter(r => r.proposed_assignment?.mentor_id) || [];

  return (
    <div className="space-y-6">
      {/* Header with Schedule Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Session Management</h2>
          <p className="text-muted-foreground">Schedule and track mentoring sessions for {selectedCohort.name}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSession ? 'Edit Session' : 'Schedule New Session'}
              </DialogTitle>
              <DialogDescription>
                {editingSession ? 'Update the session details below.' : 'Create a new mentoring session between a mentor and mentee.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Mentor-Mentee Pair Selection */}
              <div>
                <label className="text-sm font-medium">Select Mentor-Mentee Pair</label>
                <Select
                  value={formData.pair_id}
                  onValueChange={(value) => {
                    // Parse the pair_id to get mentor_id and mentee_id
                    const [mentorId, menteeId] = value.split('|');
                    const selectedPair = availablePairs.find(p =>
                      p.proposed_assignment?.mentor_id === mentorId && p.mentee_id === menteeId
                    );

                    if (selectedPair) {
                      setFormData(prev => ({
                        ...prev,
                        pair_id: value,
                        mentor_id: mentorId,
                        mentee_id: menteeId,
                        title: `Mentoring Session: ${selectedPair.proposed_assignment?.mentor_name || mentorId} & ${selectedPair.mentee_name || menteeId}`
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a mentor-mentee pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePairs.map((pair) => {
                      const pairId = `${pair.proposed_assignment?.mentor_id}|${pair.mentee_id}`;
                      const mentorName = pair.proposed_assignment?.mentor_name || pair.proposed_assignment?.mentor_id;
                      const menteeName = pair.mentee_name || pair.mentee_id;

                      return (
                        <SelectItem key={pairId} value={pairId}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-green-600">{mentorName}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-blue-600">{menteeName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Sessions are scheduled between assigned mentor-mentee pairs
                </p>
              </div>

              {/* Session Details */}
              <div>
                <label className="text-sm font-medium">Session Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Mentoring Session: Career Goals Discussion"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Session agenda, goals, or notes..."
                  rows={3}
                />
              </div>

              {/* Date and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date & Time</label>
                  <DateTimePicker
                    date={formData.scheduled_datetime ? new Date(formData.scheduled_datetime) : undefined}
                    onDateChange={(date) =>
                      setFormData(prev => ({
                        ...prev,
                        scheduled_datetime: date ? date.toISOString().slice(0, 16) : ''
                      }))
                    }
                    placeholder="Select date and time"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Select
                    value={formData.duration_minutes.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Meeting URL */}
              <div>
                <label className="text-sm font-medium">Meeting URL (Optional)</label>
                <Input
                  value={formData.meeting_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_url: e.target.value }))}
                  placeholder="https://teams.microsoft.com/..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingSession ? 'Update Session' : 'Schedule Session'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Scheduled Sessions
            <Badge variant="outline">{sessions.length}</Badge>
          </CardTitle>
          <CardDescription>
            All mentoring sessions for this cohort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-semibold mb-2">No Sessions Scheduled</h4>
              <p className="mb-4">Get started by scheduling your first mentoring session.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status)}
                        <div>
                          <div className="font-medium">{session.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(session.scheduled_datetime).toLocaleString()} • {session.duration_minutes} min
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(session.status)}>
                          {session.status.replace('_', ' ')}
                        </Badge>
                        {session.meeting_url && (
                          <Badge variant="outline" className="text-blue-600">
                            <Video className="w-3 h-3 mr-1" />
                            Meeting
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.status === 'scheduled' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(session.id, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(session.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSession(session)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {session.description && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {session.description}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};