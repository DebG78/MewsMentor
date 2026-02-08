import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  FileEdit,
  Users,
  Bell,
  Globe,
  Database,
  BarChart3,
} from "lucide-react";
import { SurveyTemplateManager } from "@/components/SurveyTemplateManager";
import { SurveyMigrationHelper } from "@/components/SurveyMigrationHelper";
import { HelpGuide } from "@/components/HelpGuide";
import { AnalyticsHelpGuide } from "@/components/AnalyticsHelpGuide";

const Settings = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "survey-templates");

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const settingsCategories = [
    {
      id: "survey-templates",
      title: "Survey Templates",
      icon: FileEdit,
      description: "Create and manage survey templates"
    },
    {
      id: "users",
      title: "User Management",
      icon: Users,
      description: "Manage user roles and permissions",
      badge: "Coming Soon"
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      description: "Configure email and system notifications",
      badge: "Coming Soon"
    },
    {
      id: "integrations",
      title: "Integrations",
      icon: Globe,
      description: "Connect with external services",
      badge: "Coming Soon"
    },
    {
      id: "data-help",
      title: "Data & Help",
      icon: Database,
      description: "Learn how uploads, columns, matching, and exports work"
    },
    {
      id: "analytics-guide",
      title: "Analytics Guide",
      icon: BarChart3,
      description: "Understand analytics pages, metrics, and admin workflows"
    }
  ];

  const renderComingSoon = (category: typeof settingsCategories[0]) => (
    <Card className="p-8 text-center">
      <category.icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
      <p className="text-muted-foreground mb-4">{category.description}</p>
      <Badge variant="outline">Coming Soon</Badge>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Configure your mentoring platform settings and preferences
            </p>
          </div>

          {/* Settings Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1">
              {settingsCategories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col items-center gap-1 p-3 text-xs"
                >
                  <category.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{category.title.split(' ')[0]}</span>
                  {category.badge && (
                    <Badge
                      variant={category.badge === "Featured" ? "default" : "outline"}
                      className="text-xs px-1"
                    >
                      {category.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Survey Templates */}
            <TabsContent value="survey-templates" className="space-y-6">
              {/* Migration Helper */}
              <SurveyMigrationHelper />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5" />
                    Survey Templates
                  </CardTitle>
                  <CardDescription>
                    Create multiple survey templates that can be assigned to different cohorts.
                    This allows you to customize the signup process for different programs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SurveyTemplateManager />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data & Help */}
            <TabsContent value="data-help" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Data & Help
                  </CardTitle>
                  <CardDescription>
                    Learn about spreadsheet columns, data uploads, and how the matching algorithm works.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HelpGuide />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Guide */}
            <TabsContent value="analytics-guide" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Analytics Guide
                  </CardTitle>
                  <CardDescription>
                    Understand every analytics page, what the metrics mean, how to read charts,
                    and what actions to take as an admin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsHelpGuide />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other Settings - Coming Soon */}
            {settingsCategories.filter(cat => cat.id !== "survey-templates" && cat.id !== "data-help" && cat.id !== "analytics-guide").map((category) => (
              <TabsContent key={category.id} value={category.id} className="space-y-6">
                {renderComingSoon(category)}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;