import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Calendar, User } from "lucide-react";
import { Session } from "@/types/mentoring";
import { getSessionsByUser, getMeetingCountForPair, getLastMeetingDate } from "@/lib/sessionService";
import { format } from "date-fns";
import { LogMeeting } from "@/components/LogMeeting";

interface MySessionsProps {
  userId: string;
  userType: "mentor" | "mentee";
  matches?: Array<{ mentor_id: string; mentee_id: string; mentor_name?: string; mentee_name?: string; cohort_id: string }>;
}

export const MySessions = ({ userId, userType, matches = [] }: MySessionsProps) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairStats, setPairStats] = useState<Map<string, { count: number; lastDate: string | null }>>(new Map());

  useEffect(() => {
    loadData();
  }, [userId, matches]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all sessions for this user
      const userSessions = await getSessionsByUser(userId, userType);
      setSessions(userSessions);

      // Load meeting counts and last meeting dates for each pair
      const stats = new Map();
      for (const match of matches) {
        const partnerId = userType === "mentor" ? match.mentee_id : match.mentor_id;
        const mentorId = userType === "mentor" ? userId : match.mentor_id;
        const menteeId = userType === "mentee" ? userId : match.mentee_id;

        const count = await getMeetingCountForPair(mentorId, menteeId);
        const lastDate = await getLastMeetingDate(mentorId, menteeId);
        stats.set(partnerId, { count, lastDate });
      }
      setPairStats(stats);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading sessions",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingLogged = () => {
    // Reload data after logging a meeting
    loadData();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Partnerships</p>
                <p className="text-2xl font-bold">{matches.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Meeting</p>
                <p className="text-2xl font-bold">
                  {sessions.length > 0 ? format(new Date(sessions[0].meeting_date), "MMM d") : "N/A"}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {sessions.length > 0 ? format(new Date(sessions[0].meeting_date), "yyyy") : ""}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partnerships List */}
      <Card>
        <CardHeader>
          <CardTitle>Your {userType === "mentor" ? "Mentees" : "Mentors"}</CardTitle>
          <CardDescription>
            Track and log meetings with your {userType === "mentor" ? "mentees" : "mentors"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active partnerships yet</p>
              <p className="text-sm">You'll see your matches here once they're assigned</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{userType === "mentor" ? "Mentee" : "Mentor"}</TableHead>
                  <TableHead>Meetings Logged</TableHead>
                  <TableHead>Last Met</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => {
                  const partnerId = userType === "mentor" ? match.mentee_id : match.mentor_id;
                  const partnerName = userType === "mentor" ? match.mentee_name : match.mentor_name;
                  const stats = pairStats.get(partnerId) || { count: 0, lastDate: null };

                  return (
                    <TableRow key={partnerId}>
                      <TableCell className="font-medium">{partnerName || partnerId}</TableCell>
                      <TableCell>
                        <Badge variant={stats.count > 0 ? "default" : "secondary"}>
                          {stats.count} {stats.count === 1 ? "meeting" : "meetings"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {stats.lastDate ? (
                          <span className="text-sm">{format(new Date(stats.lastDate), "MMM d, yyyy")}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <LogMeeting
                          mentorId={userType === "mentor" ? userId : match.mentor_id}
                          menteeId={userType === "mentee" ? userId : match.mentee_id}
                          cohortId={match.cohort_id}
                          partnerName={partnerName}
                          onMeetingLogged={handleMeetingLogged}
                          buttonVariant="outline"
                          buttonSize="sm"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Meetings */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Meetings</CardTitle>
            <CardDescription>Your latest mentoring sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.slice(0, 10).map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{format(new Date(session.meeting_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {userType === "mentor" ? session.mentee_name : session.mentor_name}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="text-sm text-muted-foreground truncate">
                        {session.notes || <em className="text-xs">No notes</em>}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
