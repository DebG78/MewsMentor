import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Award, Star } from "lucide-react";
import * as crossExposureService from "@/lib/crossExposureService";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import BookingCard from "@/components/cross-exposure/BookingCard";
import BookingDetailModal from "@/components/cross-exposure/BookingDetailModal";
import CompleteBookingModal from "@/components/cross-exposure/CompleteBookingModal";

export default function MyShadowSessions() {
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [shadowBookings, setShadowBookings] = useState<any[]>([]);
  const [hostBookings, setHostBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("shadow");
  const [statusFilter, setStatusFilter] = useState<"upcoming" | "completed">("upcoming");

  useEffect(() => {
    if (userProfile?.id) {
      loadBookings();
    }
  }, [userProfile?.id]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const [shadowData, hostData] = await Promise.all([
        crossExposureService.getShadowBookings(userProfile!.id),
        crossExposureService.getHostBookings(userProfile!.id),
      ]);
      setShadowBookings(shadowData || []);
      setHostBookings(hostData || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load your bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const handleCompleteSession = (booking: any) => {
    setSelectedBooking(booking);
    setShowCompleteModal(true);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await crossExposureService.cancelBooking(bookingId);
      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });
      loadBookings();
      setShowDetailModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const handleCompleteBooking = async (
    bookingId: string,
    rating: number,
    feedback: string,
    skillsDeveloped: string[]
  ) => {
    try {
      await crossExposureService.completeBooking(bookingId, {
        rating,
        feedback,
        skills_developed: skillsDeveloped,
      });
      toast({
        title: "Success",
        description: "Session marked as complete! Growth event created.",
      });
      loadBookings();
      setShowCompleteModal(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete booking",
        variant: "destructive",
      });
    }
  };

  const filterBookings = (bookings: any[]) => {
    const now = new Date();
    if (statusFilter === "upcoming") {
      return bookings.filter(
        (b) => b.status === "confirmed" && new Date(b.start_datetime) > now
      );
    } else {
      return bookings.filter((b) => b.status === "completed");
    }
  };

  const filteredShadowBookings = filterBookings(shadowBookings);
  const filteredHostBookings = filterBookings(hostBookings);

  const shadowStats = {
    total: shadowBookings.length,
    upcoming: shadowBookings.filter(
      (b) => b.status === "confirmed" && new Date(b.start_datetime) > new Date()
    ).length,
    completed: shadowBookings.filter((b) => b.status === "completed").length,
  };

  const hostStats = {
    total: hostBookings.length,
    upcoming: hostBookings.filter(
      (b) => b.status === "confirmed" && new Date(b.start_datetime) > new Date()
    ).length,
    completed: hostBookings.filter((b) => b.status === "completed").length,
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Shadow Sessions</h1>
        <p className="text-muted-foreground mt-1">
          Manage your cross-exposure bookings and sessions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="shadow">
            As Shadow ({shadowStats.total})
          </TabsTrigger>
          <TabsTrigger value="host">
            As Host ({hostStats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shadow" className="space-y-6">
          {/* Shadow Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Sessions
                    </p>
                    <p className="text-2xl font-bold">{shadowStats.total}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Upcoming
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {shadowStats.upcoming}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Completed
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {shadowStats.completed}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Shadow Sessions</CardTitle>
                  <CardDescription>
                    Sessions where you are learning from a host
                  </CardDescription>
                </div>
                <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {filteredShadowBookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {statusFilter === "upcoming"
                      ? "No upcoming shadow sessions"
                      : "No completed shadow sessions yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredShadowBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      role="shadow"
                      onViewDetails={handleViewDetails}
                      onCompleteSession={
                        statusFilter === "upcoming" ? handleCompleteSession : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="host" className="space-y-6">
          {/* Host Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Sessions
                    </p>
                    <p className="text-2xl font-bold">{hostStats.total}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Upcoming
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {hostStats.upcoming}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Completed
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {hostStats.completed}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Hosted Sessions</CardTitle>
                  <CardDescription>
                    Sessions where you are hosting a shadow
                  </CardDescription>
                </div>
                <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {filteredHostBookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {statusFilter === "upcoming"
                      ? "No upcoming hosted sessions"
                      : "No completed hosted sessions yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHostBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      role="host"
                      onViewDetails={handleViewDetails}
                      onCompleteSession={
                        statusFilter === "upcoming" ? handleCompleteSession : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedBooking && (
        <>
          <BookingDetailModal
            booking={selectedBooking}
            open={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            onCancel={handleCancelBooking}
          />
          <CompleteBookingModal
            booking={selectedBooking}
            open={showCompleteModal}
            onClose={() => setShowCompleteModal(false)}
            onComplete={handleCompleteBooking}
          />
        </>
      )}
    </div>
  );
}
