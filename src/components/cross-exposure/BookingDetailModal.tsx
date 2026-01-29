import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, User, Award, FileText, XCircle } from "lucide-react";
import { format } from "date-fns";

interface BookingDetailModalProps {
  booking: any;
  open: boolean;
  onClose: () => void;
  onCancel: (bookingId: string) => void;
}

export default function BookingDetailModal({
  booking,
  open,
  onClose,
  onCancel,
}: BookingDetailModalProps) {
  const isUpcoming = booking.status === "confirmed" && new Date(booking.start_datetime) > new Date();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{booking.offering_title}</DialogTitle>
          <DialogDescription>Session details and information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={isUpcoming ? "default" : "secondary"} className="text-sm">
              {isUpcoming ? "Upcoming Session" : "Completed Session"}
            </Badge>
            {booking.status === "cancelled" && (
              <Badge variant="destructive" className="text-sm">
                Cancelled
              </Badge>
            )}
          </div>

          <Separator />

          {/* Session Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Session Details</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.start_datetime), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.start_datetime), "h:mm a")} ({booking.duration_hours}{" "}
                    {booking.duration_hours === 1 ? "hour" : "hours"})
                  </p>
                </div>
              </div>

              {booking.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{booking.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Host</p>
                  <p className="text-sm text-muted-foreground">{booking.host_name}</p>
                </div>
              </div>

              {booking.shadow_name && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Shadow</p>
                    <p className="text-sm text-muted-foreground">{booking.shadow_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Skills */}
          {booking.skills_to_develop && booking.skills_to_develop.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Skills to Develop
                </h3>
                <div className="flex flex-wrap gap-2">
                  {booking.skills_to_develop.map((skill: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {booking.notes && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  {booking.notes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Feedback (for completed sessions) */}
          {booking.status === "completed" && booking.feedback && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Session Feedback</h3>
                <div className="space-y-2">
                  {booking.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Rating:</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Award
                            key={i}
                            className={`w-4 h-4 ${
                              i < booking.rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({booking.rating}/5)
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    {booking.feedback}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Skills Developed (for completed sessions) */}
          {booking.status === "completed" &&
            booking.skills_developed &&
            booking.skills_developed.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Skills Developed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {booking.skills_developed.map((skill: string, idx: number) => (
                    <Badge key={idx} variant="default" className="bg-green-600">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          {isUpcoming && (
            <Button
              variant="destructive"
              onClick={() => onCancel(booking.id)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Booking
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
