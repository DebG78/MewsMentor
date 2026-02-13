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
                      All Slack messages (welcome DMs, next-steps messages, and channel announcements) are sent via a Zapier webhook.
                      Three edge functions use this webhook:{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-welcome-messages</code> (launch),{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-stage-messages</code> (manual midpoint/closure blasts), and{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">log-session</code> (auto-sends next-steps after each logged session).
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
                      Mentor/Mentee Signup Survey Import
                      <Badge variant="outline">Power Automate</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically import mentor/mentee signup survey responses from Microsoft Forms into MewsMentor.
                      Each form submission creates a mentee and/or mentor profile. Participants can go directly into a
                      specific cohort, or land in the <strong>Holding Area</strong> for later assignment.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Step 1 — Create the Power Automate flow:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Go to <strong>Power Automate</strong> → <strong>Create</strong> → <strong>Automated cloud flow</strong></li>
                          <li>Trigger: <strong>"When a new response is submitted"</strong> (Microsoft Forms) — select your signup form</li>
                          <li>Add action: <strong>"Get response details"</strong> (Microsoft Forms) — select the same form, set Response Id to the trigger's Response Id</li>
                          <li>Add action: <strong>"HTTP"</strong> (premium connector)</li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Step 2 — Configure the HTTP action:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Method:</strong> POST</li>
                          <li><strong>URI:</strong> <code className="bg-background px-1 rounded">https://YOUR_PROJECT.supabase.co/functions/v1/import-survey-response</code></li>
                          <li>Append <code className="bg-background px-1 rounded">?cohort_id=YOUR_COHORT_ID</code> to route to a specific cohort, <strong>or omit it</strong> to send to the Holding Area</li>
                          <li><strong>Headers:</strong></li>
                        </ul>
                        <code className="block bg-background p-2 rounded mt-1 ml-4 text-xs">
                          {`x-api-key: YOUR_SURVEY_IMPORT_API_KEY`}<br/>
                          {`Content-Type: application/json`}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Step 3 — Build the JSON body:</span>
                        <p className="mt-1 ml-2 text-muted-foreground">
                          In the HTTP action's <strong>Body</strong> field, map each form question to a JSON key.
                          Use the dynamic content from "Get response details" to fill in values.
                          The field names in your JSON should match your MS Forms question text — the system uses
                          smart keyword matching to map fields automatically.
                        </p>
                        <code className="block bg-background p-2 rounded mt-1 ml-4 text-xs whitespace-pre">
{`{
  "name": "@{outputs('Get_response_details')?['body/...name...']}",
  "email": "@{outputs('Get_response_details')?['body/...email...']}",
  "How do you want to participate as": "@{...}",
  "What is your current role title": "@{...}",
  "What time-zone are you in": "@{...}",
  "What is your current level": "@{...}",
  ...map all form questions...
}`}
                        </code>
                        <p className="mt-2 ml-2 text-muted-foreground text-xs">
                          <strong>Tip:</strong> You don't need to match field names exactly. The system looks for keywords
                          like "time zone", "role title", "primary capability", "how many mentees" etc.
                          Just use the form question text as the JSON key.
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">How it works:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>The "participate as" field determines whether a <strong>mentee</strong>, <strong>mentor</strong>, or <strong>both</strong> record is created</li>
                          <li>If <code className="bg-background px-1 rounded">cohort_id</code> is provided, the participant goes into that cohort (must be draft or active)</li>
                          <li>If omitted, the participant goes to the <strong>Holding Area</strong> — you can assign them to a cohort later</li>
                          <li>Re-submissions from the same email update the existing record (upsert) instead of creating duplicates</li>
                          <li>All capability fields, practice scenarios, strengths, etc. are automatically parsed from the form</li>
                        </ul>
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
                      Session Logging + Auto-Send
                      <Badge variant="outline">Power Automate</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Participants log mentoring sessions via a form. The <code className="text-xs bg-muted px-1 py-0.5 rounded">log-session</code> edge
                      function records the session and <strong>automatically detects the journey phase</strong> based on how many
                      sessions the pair has completed. If a next-steps template exists for that phase, it sends it to the
                      respondent via Slack — no admin action required.
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
                          <li>Body: <code className="bg-background px-1 rounded">{`{ "respondent_email": "...", "date": "2026-01-15", "duration_minutes": 30, "rating": 4 }`}</code></li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">What happens after a session is logged:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Session is saved to the database</li>
                          <li>Completed session count for the pair is calculated</li>
                          <li>Journey phase is auto-detected using the cohort's session thresholds (configured in Runbook &rarr; Setup stage)</li>
                          <li>The session record is updated with the detected phase</li>
                          <li>If a role-specific template (<code className="bg-background px-1 rounded">next_steps_mentee</code> or <code className="bg-background px-1 rounded">next_steps_mentor</code>) exists for that phase, it's used; otherwise falls back to the generic <code className="bg-background px-1 rounded">next_steps</code> template. The message is sent via Slack if the respondent hasn't already received it.</li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Default session thresholds (configurable per cohort):</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Sessions 1–2 → <strong>Getting Started</strong></li>
                          <li>Sessions 3–5 → <strong>Building</strong></li>
                          <li>Sessions 6–7 → <strong>Midpoint</strong></li>
                          <li>Sessions 8+ → <strong>Wrapping Up</strong></li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Deduplication:</span>
                        <p className="mt-1 ml-2 text-muted-foreground">
                          Each person only receives a given phase's next-steps message once. If they've already been sent it
                          (via auto-send or the admin's manual "Send Stage Messages" button), subsequent sessions in the same phase are skipped.
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Supabase secret required:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><code className="bg-background px-1 rounded">LOG_SESSION_API_KEY</code> — shared key for authenticating session log calls</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Next-Steps Stage Messaging */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Next-Steps Stage Messaging (Manual)
                      <Badge variant="outline">Runbook</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      In addition to auto-sending next-steps messages after each logged session, admins can manually
                      send stage messages to all remaining participants via the Cohort Runbook. This is useful when you
                      want to reach participants who haven't yet logged a session for a given phase.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">How it works:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Go to the <strong>Cohort Runbook</strong> page</li>
                          <li>Expand the <strong>Midpoint</strong> or <strong>Closure</strong> stage</li>
                          <li>Click <strong>"Send Midpoint Messages"</strong> or <strong>"Send Wrapping Up Messages"</strong></li>
                          <li>The system loads templates for that phase — if role-specific templates exist (<code className="bg-background px-1 rounded">next_steps_mentee</code> / <code className="bg-background px-1 rounded">next_steps_mentor</code>), each person gets their tailored message; otherwise the generic <code className="bg-background px-1 rounded">next_steps</code> template is used</li>
                          <li>For each pair, <strong>both</strong> the mentee and mentor receive their respective message</li>
                          <li>Anyone who was already auto-sent the message is <strong>automatically skipped</strong> (no duplicates)</li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Edge function:</span>
                        <p className="mt-1 ml-2 text-muted-foreground">
                          <code className="bg-background px-1 rounded">send-stage-messages</code> — accepts{' '}
                          <code className="bg-background px-1 rounded">{`{ cohort_id, journey_phase }`}</code> and
                          returns <code className="bg-background px-1 rounded">{`{ sent, failed, skipped }`}</code> counts.
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Configuring session thresholds:</span>
                        <p className="mt-1 ml-2 text-muted-foreground">
                          In the Runbook's <strong>Setup</strong> stage, you'll find a "Journey Phase Thresholds" section where you can
                          configure how many completed sessions map to each phase. These thresholds are saved per cohort and used
                          by both auto-detect (log-session) and manual sends.
                        </p>
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
                      <div><code>ZAPIER_SLACK_WEBHOOK_URL</code> — Zapier Catch Hook URL for Slack (used by welcome, stage, and auto-send messages)</div>
                      <div><code>SLACK_MENTORING_CHANNEL</code> — e.g. #mentoring (used for channel announcements)</div>
                      <div><code>SURVEY_IMPORT_API_KEY</code> — API key for survey import (used by Power Automate)</div>
                      <div><code>LOG_SESSION_API_KEY</code> — API key for session logging (used by Power Automate)</div>
                      <div><code>ADMIN_EMAIL</code> — Admin contact email for templates (optional, defaults to mentoring@mews.com)</div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      <strong>Edge functions to deploy:</strong>{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-welcome-messages</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-stage-messages</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">log-session</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">import-survey-response</code>
                    </p>
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