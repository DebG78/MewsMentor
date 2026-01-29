import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createSession } from "@/lib/sessionService";
import { useToast } from "@/hooks/use-toast";

interface LogMeetingProps {
  mentorId: string;
  menteeId: string;
  cohortId: string;
  partnerName?: string;
  onMeetingLogged?: () => void;
  buttonVariant?: "default" | "outline" | "ghost";
  buttonSize?: "default" | "sm" | "lg";
}

export function LogMeeting({
  mentorId,
  menteeId,
  cohortId,
  partnerName,
  onMeetingLogged,
  buttonVariant = "default",
  buttonSize = "default",
}: LogMeetingProps) {
  const [open, setOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await createSession({
        mentor_id: mentorId,
        mentee_id: menteeId,
        cohort_id: cohortId,
        meeting_date: format(meetingDate, "yyyy-MM-dd"),
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Meeting logged successfully",
        description: `Your meeting${partnerName ? ` with ${partnerName}` : ""} has been recorded.`,
      });

      // Reset form
      setMeetingDate(new Date());
      setNotes("");
      setOpen(false);

      // Notify parent component
      onMeetingLogged?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to log meeting",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <Plus className="h-4 w-4 mr-2" />
          Log a Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log a Meeting</DialogTitle>
          <DialogDescription>
            Record a mentoring session{partnerName ? ` with ${partnerName}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="meeting-date">Meeting Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="meeting-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !meetingDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? format(meetingDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDate}
                  onSelect={(date) => date && setMeetingDate(date)}
                  disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              When did this meeting take place?
            </p>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="What did you discuss? Any key takeaways?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Add any details about the meeting for your records.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Logging..." : "Log Meeting"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
