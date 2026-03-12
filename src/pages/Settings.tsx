import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  FileEdit,
  Users,
  Globe,
  Database,
  BarChart3,
  MessageSquare,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadUploadTemplate } from "@/lib/templateDownload";
import { SurveyTemplateManager } from "@/components/SurveyTemplateManager";
import { SurveyMigrationHelper } from "@/components/SurveyMigrationHelper";
import { HelpGuide } from "@/components/HelpGuide";
import { AnalyticsHelpGuide } from "@/components/AnalyticsHelpGuide";
import MessageTemplates from "./admin/MessageTemplates";
import { PageHeader } from "@/components/admin/PageHeader";

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
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your mentoring platform settings and preferences"
      />

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
                      All Slack messages (welcome DMs, next-steps messages, bulk messages, session reminders, and channel announcements) are sent via a Zapier webhook.
                      Five edge functions use this webhook:{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-welcome-messages</code> (launch),{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-stage-messages</code> (manual midpoint/closure blasts),{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-bulk-messages</code> (ad-hoc messages to any group),{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-session-reminders</code> (monthly session-logging reminders), and{' '}
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
                              <li>Path A: if <code className="bg-background px-1 rounded">type = dm</code> → Slack: Send Direct Message (use <code className="bg-background px-1 rounded">slack_user_id</code> to find user, <code className="bg-background px-1 rounded">message_text</code> as message)</li>
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
                          {`{ "type": "dm"|"channel", "slack_user_id": "...", "channel": "#...", "message_text": "...", "cohort_name": "..." }`}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Survey Import via Power Automate */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Mentor/Mentee Signup Survey Import
                      <Badge variant="outline">Power Automate</Badge>
                      <Badge variant="secondary">Legacy</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Sign-up surveys are now imported via <strong>CSV bulk upload</strong> through
                      the admin UI (Admin &rarr; Data Import &rarr; CSV Upload). The Power Automate webhook below is kept
                      for backward compatibility with existing flows but should not be used for new integrations.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The legacy webhook imports mentor/mentee signup survey responses from Microsoft Forms into MewsMentor.
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
                      function records the session using the <strong>self-reported journey phase</strong> from the form submission.
                      If a <code className="text-xs bg-muted px-1 py-0.5 rounded">journey_phase</code> is provided and a next-steps
                      template exists for that phase, the function sends it to the respondent via Slack — no admin action required.
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
                          <li>Body: <code className="bg-background px-1 rounded">{`{ "slack_user_id": "U...", "rating": 4, "journey_phase": "Getting Started", "feedback": "..." }`}</code> — <code className="bg-background px-1 rounded">date</code> and <code className="bg-background px-1 rounded">duration_minutes</code> are optional (default: now, 60 min)</li>
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
                        <span className="font-medium">Accepted journey_phase values (self-reported on the form):</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><code className="bg-background px-1 rounded">getting_started</code> (or "Getting Started")</li>
                          <li><code className="bg-background px-1 rounded">building</code> (or "Building")</li>
                          <li><code className="bg-background px-1 rounded">midpoint</code> (or "Midpoint Check-In")</li>
                          <li><code className="bg-background px-1 rounded">wrapping_up</code> (or "Wrapping Up")</li>
                        </ul>
                        <p className="mt-1 ml-2 text-muted-foreground text-xs">
                          The function accepts both internal keys and human-readable labels (e.g. from a Power Automate dropdown).
                          If omitted, the session is saved without a phase and no next-steps message is auto-sent.
                        </p>
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

                  {/* Session Reminders */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Monthly Session Reminders
                      <Badge variant="outline">Zapier</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      The <code className="text-xs bg-muted px-1 py-0.5 rounded">send-session-reminders</code> edge function
                      sends monthly session-logging reminder DMs to all matched participants in active cohorts. It can be
                      triggered by a cron job (processes all active cohorts) or manually for a single cohort.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">How it works:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Finds all active cohorts with a <code className="bg-background px-1 rounded">start_date</code> and reminders enabled</li>
                          <li>Calculates the number of complete months since the cohort's start date</li>
                          <li>For each month boundary, sends a reminder DM to every matched mentee and mentor who hasn't already received one for that month</li>
                          <li>Uses the <code className="bg-background px-1 rounded">session_reminder</code> message template (cohort-specific or global)</li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Invocation:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Cron (all cohorts):</strong> POST with empty body</li>
                          <li><strong>Single cohort:</strong> POST with <code className="bg-background px-1 rounded">{`{ "cohort_id": "..." }`}</code></li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Deduplication:</span>
                        <p className="mt-1 ml-2 text-muted-foreground">
                          Each person only receives one reminder per month (tracked via <code className="bg-background px-1 rounded">journey_phase = "month_N"</code> in the message log).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* End-of-Mentoring Survey Import via Power Automate */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      End-of-Mentoring Survey Import
                      <Badge variant="outline">Power Automate</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Import end-of-mentoring survey responses from Microsoft Forms. The <code className="text-xs bg-muted px-1 py-0.5 rounded">import-end-survey</code> edge
                      function saves individual responses and <strong>auto-computes metric snapshots</strong> (mentee satisfaction,
                      mentor satisfaction, NPS, goal achievement rate, mentor retention rate, match satisfaction) after each submission.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Power Automate flow setup:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Trigger: <strong>When a new response is submitted</strong> (Microsoft Forms — end survey form)</li>
                          <li>Action: <strong>Get response details</strong> (Microsoft Forms)</li>
                          <li>Action: <strong>HTTP</strong> → POST</li>
                          <li>URI: <code className="bg-background px-1 rounded">https://YOUR_PROJECT.supabase.co/functions/v1/import-end-survey</code></li>
                          <li>Append <code className="bg-background px-1 rounded">?cohort_id=YOUR_COHORT_ID</code> to target a specific cohort, <strong>or omit it</strong> to auto-detect from the respondent's Slack ID</li>
                          <li>Headers: <code className="bg-background px-1 rounded">x-api-key: YOUR_END_SURVEY_API_KEY</code>, <code className="bg-background px-1 rounded">Content-Type: application/json</code></li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">HTTP body — map MS Forms dynamic content:</span>
                        <p className="mt-1 ml-2 text-muted-foreground mb-2">
                          Use the MS Forms dynamic content picker to map each question. The edge function uses keyword-based matching,
                          so the column headers from your form will be matched automatically.
                        </p>
                        <pre className="bg-background p-3 rounded text-xs overflow-x-auto text-muted-foreground">
{`{
  "Please share with us your slack ID": "@{outputs('Get_response_details')?['body/...slack...']}",
  "For this cohort I participated as": "@{outputs('Get_response_details')?['body/...participated...']}",
  "Mentoring helped me improve how I support others growth": "@{...Q3...}",
  "I used skills in mentoring that I dont regularly use in my role": "@{...Q4...}",
  "I could see a positive impact on my mentee": "@{...Q5...}",
  "The time I invested in mentoring felt worthwhile": "@{...Q6...}",
  "How has mentoring changed the way you support or interact with others at work": "@{...Q7...}",
  "I now have a clearer understanding of how to practice this skill": "@{...Q8...}",
  "My mentor helped me clarify what I should focus on developing next": "@{...Q9...}",
  "My mentor challenged my perspective rather than just giving answers": "@{...Q10...}",
  "I actively prepared or reflected between sessions": "@{...Q11...}",
  "What is something you ended up developing through mentoring that you didnt expect": "@{...Q12...}",
  "Mentoring improved how I collaborate or communicate outside my usual team": "@{...Q13...}",
  "How well did your mentor-mentee pairing work for you": "@{...Q14...}",
  "I felt comfortable being open during mentoring conversations": "@{...Q15...}",
  "How often did you meet": "@{...Q16...}",
  "Around which session did conversations start becoming genuinely useful": "@{...Q17...}",
  "Overall this mentoring relationship was worth the time invested": "@{...Q18...}",
  "It was easy to maintain momentum between sessions": "@{...Q19...}",
  "Would you join mentoring again": "@{...Q20...}",
  "Anything you would like to share with us": "@{...Q21...}"
}`}
                        </pre>
                      </div>
                      <div>
                        <span className="font-medium">Cohort auto-detection (when no ?cohort_id):</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Looks up the respondent by Slack ID across all <strong>active</strong> cohorts</li>
                          <li>If found in multiple cohorts, selects the one with the most completed sessions</li>
                          <li>Falls back to the most recently created cohort if tied</li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Metrics auto-computed after each response:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Mentee Satisfaction</strong> — avg of Q8 + Q9 + Q18 for mentee respondents</li>
                          <li><strong>Mentor Satisfaction</strong> — avg of Q3 + Q5 + Q6 for mentor respondents</li>
                          <li><strong>NPS Score</strong> — from Q20 (Yes = promoter, No = detractor, Maybe = passive)</li>
                          <li><strong>Goal Achievement Rate</strong> — % of mentees scoring Q8 ≥ 4</li>
                          <li><strong>Mentor Retention Rate</strong> — % of mentors answering Q20 = Yes</li>
                          <li><strong>Match Satisfaction</strong> — avg of Q14 across all respondents</li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Supabase secret required:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><code className="bg-background px-1 rounded">END_SURVEY_API_KEY</code> — shared key for authenticating end survey calls</li>
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
                    </div>
                  </div>

                  {/* Bulk Messaging / Compose & Send */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Bulk Messaging &amp; Compose &amp; Send
                      <Badge variant="outline">New</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Send ad-hoc Slack DMs to any group of participants — unmatched mentees, everyone in a cohort,
                      or people in the holding area. Useful for keeping unmatched participants warm between cohorts,
                      sending updates, or any other custom communication.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Two ways to send:</span>
                        <ol className="list-decimal list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Settings &rarr; Messages &rarr; Compose &amp; Send tab</strong> — full compose flow: choose audience source, select recipients, pick or write a template, preview, and send</li>
                          <li><strong>Cohort Detail &rarr; Actions menu &rarr; Message Unmatched</strong> — quick action pre-populated with unmatched mentees in that cohort</li>
                        </ol>
                      </div>
                      <div>
                        <span className="font-medium">Audience sources:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>All in cohort</strong> — every mentee and mentor assigned to a cohort</li>
                          <li><strong>Unmatched in cohort</strong> — mentees who were not matched (no approved or manual match)</li>
                          <li><strong>Holding area</strong> — people with <code className="bg-background px-1 rounded">cohort_id = 'unassigned'</code> waiting for placement</li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Custom template types:</span>
                        <p className="mt-1 ml-2 text-muted-foreground">
                          When creating a new message template, select <strong>"Custom..."</strong> from the type dropdown to enter
                          your own type name (e.g. <code className="bg-background px-1 rounded">waitlist_nurture</code>,{' '}
                          <code className="bg-background px-1 rounded">cohort_closed</code>,{' '}
                          <code className="bg-background px-1 rounded">re_engagement</code>). Custom types are stored alongside
                          built-in types and appear in all template pickers.
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">How it works under the hood:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>The Compose &amp; Send UI calls the <code className="bg-background px-1 rounded">send-bulk-messages</code> edge function</li>
                          <li>Each recipient gets a personalised message (placeholders like <code className="bg-background px-1 rounded">{'{FIRST_NAME}'}</code>, <code className="bg-background px-1 rounded">{'{PRIMARY_CAPABILITY}'}</code> are filled per person)</li>
                          <li>Messages are sent as Slack DMs via the same Zapier webhook</li>
                          <li>Every message is logged to the <code className="bg-background px-1 rounded">message_log</code> table and visible in the Message Log tab</li>
                          <li>Recipients without a <code className="bg-background px-1 rounded">slack_user_id</code> are flagged in the UI and cannot be selected</li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Available placeholders:</span>
                        <code className="block bg-background p-2 rounded mt-1 text-xs">
                          {'{FIRST_NAME}'}, {'{FULL_NAME}'}, {'{ROLE_TITLE}'}, {'{PRIMARY_CAPABILITY}'}, {'{SECONDARY_CAPABILITY}'}, {'{MENTORING_GOAL}'}, {'{BIO}'}, {'{COHORT_NAME}'}, {'{ADMIN_EMAIL}'}, {'{RESOURCE_LINK}'}, {'{SURVEY_LINK}'}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Slack link formatting:</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Plain URLs in templates are auto-linked by Slack. For named links (e.g. "mentoring guide" instead of the raw URL), use Slack mrkdwn syntax directly in templates:
                        </p>
                        <code className="block bg-background p-2 rounded mt-1 text-xs">
                          {'<{RESOURCE_LINK}|mentoring guide>'} → clickable "mentoring guide" link{'\n'}
                          {'<{SURVEY_LINK}|take the survey>'} → clickable "take the survey" link{'\n'}
                          {'<mailto:{ADMIN_EMAIL}|{ADMIN_EMAIL}>'} → clickable email link
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Message Sending Paths — How It All Fits Together */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      Message Sending Paths — Quick Reference
                      <Badge variant="outline">Architecture</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      There are four distinct paths for sending Slack messages. All paths go through the same Zapier webhook,
                      but they differ in <strong>who triggers them</strong>, <strong>who receives them</strong>, and <strong>how recipients are filtered</strong>.
                    </p>
                    <div className="bg-muted rounded-md p-4 space-y-4 text-sm">

                      {/* Path 1 — Welcome Messages */}
                      <div>
                        <span className="font-medium">Path 1: Welcome Messages (Launch stage)</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Trigger:</strong> Admin clicks "Send Welcome Messages" in the Cohort Runbook launch stage</li>
                          <li><strong>Recipients:</strong> Only mentees and mentors in <strong>approved match pairs</strong> (from <code className="bg-background px-1 rounded">manual_matches</code> or <code className="bg-background px-1 rounded">proposed_assignment</code>)</li>
                          <li><strong>Template routing:</strong> <code className="bg-background px-1 rounded">welcome_mentee</code> goes to mentees, <code className="bg-background px-1 rounded">welcome_mentor</code> goes to mentors, <code className="bg-background px-1 rounded">channel_announcement</code> goes to the Slack channel</li>
                          <li><strong>Edge function:</strong> <code className="bg-background px-1 rounded">send-welcome-messages</code> (standard path) or <code className="bg-background px-1 rounded">send-bulk-messages</code> (when templates have overrides)</li>
                          <li><strong>Unmatched/pending participants do NOT receive welcome messages</strong></li>
                        </ul>
                      </div>

                      {/* Path 2 — Auto-send after session logging */}
                      <div>
                        <span className="font-medium">Path 2: Auto-Send After Session Logging</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Trigger:</strong> A mentor or mentee logs a session via MS Forms &rarr; Power Automate &rarr; <code className="bg-background px-1 rounded">log-session</code> edge function</li>
                          <li><strong>Recipients:</strong> Only the <strong>individual person</strong> who logged the session</li>
                          <li><strong>Phase detection:</strong> Uses the phase the respondent selected in the form, or auto-detects from session count (1-2 = Getting Started, 3-5 = Building, 6-7 = Midpoint, 8+ = Wrapping Up)</li>
                          <li><strong>Template routing:</strong> Sends the <code className="bg-background px-1 rounded">next_steps_mentee</code> or <code className="bg-background px-1 rounded">next_steps_mentor</code> template matching the detected phase; falls back to generic <code className="bg-background px-1 rounded">next_steps</code></li>
                          <li><strong>Deduplication:</strong> Each person receives a given phase's message <strong>only once</strong> — checked via <code className="bg-background px-1 rounded">message_log</code></li>
                          <li><strong>Only people in approved match pairs</strong> can log sessions (the edge function searches for matching pairs)</li>
                        </ul>
                      </div>

                      {/* Path 3 — Manual stage messages from Runbook */}
                      <div>
                        <span className="font-medium">Path 3: Manual Stage Messages (Runbook Midpoint / Closure)</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Trigger:</strong> Admin clicks "Send Midpoint Messages" or "Send Wrapping Up Messages" in the Cohort Runbook</li>
                          <li><strong>Recipients:</strong> Only mentees and mentors in <strong>approved match pairs</strong></li>
                          <li><strong>Phase-aware filtering:</strong> Each pair's current journey phase is determined from their session logs (self-reported phase takes priority, otherwise auto-detected from session count). Templates are only sent to pairs whose phase matches the template's <code className="bg-background px-1 rounded">journey_phase</code></li>
                          <li><strong>Template routing:</strong> <code className="bg-background px-1 rounded">next_steps_mentee</code> goes to mentees only, <code className="bg-background px-1 rounded">next_steps_mentor</code> goes to mentors only, generic <code className="bg-background px-1 rounded">next_steps</code> goes to both</li>
                          <li><strong>Deduplication:</strong> Anyone who was already auto-sent the message (via Path 2) is <strong>automatically skipped</strong></li>
                          <li><strong>Edge function:</strong> <code className="bg-background px-1 rounded">send-stage-messages</code> (standard path) or <code className="bg-background px-1 rounded">send-bulk-messages</code> (when templates have overrides or partial selection)</li>
                          <li><strong>Unmatched/pending participants do NOT receive stage messages</strong></li>
                        </ul>
                      </div>

                      {/* Path 4 — Compose & Send (ad-hoc) */}
                      <div>
                        <span className="font-medium">Path 4: Compose &amp; Send (Ad-Hoc Bulk)</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li><strong>Trigger:</strong> Admin uses the Compose &amp; Send UI (Settings &rarr; Messages tab)</li>
                          <li><strong>Recipients:</strong> Admin manually selects from one of three audiences: all in cohort, unmatched in cohort, or holding area</li>
                          <li><strong>No automatic filtering by match status or phase</strong> — this is intentionally open-ended for ad-hoc communication</li>
                          <li><strong>Use cases:</strong> Notifying unmatched people, sending updates to the holding area, custom announcements</li>
                          <li><strong>Edge function:</strong> <code className="bg-background px-1 rounded">send-bulk-messages</code></li>
                        </ul>
                      </div>

                      {/* Key safety rules */}
                      <div className="border-t pt-3 mt-3">
                        <span className="font-medium">Key safety rules across all paths:</span>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1 text-muted-foreground">
                          <li>Paths 1-3 <strong>only send to approved match pairs</strong> — pending/unmatched participants are excluded</li>
                          <li>Path 3 respects <strong>per-pair journey phase</strong> — a pair in "Building" won't receive "Wrapping Up" templates</li>
                          <li>Deduplication via <code className="bg-background px-1 rounded">message_log</code> prevents duplicate messages for the same phase</li>
                          <li>All messages are logged with delivery status for auditing</li>
                          <li>Participants without a <code className="bg-background px-1 rounded">slack_user_id</code> are silently skipped</li>
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
                      <div><code>ZAPIER_SLACK_WEBHOOK_URL</code> — Zapier Catch Hook URL for Slack (used by welcome, stage, and auto-send messages)</div>
                      <div><code>SLACK_MENTORING_CHANNEL</code> — e.g. #mentoring (used for channel announcements)</div>
                      <div><code>SURVEY_IMPORT_API_KEY</code> — API key for survey import (used by Power Automate)</div>
                      <div><code>LOG_SESSION_API_KEY</code> — API key for session logging (used by Power Automate)</div>
                      <div><code>END_SURVEY_API_KEY</code> — API key for end-of-mentoring survey import (used by Power Automate)</div>
                      <div><code>ADMIN_EMAIL</code> — Admin contact email for templates (optional, defaults to mentoring@mews.com)</div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      <strong>Edge functions to deploy:</strong>{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-welcome-messages</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-stage-messages</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">send-bulk-messages</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">log-session</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">import-survey-response</code>,{' '}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">import-end-survey</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mentor/Mentee Data Upload */}
            <TabsContent value="data-help" className="space-y-6">
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Download className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-900">
                          Download Upload Template
                        </p>
                        <p className="text-sm text-green-700">
                          Get the Excel template with all required columns, sample data, and a column reference guide.
                          Delete the sample rows and fill in your data.
                        </p>
                      </div>
                    </div>
                    <Button onClick={downloadUploadTemplate} variant="outline" className="shrink-0 gap-2">
                      <Download className="w-4 h-4" />
                      Download .xlsx
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
  );
};

export default Settings;