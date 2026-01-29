import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  Star,
  Plus,
  Target,
  FileText,
  Calendar,
  Video
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Session {
  id: number;
  date: string;
  time: string;
  title: string;
  duration: number;
  status: 'completed' | 'upcoming' | 'missed';
  type: 'video' | 'in-person' | 'phone';
  notes?: string;
  actionItems?: string[];
  documents?: string[];
  rating?: number;
  outcomes?: string[];
}

interface SessionCompletionProps {
  session: Session;
  onSessionComplete: (sessionId: number, completionData: any) => void;
}

export const SessionCompletion = ({ session, onSessionComplete }: SessionCompletionProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [completionData, setCompletionData] = useState({
    status: 'completed' as 'completed' | 'missed',
    rating: 5,
    notes: '',
    actionItems: [''],
    outcomes: [''],
    actualDuration: session.duration,
    keyTakeaways: ''
  });
  const { toast } = useToast();

  const handleComplete = () => {
    onSessionComplete(session.id, completionData);
    toast({
      title: "Session marked as completed",
      description: `"${session.title}" has been successfully logged.`,
    });
    setIsDialogOpen(false);
  };

  const handleQuickComplete = () => {
    const quickData = {
      status: 'completed' as const,
      rating: 5,
      notes: 'Session completed successfully',
      actualDuration: session.duration,
      keyTakeaways: 'Session went well'
    };
    onSessionComplete(session.id, quickData);
    toast({
      title: "Session completed",
      description: `"${session.title}" marked as completed.`,
    });
  };

  const addActionItem = () => {
    setCompletionData({
      ...completionData,
      actionItems: [...completionData.actionItems, '']
    });
  };

  const updateActionItem = (index: number, value: string) => {
    const updated = [...completionData.actionItems];
    updated[index] = value;
    setCompletionData({
      ...completionData,
      actionItems: updated
    });
  };

  const addOutcome = () => {
    setCompletionData({
      ...completionData,
      outcomes: [...completionData.outcomes, '']
    });
  };

  const updateOutcome = (index: number, value: string) => {
    const updated = [...completionData.outcomes];
    updated[index] = value;
    setCompletionData({
      ...completionData,
      outcomes: updated
    });
  };

  if (session.status === 'completed') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{session.title}</p>
                <p className="text-sm text-green-600">
                  Completed on {session.date} • {session.duration} min
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">Completed</Badge>
          </div>
          {session.notes && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-sm text-green-700">{session.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">{session.title}</p>
              <p className="text-sm text-amber-600">
                {session.date} at {session.time} • {session.duration} min
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleQuickComplete}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Quick Complete
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <FileText className="w-4 h-4 mr-1" />
                  Complete with Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Complete Session: {session.title}</DialogTitle>
                  <DialogDescription>
                    Record details about this mentoring session to track progress and outcomes.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Session Status</Label>
                      <Select
                        value={completionData.status}
                        onValueChange={(value) => 
                          setCompletionData({ ...completionData, status: value as 'completed' | 'missed' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completed Successfully</SelectItem>
                          <SelectItem value="missed">Session Missed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Actual Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={completionData.actualDuration}
                        onChange={(e) => setCompletionData({ 
                          ...completionData, 
                          actualDuration: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rating">Session Rating</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button
                          key={star}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => setCompletionData({ ...completionData, rating: star })}
                        >
                          <Star 
                            className={`w-5 h-5 ${
                              star <= completionData.rating 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`} 
                          />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Session Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="What was discussed? Key insights, breakthroughs, challenges..."
                      rows={4}
                      value={completionData.notes}
                      onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="takeaways">Key Takeaways</Label>
                    <Textarea
                      id="takeaways"
                      placeholder="Main learning points and insights from this session..."
                      rows={3}
                      value={completionData.keyTakeaways}
                      onChange={(e) => setCompletionData({ ...completionData, keyTakeaways: e.target.value })}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Action Items</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addActionItem}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    {completionData.actionItems.map((item, index) => (
                      <Input
                        key={index}
                        placeholder={`Action item ${index + 1}`}
                        value={item}
                        onChange={(e) => updateActionItem(index, e.target.value)}
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Outcomes & Results</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOutcome}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Outcome
                      </Button>
                    </div>
                    {completionData.outcomes.map((outcome, index) => (
                      <Input
                        key={index}
                        placeholder={`Outcome ${index + 1}`}
                        value={outcome}
                        onChange={(e) => updateOutcome(index, e.target.value)}
                      />
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleComplete}>
                    Complete Session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};