import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Users,
  Calendar,
  MessageSquare,
  Target,
  Settings,
  AlertTriangle,
  BookOpen
} from "lucide-react";
import MenteeDashboard from "@/components/dashboard/MenteeDashboard";
import MentorDashboard from "@/components/dashboard/MentorDashboard";
import { MyProfile } from "@/components/dashboard/MyProfile";
import { CohortOverview } from "@/components/dashboard/CohortOverview";
import { MySessions } from "@/components/dashboard/MySessions";
import { MessagingHub } from "@/components/dashboard/MessagingHub";
import Skills from "./Skills";
import { useUser } from "@/contexts/UserContext";
import type { Database } from "@/types/database";

type MenteeRow = Database["public"]["Tables"]["mentees"]["Row"];
type MentorRow = Database["public"]["Tables"]["mentors"]["Row"];

const Dashboard = () => {
  const { isLoading, userProfile } = useUser();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">We couldn't find your profile</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Try signing out and back in. If the issue continues, contact the program team so we can restore your access.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (userProfile.type) {
      case "mentee": {
        const menteeData = userProfile.data as MenteeRow | null;
        return (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                My Profile
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Skills
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <MenteeDashboard
                menteeId={userProfile.id}
                menteeRole={menteeData?.role ?? undefined}
              />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6 mt-6">
              <MyProfile
                userId={userProfile.id}
                userType="mentee"
                userData={menteeData}
              />
            </TabsContent>

            <TabsContent value="sessions" className="space-y-6 mt-6">
              <MySessions
                userId={userProfile.id}
                userType="mentee"
              />
            </TabsContent>

            <TabsContent value="messages" className="space-y-6 mt-6">
              <MessagingHub
                userId={userProfile.id}
                userType="mentee"
              />
            </TabsContent>

            <TabsContent value="skills" className="space-y-6 mt-6">
              <Skills />
            </TabsContent>
          </Tabs>
        );
      }
      case "mentor": {
        const mentorData = userProfile.data as MentorRow | null;
        return (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                My Profile
              </TabsTrigger>
              <TabsTrigger value="cohorts" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Cohorts
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Skills
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <MentorDashboard
                mentorId={userProfile.id}
                mentorRole={mentorData?.role ?? undefined}
              />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6 mt-6">
              <MyProfile
                userId={userProfile.id}
                userType="mentor"
                userData={mentorData}
              />
            </TabsContent>

            <TabsContent value="cohorts" className="space-y-6 mt-6">
              <CohortOverview
                userId={userProfile.id}
                userType="mentor"
              />
            </TabsContent>

            <TabsContent value="sessions" className="space-y-6 mt-6">
              <MySessions
                userId={userProfile.id}
                userType="mentor"
              />
            </TabsContent>

            <TabsContent value="messages" className="space-y-6 mt-6">
              <MessagingHub
                userId={userProfile.id}
                userType="mentor"
              />
            </TabsContent>

            <TabsContent value="skills" className="space-y-6 mt-6">
              <Skills />
            </TabsContent>
          </Tabs>
        );
      }
      case "admin":
        return (
          <Tabs defaultValue="mentor-view" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="mentor-view" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Mentor View
              </TabsTrigger>
              <TabsTrigger value="mentee-view" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Mentee View
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Profiles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mentor-view" className="space-y-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Admin Preview: Mentor Experience
                </Badge>
              </div>
              <MentorDashboard
                mentorId="admin-demo-mentor"
                mentorRole="Admin Demo"
              />
            </TabsContent>

            <TabsContent value="mentee-view" className="space-y-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Admin Preview: Mentee Experience
                </Badge>
              </div>
              <MenteeDashboard
                menteeId="admin-demo-mentee"
                menteeRole="Admin Demo"
              />
            </TabsContent>

            <TabsContent value="sessions" className="space-y-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Admin Preview: Session Management
                </Badge>
              </div>
              <MySessions
                userId="admin-demo"
                userType="mentor"
              />
            </TabsContent>

            <TabsContent value="messages" className="space-y-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  Admin Preview: Messaging System
                </Badge>
              </div>
              <MessagingHub
                userId="admin-demo"
                userType="mentor"
              />
            </TabsContent>

            <TabsContent value="profiles" className="space-y-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                  Admin Preview: Profile Management
                </Badge>
              </div>
              <MyProfile
                userId="admin-demo"
                userType="mentor"
                userData={null}
              />
            </TabsContent>
          </Tabs>
        );
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Welcome back!</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              We couldn't determine your role. Please contact support so we can get you to the right experience.
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;
