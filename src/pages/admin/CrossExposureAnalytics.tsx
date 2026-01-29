import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, TrendingUp, Award, Building, Target } from "lucide-react";
import * as crossExposureService from "@/lib/crossExposureService";
import { useToast } from "@/hooks/use-toast";

export default function CrossExposureAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all data
      const [offerings, bookings] = await Promise.all([
        crossExposureService.getAllHostOfferings(),
        crossExposureService.getAllBookings(),
      ]);

      // Calculate analytics
      const activeHosts = new Set(offerings.filter((o: any) => o.is_active).map((o: any) => o.host_user_id)).size;
      const activeShadows = new Set(bookings.filter((b: any) => b.status === 'confirmed').map((b: any) => b.shadow_user_id)).size;
      const completedBookings = bookings.filter((b: any) => b.status === 'completed');
      const totalHours = completedBookings.reduce((sum: number, b: any) => sum + (b.duration_hours || 0), 0);

      // Skills analysis
      const skillsMap = new Map<string, number>();
      offerings.forEach((o: any) => {
        o.skills_offered?.forEach((skill: string) => {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        });
      });
      const topSkills = Array.from(skillsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      // Department analysis
      const deptMap = new Map<string, number>();
      offerings.forEach((o: any) => {
        if (o.department) {
          deptMap.set(o.department, (deptMap.get(o.department) || 0) + 1);
        }
      });
      const topDepartments = Array.from(deptMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dept, count]) => ({ dept, count }));

      // Most active hosts
      const hostBookingsMap = new Map<string, { name: string; count: number }>();
      bookings.forEach((b: any) => {
        if (b.host_user_id && b.host_name) {
          const existing = hostBookingsMap.get(b.host_user_id);
          if (existing) {
            existing.count++;
          } else {
            hostBookingsMap.set(b.host_user_id, { name: b.host_name, count: 1 });
          }
        }
      });
      const topHosts = Array.from(hostBookingsMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalOfferings: offerings.length,
        activeOfferings: offerings.filter((o: any) => o.is_active).length,
        activeHosts,
        activeShadows,
        totalBookings: bookings.length,
        upcomingBookings: bookings.filter((b: any) => b.status === 'confirmed' && new Date(b.start_datetime) > new Date()).length,
        completedBookings: completedBookings.length,
        totalHours,
        topSkills,
        topDepartments,
        topHosts,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Cross-Exposure Analytics</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Cross-Exposure Analytics</h2>
          <p className="text-muted-foreground">Unable to load analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Hosts</p>
                <p className="text-3xl font-bold">{analytics.activeHosts}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.activeOfferings} offerings
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Shadows</p>
                <p className="text-3xl font-bold">{analytics.activeShadows}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.upcomingBookings} upcoming
                </p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold">{analytics.completedBookings}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  completed
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold">{analytics.totalHours}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  of shadowing
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Top Skills Offered
            </CardTitle>
            <CardDescription>Most commonly offered skills in cross-exposure</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No skills data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topSkills.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </div>
                      <span className="font-medium">{item.skill}</span>
                    </div>
                    <Badge variant="secondary">{item.count} offerings</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Departments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Top Departments
            </CardTitle>
            <CardDescription>Departments with most host offerings</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topDepartments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No department data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topDepartments.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </div>
                      <span className="font-medium">{item.dept}</span>
                    </div>
                    <Badge variant="secondary">{item.count} offerings</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Hosts */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Most Active Hosts
            </CardTitle>
            <CardDescription>Hosts with the most completed shadow sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topHosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No host data yet</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {analytics.topHosts.map((host: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
                        {idx + 1}
                      </div>
                      <span className="font-medium">{host.name}</span>
                    </div>
                    <Badge variant="default">{host.count} sessions</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Program Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Program Overview</CardTitle>
          <CardDescription>Cross-exposure program summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Participation Rate</p>
              <p className="text-2xl font-bold">
                {analytics.activeHosts + analytics.activeShadows} participants
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.activeHosts} hosts, {analytics.activeShadows} shadows
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Booking Completion Rate</p>
              <p className="text-2xl font-bold">
                {analytics.totalBookings > 0
                  ? Math.round((analytics.completedBookings / analytics.totalBookings) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.completedBookings} of {analytics.totalBookings} sessions
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Average Session Duration</p>
              <p className="text-2xl font-bold">
                {analytics.completedBookings > 0
                  ? (analytics.totalHours / analytics.completedBookings).toFixed(1)
                  : 0}h
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                per session
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
