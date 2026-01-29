import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Award, Star, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface CompleteBookingModalProps {
  booking: any;
  open: boolean;
  onClose: () => void;
  onComplete: (bookingId: string, rating: number, feedback: string, skillsDeveloped: string[]) => void;
}

export default function CompleteBookingModal({
  booking,
  open,
  onClose,
  onComplete,
}: CompleteBookingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleSubmit = () => {
    if (rating === 0) {
      alert("Please provide a rating");
      return;
    }
    if (feedback.trim() === "") {
      alert("Please provide feedback");
      return;
    }
    if (selectedSkills.length === 0) {
      alert("Please select at least one skill you developed");
      return;
    }

    onComplete(booking.id, rating, feedback, selectedSkills);
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setFeedback("");
    setSelectedSkills([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complete Session</DialogTitle>
          <DialogDescription>
            Share your experience and mark this session as complete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h3 className="font-semibold">{booking.offering_title}</h3>
            <p className="text-sm text-muted-foreground">
              Host: {booking.host_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(booking.start_datetime), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Star className="w-5 h-5" />
              Rate Your Experience
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      value <= (hoveredRating || rating)
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium">
                  {rating === 5
                    ? "Excellent!"
                    : rating === 4
                    ? "Very Good"
                    : rating === 3
                    ? "Good"
                    : rating === 2
                    ? "Fair"
                    : "Needs Improvement"}
                </span>
              )}
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-3">
            <Label htmlFor="feedback" className="text-base font-semibold">
              Session Feedback
            </Label>
            <Textarea
              id="feedback"
              placeholder="Share your thoughts about the session. What did you learn? What was most valuable? Any suggestions for improvement?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This feedback will be shared with the host and admin team
            </p>
          </div>

          {/* Skills Developed */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Award className="w-5 h-5" />
              Which Skills Did You Develop?
            </Label>
            <p className="text-sm text-muted-foreground">
              Select the skills you gained or improved during this session
            </p>
            <div className="flex flex-wrap gap-2">
              {booking.skills_to_develop?.map((skill: string, idx: number) => (
                <Badge
                  key={idx}
                  variant={selectedSkills.includes(skill) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => toggleSkill(skill)}
                >
                  {selectedSkills.includes(skill) && (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}
                  {skill}
                </Badge>
              ))}
            </div>
            {selectedSkills.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Growth Event Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Growth Event Created
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Completing this session will create a growth event in your skills portfolio,
                  documenting your learning and development.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0 || !feedback.trim() || selectedSkills.length === 0}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
