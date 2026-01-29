import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, addHours } from "date-fns";
import { 
  Calendar,
  Clock, 
  Video, 
  MapPin, 
  Users,
  ExternalLink,
  Copy,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SessionSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  mentorName: string;
  menteeName: string;
  onSchedule: (sessionData: any) => void;
}

export function SessionScheduler({ 
  isOpen, 
  onClose, 
  selectedDate, 
  mentorName, 
  menteeName,
  onSchedule 
}: SessionSchedulerProps) {
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState({
    title: "",
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : "",
    time: "14:00",
    duration: "60",
    type: "video",
    agenda: "",
    location: "",
    notes: ""
  });

  const generateCalendarLink = (type: 'outlook' | 'google') => {
    if (!sessionData.date || !sessionData.time) return "";
    
    const startDateTime = new Date(`${sessionData.date}T${sessionData.time}`);
    const endDateTime = addHours(startDateTime, parseInt(sessionData.duration) / 60);
    
    const title = encodeURIComponent(sessionData.title || "Mentoring Session");
    const details = encodeURIComponent(`
Mentoring Session between ${mentorName} and ${menteeName}

Agenda:
${sessionData.agenda || "To be discussed"}

Notes:
${sessionData.notes || "No additional notes"}
    `.trim());
    
    const location = encodeURIComponent(sessionData.location || (sessionData.type === 'video' ? 'Video Call' : ''));

    if (type === 'outlook') {
      const startTime = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endTime = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startTime}&enddt=${endTime}&body=${details}&location=${location}`;
    } else {
      const startTime = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endTime = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
    }
  };

  const generateICSFile = () => {
    if (!sessionData.date || !sessionData.time) return;
    
    const startDateTime = new Date(`${sessionData.date}T${sessionData.time}`);
    const endDateTime = addHours(startDateTime, parseInt(sessionData.duration) / 60);
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SkillBridge//Mentoring Session//EN
BEGIN:VEVENT
UID:${Date.now()}@skillbridge.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:${sessionData.title || 'Mentoring Session'}
DESCRIPTION:Mentoring Session between ${mentorName} and ${menteeName}\\n\\nAgenda:\\n${sessionData.agenda || 'To be discussed'}\\n\\nNotes:\\n${sessionData.notes || 'No additional notes'}
LOCATION:${sessionData.location || (sessionData.type === 'video' ? 'Video Call' : '')}
ATTENDEE;ROLE=REQ-PARTICIPANT:MAILTO:mentor@company.com
ATTENDEE;ROLE=REQ-PARTICIPANT:MAILTO:mentee@company.com
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mentoring-session-${sessionData.date}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSchedule = () => {
    if (!sessionData.title || !sessionData.date || !sessionData.time) {
      toast({
        title: "Missing information",
        description: "Please fill in the session title, date, and time.",
        variant: "destructive",
      });
      return;
    }

    onSchedule({
      ...sessionData,
      id: Date.now(),
      status: 'upcoming',
      participants: [mentorName, menteeName]
    });

    toast({
      title: "Session scheduled!",
      description: "The mentoring session has been added to your calendar.",
    });

    onClose();
  };

  const copyCalendarLink = (type: 'outlook' | 'google') => {
    const link = generateCalendarLink(type);
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: `${type === 'outlook' ? 'Outlook' : 'Google'} calendar link copied to clipboard.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Mentoring Session
          </DialogTitle>
          <DialogDescription>
            Plan a new session between {mentorName} and {menteeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Session Title *</Label>
              <Input
                id="title"
                value={sessionData.title}
                onChange={(e) => setSessionData({...sessionData, title: e.target.value})}
                placeholder="e.g., Stakeholder Management Deep Dive"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <DatePicker
                  date={sessionData.date ? new Date(sessionData.date) : undefined}
                  onDateChange={(date) =>
                    setSessionData({
                      ...sessionData,
                      date: date ? format(date, 'yyyy-MM-dd') : ''
                    })
                  }
                  placeholder="Select session date"
                />
              </div>
              <div>
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={sessionData.time}
                  onChange={(e) => setSessionData({...sessionData, time: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={sessionData.duration} onValueChange={(value) => setSessionData({...sessionData, duration: value})}>
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

            <div>
              <Label htmlFor="type">Session Type</Label>
              <Select value={sessionData.type} onValueChange={(value) => setSessionData({...sessionData, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video Call
                    </div>
                  </SelectItem>
                  <SelectItem value="in-person">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      In Person
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sessionData.type === 'in-person' && (
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={sessionData.location}
                  onChange={(e) => setSessionData({...sessionData, location: e.target.value})}
                  placeholder="e.g., Conference Room B, Building A"
                />
              </div>
            )}

            <div>
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea
                id="agenda"
                value={sessionData.agenda}
                onChange={(e) => setSessionData({...sessionData, agenda: e.target.value})}
                placeholder="What will you discuss in this session?"
                className="min-h-20"
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={sessionData.notes}
                onChange={(e) => setSessionData({...sessionData, notes: e.target.value})}
                placeholder="Any preparation materials or special instructions"
                className="min-h-16"
              />
            </div>
          </div>

          {/* Calendar Integration */}
          {sessionData.date && sessionData.time && (
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Add to Calendar</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(generateCalendarLink('outlook'), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Outlook
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyCalendarLink('outlook')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Outlook Link
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(generateCalendarLink('google'), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Google
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateICSFile}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Download .ics
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Calendar invites will be sent to both participants after scheduling
              </p>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSchedule}>
            <Send className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}