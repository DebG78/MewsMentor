import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  FileEdit,
  Users,
  Globe,
  Database,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { SurveyTemplateManager } from "@/components/SurveyTemplateManager";
import { SurveyMigrationHelper } from "@/components/SurveyMigrationHelper";
import { HelpGuide } from "@/components/HelpGuide";
import { AnalyticsHelpGuide } from "@/components/AnalyticsHelpGuide";
import MessageTemplates from "./admin/MessageTemplates";

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
      id: "messages",
      title: "Message Templates",
      icon: MessageSquare,
      description: "Manage welcome, announcement, and session templates"
    },
    {
      id: "users",
      title: "User Management",
      icon: Users,
      description: "Manage user roles and permissions",
      badge: "Coming Soon"
    },
    {
      id: "integrations",
      title: "Integrations",
      icon: Globe,
      description: "Power Automate and Zapier setup guides"
    },
    {
      id: "data-help",
      title: "Mentor/Mentee Data Upload",
      icon: Database,
      description: "Learn how uploads, columns, matching, and exports work"
    },
    {
      id: "analytics-guide",
      title: "Analytics Data Upload",
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
      <div className="mx-auto px-6 py-8">
        <div className="max-w-[1600px] mx-auto">
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
              {/* MS Forms notice */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        Surveys are currently administered via Microsoft Forms
                      </p>
                      <p className="text-sm text-blue-700">
                        Responses are imported automatically via Power Automate flows from Microsoft Forms.
                        The in-app survey builder below is not currently in use but is available for future cohorts.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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

            {/* Message Templates */}
            <TabsContent value="messages" className="space-y-6">
              <MessageTemplates />
            </TabsContent>

            {/* Integrations */}
            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Integrations
                  </CardTitle>
                  <CardDescription>
                    MewsMentor uses <strong>Power Automate</strong> to push Microsoft Forms data into the app, and <strong>Zapier</strong> to send messages from the app to Slack.
                    Below is the setup guide for each integration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Slack Messaging via Zapier */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Slack Messaging
                      <Badge variant="outline">Zapier</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Welcome DMs and channel announcements are sent via a Zapier webhook that posts to Slack.
                      The <code className="text-xs bg-muted px-1 py-0.5 rounded">send-welcome-messages</code> edge function
                      calls this webhook for each matched pair.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Zapier Zap setup:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Create a new Zap with <strong>Webhooks by Zapier</strong> as the trigger (Catch Hook)</li>
                          <li>Copy the webhook URL Zapier gives you</li>
                          <li>Add a <strong>Filter</strong> step: continue only if <code className="bg-background px-1 rounded">type</code> exists</li>
                          <li>Add <strong>Path</strong> step:
                            <ul className="list-disc list-inside ml-4">
                              <li>Path A: if <code className="bg-background px-1 rounded">type = dm</code> → Slack: Send Direct Message (use <code className="bg-background px-1 rounded">recipient_email</code> to find user, <code className="bg-background px-1 rounded">message_text</code> as message)</li>
                              <li>Path B: if <code className="bg-background px-1 rounded">type = channel</code> → Slack: Send Channel Message (use <code className="bg-background px-1 rounded">channel</code> field, <code className="bg-background px-1 rounded">message_text</code> as message)</li>
                            </ul>
                          </li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Supabase secrets required:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><code className="bg-background px-1 rounded">ZAPIER_SLACK_WEBHOOK_URL</code> — the Zapier Catch Hook URL</li>
                          <li><code className="bg-background px-1 rounded">SLACK_MENTORING_CHANNEL</code> — Slack channel for announcements (e.g. <code className="bg-background px-1 rounded">#mentoring</code>)</li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Webhook payload fields:</span>
                        <code className="block bg-background p-2 rounded mt-1 text-xs">
                          {`{ "type": "dm"|"channel", "recipient_email": "...", "channel": "#...", "message_text": "...", "cohort_name": "..." }`}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Survey Import via Power Automate */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Survey Response Import
                      <Badge variant="outline">Power Automate</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically import mentor/mentee survey responses from Microsoft Forms into MewsMentor.
                      The <code className="text-xs bg-muted px-1 py-0.5 rounded">import-survey-response</code> edge function
                      parses form fields and upserts profiles.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Power Automate flow setup:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Trigger: <strong>When a new response is submitted</strong> (Microsoft Forms)</li>
                          <li>Action: <strong>Get response details</strong> (Microsoft Forms)</li>
                          <li>Action: <strong>HTTP</strong> → POST</li>
                          <li>URI: your Supabase edge function URL + <code className="bg-background px-1 rounded">/import-survey-response?cohort_id=YOUR_COHORT_ID</code></li>
                          <li>Headers: <code className="bg-background px-1 rounded">x-api-key: YOUR_API_KEY</code>, <code className="bg-background px-1 rounded">Content-Type: application/json</code></li>
                          <li>Body: map form fields as JSON key-value pairs using dynamic content from "Get response details"</li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Supabase secret required:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><code className="bg-background px-1 rounded">SURVEY_IMPORT_API_KEY</code> — shared key for authenticating webhook calls</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Session Logging via Power Automate */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Session Logging
                      <Badge variant="outline">Power Automate</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Participants can log mentoring sessions via a form. The <code className="text-xs bg-muted px-1 py-0.5 rounded">log-session</code> edge
                      function records sessions and optionally triggers next-steps messages.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Power Automate flow setup:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Trigger: <strong>When a new response is submitted</strong> (Microsoft Forms — session log form)</li>
                          <li>Action: <strong>Get response details</strong> (Microsoft Forms)</li>
                          <li>Action: <strong>HTTP</strong> → POST</li>
                          <li>URI: your Supabase edge function URL + <code className="bg-background px-1 rounded">/log-session</code></li>
                          <li>Headers: <code className="bg-background px-1 rounded">x-api-key: YOUR_API_KEY</code>, <code className="bg-background px-1 rounded">Content-Type: application/json</code></li>
                          <li>Body: <code className="bg-background px-1 rounded">{`{ "respondent_email": "...", "date": "2026-01-15", "duration_minutes": 30, "rating": 4, "journey_phase": "building" }`}</code></li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Supabase secret required:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><code className="bg-background px-1 rounded">LOG_SESSION_API_KEY</code> — shared key for authenticating session log calls</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Summary of all secrets */}
                  <div className="space-y-3 border-t pt-6">
                    <h3 className="text-base font-semibold">All Supabase Secrets Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      Set these via <code className="text-xs bg-muted px-1 py-0.5 rounded">supabase secrets set KEY=value</code> in the CLI:
                    </p>
                    <div className="bg-muted rounded-md p-4 text-sm font-mono space-y-1 text-muted-foreground">
                      <div><code>ZAPIER_SLACK_WEBHOOK_URL</code> — Zapier Catch Hook URL for Slack (used by Zap)</div>
                      <div><code>SLACK_MENTORING_CHANNEL</code> — e.g. #mentoring (used by Zap)</div>
                      <div><code>SURVEY_IMPORT_API_KEY</code> — API key for survey import (used by Power Automate)</div>
                      <div><code>LOG_SESSION_API_KEY</code> — API key for session logging (used by Power Automate)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mentor/Mentee Data Upload */}
            <TabsContent value="data-help" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Mentor/Mentee Data Upload
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

            {/* Analytics Data Upload */}
            <TabsContent value="analytics-guide" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Analytics Data Upload
                  </CardTitle>
                  <CardDescription>
                    Understand analytics pages, metrics, and how to get session data in via Slack, Forms, or CSV.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsHelpGuide />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other Settings - Coming Soon */}
            {settingsCategories.filter(cat => ["users"].includes(cat.id)).map((category) => (
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