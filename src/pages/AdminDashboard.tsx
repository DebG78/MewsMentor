import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  ArrowLeft,
  Users,
  Eye,
  BarChart3,
  LayoutDashboard,
  UserCog
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CohortManagement } from "@/components/CohortManagement";
import { HoldingArea } from "@/components/HoldingArea";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { AutomatedMessages } from "@/components/AutomatedMessages";
import { AllProfiles } from "@/components/AllProfiles";
import type { Cohort } from "@/types/mentoring";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const { toast } = useToast();

  const handleCohortSelected = (cohort: Cohort | null) => {
    setSelectedCohort(cohort);
    if (cohort) {
      setActiveTab("mentoring");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header - Full Width */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage all programs and participants</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">

        {/* Main Program-Based Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="mentoring">
              <Target className="w-4 h-4 mr-2" />
              Mentoring Program
            </TabsTrigger>
            <TabsTrigger value="cross-exposure">
              <Eye className="w-4 h-4 mr-2" />
              Cross-Exposure Program
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              People & Analytics
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Mentoring Program
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Cohorts</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Pairs</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                      <span className="font-semibold">--</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => setActiveTab("mentoring")}
                  >
                    Manage Mentoring
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600" />
                    Cross-Exposure Program
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Offerings</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Bookings</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Active Hosts</span>
                      <span className="font-semibold">--</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => setActiveTab("cross-exposure")}
                  >
                    Manage Cross-Exposure
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-purple-600" />
                    Overall Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Participants</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Growth Events</span>
                      <span className="font-semibold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Skills Developed</span>
                      <span className="font-semibold">--</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => setActiveTab("analytics")}
                  >
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates across all programs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Activity feed coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MENTORING PROGRAM TAB */}
          <TabsContent value="mentoring" className="space-y-6">
            {selectedCohort && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCohort(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to cohorts list
              </Button>
            )}

            {!selectedCohort ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Mentoring Cohorts</CardTitle>
                    <CardDescription>Manage mentoring program cohorts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CohortManagement onCohortSelected={handleCohortSelected} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Unassigned Participants</CardTitle>
                    <CardDescription>Mentees and mentors waiting for cohort assignment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HoldingArea />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>All Sessions</CardTitle>
                    <CardDescription>Global session analytics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SessionAnalytics selectedCohort={null} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Automated Messages</CardTitle>
                    <CardDescription>Configure automated messaging</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AutomatedMessages />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedCohort.name}</CardTitle>
                    <CardDescription>Cohort details and management</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Selected cohort functionality will be implemented here
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* CROSS-EXPOSURE PROGRAM TAB */}
          <TabsContent value="cross-exposure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cross-Exposure Program Management</CardTitle>
                <CardDescription>Manage host offerings and shadow bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Cross-Exposure admin features coming soon:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
                    <li>View all host offerings</li>
                    <li>Approve/reject offerings</li>
                    <li>Manage shadow bookings</li>
                    <li>Cross-exposure analytics</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PEOPLE & ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Profiles</CardTitle>
                <CardDescription>View all participants across programs</CardDescription>
              </CardHeader>
              <CardContent>
                <AllProfiles selectedCohort={null} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Analytics</CardTitle>
                <CardDescription>Cross-program insights and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Analytics dashboard coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
