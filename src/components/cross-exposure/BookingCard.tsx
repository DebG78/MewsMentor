import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Award, Eye, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface BookingCardProps {
  booking: any;
  role: "shadow" | "host";
  onViewDetails: (booking: any) => void;
  onCompleteSession?: (booking: any) => void;
}

export default function BookingCard({
  booking,
  role,
  onViewDetails,
  onCompleteSession,
}: BookingCardProps) {
  const isUpcoming = booking.status === "confirmed" && new Date(booking.start_datetime) > new Date();
  const otherPersonName = role === "shadow" ? booking.host_name : booking.shadow_name;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{booking.offering_title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {role === "shadow" ? "Host: " : "Shadow: "}
                    <span className="font-medium text-foreground">{otherPersonName}</span>
                  </span>
                </div>
              </div>
              <Badge variant={isUpcoming ? "default" : "secondary"}>
                {isUpcoming ? "Upcoming" : "Completed"}
              </Badge>
            </div>

            {/* Details */}
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{format(new Date(booking.start_datetime), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>
                  {format(new Date(booking.start_datetime), "h:mm a")} (
                  {booking.duration_hours}h)
                </span>
              </div>
              {booking.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="truncate">{booking.location}</span>
                </div>
              )}
            </div>

            {/* Skills */}
            {booking.skills_to_develop && booking.skills_to_develop.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Award className="w-4 h-4 text-amber-600" />
                {booking.skills_to_develop.slice(0, 3).map((skill: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {booking.skills_to_develop.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{booking.skills_to_develop.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Rating (for completed sessions) */}
            {booking.rating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Award
                      key={i}
                      className={`w-4 h-4 ${
                        i < booking.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {booking.rating}/5 rating
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(booking)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Details
            </Button>
            {isUpcoming && onCompleteSession && role === "shadow" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onCompleteSession(booking)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
