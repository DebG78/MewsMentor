import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  FileEdit,
  Users,
  Bell,
  Shield,
  Globe,
  Palette,
  Database,
  Mail
} from "lucide-react";
import { SurveyTemplateManager } from "@/components/SurveyTemplateManager";
import { SurveyMigrationHelper } from "@/components/SurveyMigrationHelper";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("survey-templates");

  const settingsCategories = [
    {
      id: "survey-templates",
      title: "Survey Templates",
      icon: FileEdit,
      description: "Create and manage survey templates",
      badge: "Featured"
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
      id: "security",
      title: "Security",
      icon: Shield,
      description: "Authentication and security settings",
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
      id: "appearance",
      title: "Appearance",
      icon: Palette,
      description: "Customize the look and feel",
      badge: "Coming Soon"
    },
    {
      id: "data",
      title: "Data & Export",
      icon: Database,
      description: "Backup and export options",
      badge: "Coming Soon"
    },
    {
      id: "email",
      title: "Email Templates",
      icon: Mail,
      description: "Customize email templates",
      badge: "Coming Soon"
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
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1">
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

            {/* Other Settings - Coming Soon */}
            {settingsCategories.filter(cat => cat.id !== "survey-templates").map((category) => (
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