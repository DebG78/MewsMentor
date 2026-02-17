import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Target,

  Crown,
  Users,
  Calendar,
  GitCompareArrows,
  Sparkles,
  Upload,
  ListChecks,
  LayoutDashboard,
  Webhook,
} from "lucide-react";

export function AnalyticsHelpGuide() {
  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={[]} className="space-y-4">

        {/* 1. Data Import Guide */}
        <AccordionItem value="imports" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Data Import Guide for Analytics
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Data enters through CSV imports, external forms (MS Forms via webhook), or manual entry.
              Below are the supported import formats.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Log CSV (Smart Import — by name)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Where to import:</strong> Mentoring Sessions page &rarr; "Import Session Logs" button</p>
                <p><strong>Frequency:</strong> After each check-in round, or whenever you export from MS Forms</p>
                <p>
                  This format uses <strong>respondent names</strong> instead of internal IDs. The system
                  automatically matches names to active mentoring pairs. You'll see a preview of matched
                  and unmatched rows before confirming the import.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-xs">name / respondent / full_name</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes*</Badge></TableCell>
                      <TableCell>The person's full name (must match their profile name exactly). *Required if no email column.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">slack_user_id / slack_id</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>The person's Slack user ID (preferred — more reliable than name matching for common names)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">date / session_date / meeting_date</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>When they met (any date format)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">duration / duration_minutes</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Duration in minutes (default: 60, snaps to nearest of 15/30/45/60/90/120)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">rating / score / how_was_it</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Session rating 1-5 (default: 3)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-muted-foreground mt-2">
                  Column names are flexible — the parser recognizes many variations. This is the recommended
                  format for MS Forms exports where participants self-report sessions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Log CSV (by ID — advanced)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Where to import:</strong> Mentoring Sessions page (advanced CSV import)</p>
                <p><strong>When to use:</strong> When you have internal system IDs (e.g., from a spreadsheet you maintain)</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-xs">mentor_id</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>Mentor's ID from the system</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">mentee_id</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>Mentee's ID from the system</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">cohort_id</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>Cohort ID</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">meeting_date</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>Date of the session (YYYY-MM-DD)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">duration_minutes</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Duration in minutes (default: 60)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">status</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>scheduled, completed, cancelled, no_show (default: completed)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">mentor_rating</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Mentor's session rating (1-5)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">mentee_rating</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Mentee's session rating (1-5)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Survey Feedback CSV</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Where to import:</strong> Success Metrics page</p>
                <p><strong>Frequency:</strong> After each survey round</p>
                <p>Responses are aggregated per cohort + date and automatically create metric snapshots for satisfaction_score, nps_score, and would_recommend_rate.</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-xs">cohort_id</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>Cohort ID</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">respondent_id</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Person's ID (for deduplication)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">respondent_type</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>mentor or mentee</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">survey_date</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Date of the survey (YYYY-MM-DD, default: today)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">satisfaction_score</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Satisfaction rating (numeric)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">nps_score</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Net Promoter Score (0-10)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">would_recommend</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>yes/no or 1/0</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">VIP Score CSV</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Where to import:</strong> VIP Management page</p>
                <p><strong>Frequency:</strong> Monthly</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-xs">person_id</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>Person's ID from the system</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">person_type</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">Yes</Badge></TableCell>
                      <TableCell>mentor or mentee</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">cohort_id</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>Cohort ID (optional)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">engagement_score</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>0-25 (default: 0)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">session_score</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>0-25 (default: 0)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">response_score</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>0-25 (default: 0)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs">feedback_score</TableCell>
                      <TableCell>No</TableCell>
                      <TableCell>0-25 (default: 0)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tips for Data Consistency</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li>Always use IDs from the system (copy from the Profiles or Cohort Detail pages)</li>
                  <li>Use YYYY-MM-DD format for dates to avoid ambiguity</li>
                  <li>Keep column names exactly as shown (case-insensitive, underscores/spaces are flexible)</li>
                  <li>Save files as UTF-8 encoded CSV for best compatibility</li>
                  <li>Test with a small batch (5-10 rows) before importing large datasets</li>
                </ul>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 2. External Ingestion */}
        <AccordionItem value="external-ingestion" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              External Ingestion (MS Forms, Webhooks)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Session data can flow into MewsMentor automatically from external tools via a
              webhook endpoint. This removes the need for manual CSV exports and uploads.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  A Supabase Edge Function (<code>log-session</code>) acts as a webhook endpoint.
                  External tools send session data to it, and it automatically:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Validates the API key and input data</li>
                  <li>Looks up the respondent by Slack user ID or name across all active cohorts</li>
                  <li>Finds their mentoring pair from the approved matches</li>
                  <li>Creates a completed session in the sessions table</li>
                  <li><strong>Auto-detects the journey phase</strong> based on how many sessions the pair has completed</li>
                  <li><strong>Auto-sends a next-steps Slack DM</strong> to the respondent — uses a role-specific template (<code>next_steps_mentee</code> / <code>next_steps_mentor</code>) if available, otherwise the generic <code>next_steps</code> template (with deduplication — each person only receives it once per phase)</li>
                </ol>
                <p className="text-muted-foreground mt-2">
                  At least one of <code>respondent_name</code> or <code>slack_user_id</code> is required.
                  Slack ID matching takes priority over name matching and is more reliable for
                  common names. The Slack user ID is also used to send next-steps DMs after
                  the session is logged. If a match is found in multiple cohorts, the request
                  returns an error for manual resolution.
                </p>
                <p className="text-muted-foreground">
                  Journey phase thresholds (e.g., sessions 1–2 = Getting Started, 3–5 = Building, etc.)
                  are configurable per cohort in the Runbook's Setup stage. Defaults are used if no custom
                  thresholds are set.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Setting Up MS Forms + Power Automate</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Create a Microsoft Form</strong> titled "Log Your Mentoring Session" with fields:
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-0.5 text-muted-foreground">
                      <li>Text: "Your full name"</li>
                      <li>Text: "Your Slack user ID" (participants can find this in their Slack profile)</li>
                      <li>Date: "When did you meet?"</li>
                      <li>Choice: Duration (15/30/45/60/90/120 minutes)</li>
                      <li>Rating: "How was the session?" (1-5 stars)</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Create a Power Automate flow:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-0.5 text-muted-foreground">
                      <li>Trigger: "When a new response is submitted" (select your form)</li>
                      <li>Action: "Get response details"</li>
                      <li>Action: "HTTP" — POST to the Edge Function URL with the form fields mapped to the JSON body</li>
                      <li>Headers: <code>x-api-key: your-api-key</code></li>
                    </ul>
                  </li>
                  <li>Share the form link with participants (or embed it in email/Teams)</li>
                </ol>
                <p className="text-muted-foreground mt-2">
                  Alternatively, skip Power Automate and just export the form responses as CSV periodically,
                  then use the "Import Session Logs" button on the Mentoring Sessions page.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Webhook API Reference</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Endpoint:</strong> <code>POST https://&lt;project&gt;.supabase.co/functions/v1/log-session</code></p>
                <p><strong>Headers:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-0.5">
                  <li><code>x-api-key: your-configured-api-key</code></li>
                  <li><code>Content-Type: application/json</code></li>
                </ul>
                <p><strong>Body:</strong></p>
                <div className="bg-muted rounded-md p-3 font-mono text-xs">
                  {`{`}<br />
                  &nbsp;&nbsp;{`"respondent_name": "Alice Smith",`}<br />
                  &nbsp;&nbsp;{`"slack_user_id": "U063V99F5UZ",`}<br />
                  &nbsp;&nbsp;{`"date": "2026-02-08",`}<br />
                  &nbsp;&nbsp;{`"duration_minutes": 30,`}<br />
                  &nbsp;&nbsp;{`"rating": 4`}<br />
                  {`}`}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  At least one of <code>respondent_name</code> or <code>slack_user_id</code> is required.
                  Slack ID matching is preferred as it avoids issues with common names. The respondent's
                  Slack user ID is also used to send them next-steps DMs after the session is logged.
                </p>
                <p><strong>Response (success):</strong></p>
                <div className="bg-muted rounded-md p-3 font-mono text-xs">
                  {`{`}<br />
                  &nbsp;&nbsp;{`"success": true,`}<br />
                  &nbsp;&nbsp;{`"pair": "Alice Smith & Bob Jones",`}<br />
                  &nbsp;&nbsp;{`"cohort": "Cohort 3",`}<br />
                  &nbsp;&nbsp;{`"logged_by": "mentee",`}<br />
                  &nbsp;&nbsp;{`"auto_sent_phase": "building"`}&nbsp;&nbsp;{`// present if a next-steps message was auto-sent`}<br />
                  {`}`}
                </div>
                <p className="text-muted-foreground mt-2">
                  The API key is a shared secret you configure as a Supabase secret
                  (<code>LOG_SESSION_API_KEY</code>). Use the same key in Power Automate.
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Recommended Admin Workflow */}
        <AccordionItem value="workflow" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              Recommended Admin Workflow
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Step-by-step timeline for running analytics effectively throughout a cohort's lifecycle.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Before Cohort Launch</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Set up success targets (global or cohort-specific) in the Success Metrics dashboard</li>
                  <li>Configure the matching model weights based on learnings from previous cohorts</li>
                  <li>Review People Analytics to identify mentor supply gaps and recruit accordingly</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">At Cohort Launch</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Import participant CSVs (mentee and mentor data)</li>
                  <li>Run matching and review the Match Quality Analytics page</li>
                  <li>Approve matches, noting any overrides from algorithm recommendations</li>
                  <li>Check People Analytics topic demand vs supply for the new cohort</li>
                  <li>Set up an MS Form for session logging and share with participants</li>
                  <li>Configure <strong>journey phase thresholds</strong> in the Runbook's Setup stage (e.g., sessions 1–2 = Getting Started)</li>
                  <li>Create <strong>next-steps message templates</strong> in Settings &rarr; Message Templates for each journey phase</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bi-Weekly During Program</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Session data arrives automatically if MS Forms webhook is configured — check the Mentoring Sessions page for new entries</li>
                  <li>Next-steps messages are <strong>auto-sent</strong> to participants after each logged session based on their journey phase</li>
                  <li>If using manual CSV: export from MS Forms and use "Import Session Logs" to upload</li>
                  <li>Review pairs with low session frequency and take action</li>
                  <li>Use the <strong>"Send Stage Messages"</strong> button in the Runbook to reach participants who haven't logged a session yet</li>
                  <li>Check the Message Log (Settings &rarr; Messages &rarr; Log tab) to verify delivery status</li>
                  <li>Check the Admin Overview dashboard for a quick health snapshot</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Record success metric snapshot values (use the "Record Value" button)</li>
                  <li>Import survey feedback CSV if surveys were sent</li>
                  <li>Update VIP engagement scores (manually or via CSV import)</li>
                  <li>Review People Analytics and Mentor Utilization for rebalancing opportunities</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">At Cohort Close</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Final metric recording for all success targets</li>
                  <li>Run Cohort Comparison against previous cohorts to measure improvement</li>
                  <li>Review Match Quality Analytics to inform next cohort's matching model</li>
                  <li>Recognize VIP participants from the leaderboard</li>
                  <li>Document lessons learned for the next cohort launch</li>
                </ul>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Analytics Overview */}
        <AccordionItem value="overview" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Analytics Overview - How It All Fits Together
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              MewsMentor analytics are powered by the data you enter or import. Data can come through{" "}
              <Badge variant="outline">CSV imports</Badge>,{" "}
              <Badge variant="outline">manual entry</Badge>,{" "}
              <Badge variant="outline">MS Forms + Power Automate</Badge>.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Flow</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <Badge>CSV Import</Badge>
                  <span>&rarr;</span>
                  <Badge variant="secondary">Profiles &amp; Cohorts</Badge>
                  <span>&rarr;</span>
                  <Badge variant="secondary">Matching</Badge>
                  <span>&rarr;</span>
                  <Badge variant="secondary">Tracking (Sessions, VIP)</Badge>
                  <span>&rarr;</span>
                  <Badge>Analytics &amp; Insights</Badge>
                </div>
                <p className="font-medium mt-1">Session data can also arrive via external channels:</p>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <Badge>MS Forms / Power Automate</Badge>
                  <span>&rarr;</span>
                  <Badge variant="secondary">Webhook (log-session)</Badge>
                  <span>&rarr;</span>
                  <Badge variant="secondary">Sessions Table</Badge>
                  <span>&rarr;</span>
                  <Badge>Analytics &amp; Insights</Badge>
                </div>
                <p className="font-medium mt-3">Auto-messaging after session logging:</p>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary">Session Logged</Badge>
                  <span>&rarr;</span>
                  <Badge variant="secondary">Phase Auto-Detected</Badge>
                  <span>&rarr;</span>
                  <Badge variant="secondary">Dedup Check</Badge>
                  <span>&rarr;</span>
                  <Badge>Next-Steps DM via Slack</Badge>
                </div>
                <p className="mt-2">
                  Analytics are only as good as the data you feed them. Automated ingestion via
                  MS Forms reduces the manual burden and keeps dashboards accurate. Auto-messaging
                  ensures participants receive timely guidance at each stage of their mentoring journey.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analytics Pages Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Data Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Admin Overview</TableCell>
                      <TableCell>High-level program health snapshot</TableCell>
                      <TableCell>Cohorts, matches, sessions</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Success Metrics</TableCell>
                      <TableCell>Track KPIs against targets over time</TableCell>
                      <TableCell>Manual entry + survey CSV import</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">VIP Management</TableCell>
                      <TableCell>Engagement scoring and VIP recognition</TableCell>
                      <TableCell>Manual entry + VIP score CSV import</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">People Analytics</TableCell>
                      <TableCell>Population insights across cohorts</TableCell>
                      <TableCell>Profile data from cohort imports</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Mentoring Sessions</TableCell>
                      <TableCell>Track meetings between pairs</TableCell>
                      <TableCell>Manual entry + session CSV import</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Cohort Comparison</TableCell>
                      <TableCell>Side-by-side cohort performance</TableCell>
                      <TableCell>Aggregated from all other data</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Match Quality</TableCell>
                      <TableCell>Matching algorithm effectiveness</TableCell>
                      <TableCell>Matching results from cohort data</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Mentoring Sessions */}
        <AccordionItem value="sessions" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Mentoring Sessions
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Tracks individual mentoring meetings between pairs with statuses, ratings, and feedback.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Statuses</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline">Scheduled - Upcoming meeting</Badge>
                  <Badge variant="outline">Completed - Meeting happened</Badge>
                  <Badge variant="outline">Cancelled - Meeting was cancelled</Badge>
                  <Badge variant="outline">No-show - Someone didn't attend</Badge>
                </div>
                <p className="mt-3">
                  Both mentors and mentees rate each session on a 1-5 scale. These ratings feed into
                  overall satisfaction analytics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Getting Session Data In</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Sessions can be logged through multiple channels:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>MS Forms + Power Automate:</strong> Participants fill out a Microsoft Form. Power Automate sends responses to the webhook automatically. This also triggers <strong>auto-detection of the journey phase</strong> and sends next-steps messages via Slack.</li>
                  <li><strong>"Import Session Logs" button:</strong> Upload a CSV export from MS Forms (or any form tool). The system auto-matches respondent names to pairs — no internal IDs needed.</li>
                  <li><strong>"New Session" button:</strong> Manually create sessions with specific mentor/mentee IDs.</li>
                  <li><strong>Session CSV import:</strong> Bulk import with internal IDs (mentor_id, mentee_id, cohort_id).</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  The MS Forms + Power Automate option is recommended — sessions are logged instantly, journey phases are auto-detected, and next-steps messages are sent without any admin intervention.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What You Need to Do</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Set up an MS Form for participants to self-report sessions (see External Ingestion section above)</li>
                  <li>Monitor completion rates and no-show patterns</li>
                  <li>Follow up on pairs with low session frequency (visible in the Pair Analysis tab)</li>
                  <li>Track rating trends to catch declining satisfaction early</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to Read the Charts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Session volume:</strong> Monthly bar chart showing activity levels. Declining volume may indicate disengagement.</li>
                  <li><strong>Rating distribution:</strong> How sessions are rated. Aim for most ratings at 4-5.</li>
                  <li><strong>Pair frequency:</strong> Sessions per pair. Low-frequency pairs may need encouragement.</li>
                </ul>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Success Metrics Dashboard */}
        <AccordionItem value="success-metrics" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Success Metrics Dashboard
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Tracks 4 categories of program KPIs: <Badge variant="outline">Engagement</Badge>,{" "}
              <Badge variant="outline">Satisfaction</Badge>,{" "}
              <Badge variant="outline">Completion</Badge>, and{" "}
              <Badge variant="outline">Retention</Badge>.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What Each Category Means</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div>
                  <strong>Engagement:</strong> Session attendance rate, active
                  participation in the program. Higher is better.
                </div>
                <div>
                  <strong>Satisfaction:</strong> Survey scores, NPS (Net Promoter Score), and
                  "would recommend" rates from participant feedback.
                </div>
                <div>
                  <strong>Completion:</strong> Percentage of pairs finishing the program and reaching
                  milestones. Measures follow-through.
                </div>
                <div>
                  <strong>Retention:</strong> Participants returning for future cohorts, ongoing
                  mentoring relationships, alumni engagement.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How Targets Work</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Each metric has:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Target value:</strong> Your goal for this metric</li>
                  <li><strong>Warning threshold:</strong> When to start paying attention (shown in yellow)</li>
                  <li><strong>Critical threshold:</strong> When action is needed (shown in red)</li>
                  <li><strong>Comparison direction:</strong> Whether higher or lower is better</li>
                </ul>
                <p className="mt-2">
                  You can set <strong>global targets</strong> (apply to all cohorts) or{" "}
                  <strong>cohort-specific targets</strong> that override the global ones.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What You Need to Do</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Set up success targets for each cohort (or use global defaults)</li>
                  <li>Record metric values regularly (monthly recommended) via the "Record Value" button</li>
                  <li>Import survey feedback CSVs to auto-populate satisfaction metrics</li>
                  <li>Review the "Needs Attention" section weekly for metrics trending toward critical</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to Read the Charts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Trend lines:</strong> Show metric progress over time. Each recorded value becomes a data point.</li>
                  <li><strong>Dashed line:</strong> Your target value for reference</li>
                  <li><strong>Colored zones:</strong> Green (on track), yellow (warning), red (critical)</li>
                  <li><strong>Radar chart:</strong> Compares all 4 category averages at a glance</li>
                  <li><strong>Cross-cohort comparison:</strong> Grouped bars compare the same metric across cohorts</li>
                </ul>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 7. VIP Management */}
        <AccordionItem value="vip" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              VIP Management &amp; Engagement Scoring
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Identifies the most and least engaged participants using a composite engagement score.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Components</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Measures</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Engagement</TableCell>
                      <TableCell>0-25</TableCell>
                      <TableCell>How actively they participate in the program</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Sessions</TableCell>
                      <TableCell>0-25</TableCell>
                      <TableCell>Meeting frequency and attendance</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Response</TableCell>
                      <TableCell>0-25</TableCell>
                      <TableCell>Communication responsiveness</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Feedback</TableCell>
                      <TableCell>0-25</TableCell>
                      <TableCell>Quality of feedback given or received</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="font-semibold">0-100</TableCell>
                      <TableCell>Sum of all components</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">VIP Tiers</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline">Platinum: 90+</Badge>
                  <Badge variant="outline">Gold: 80-89</Badge>
                  <Badge variant="outline">Silver: 70-79</Badge>
                  <Badge variant="outline">Bronze: 60-69</Badge>
                  <Badge variant="outline">Standard: below 60</Badge>
                </div>
                <p className="mt-3">
                  VIP rules can auto-classify participants based on score thresholds, percentiles, or
                  individual component thresholds. You can also manually override VIP status.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What You Need to Do</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Enter or import VIP scores periodically (manually or via CSV)</li>
                  <li>Set up VIP rules to auto-classify (or manually toggle VIP status)</li>
                  <li>Use the leaderboard to recognize top participants</li>
                  <li>Review low-scoring participants for intervention</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to Read the Charts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Score distribution:</strong> Shows overall engagement health. A right-skewed distribution is good.</li>
                  <li><strong>Tier donut:</strong> Proportion of participants at each VIP level</li>
                  <li><strong>Radar chart:</strong> Individual strengths/weaknesses across the 4 score components vs cohort average</li>
                </ul>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 9. People Analytics */}
        <AccordionItem value="people" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              People Analytics
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Population-level insights derived from profile data across all cohorts. Helps identify
              gaps, optimize recruitment, and understand your mentoring community.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Available Analyses</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div>
                  <strong>Topic Demand vs Supply:</strong> Compares what mentees want to learn against
                  what mentors can teach. Use this to recruit mentors for topics with unmet demand.
                </div>
                <div>
                  <strong>Demographics:</strong> Experience level, location, language, and life
                  experience distributions. Helps ensure program diversity.
                </div>
                <div>
                  <strong>Match Quality:</strong> Score distributions and which matching features
                  (topics, seniority, AI similarity) drive match scores.
                </div>
                <div>
                  <strong>Mentor Utilization:</strong> Who has remaining capacity, who is fully loaded.
                  Identifies mentors available for additional mentees.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What You Need to Do</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Review after each cohort import to identify gaps in mentor supply</li>
                  <li>Use topic demand/supply data to guide mentor recruitment efforts</li>
                  <li>Monitor match quality scores to decide if matching model weights need tuning</li>
                  <li>Check mentor utilization before assigning additional mentees</li>
                </ol>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 10. Cohort Comparison */}
        <AccordionItem value="comparison" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5" />
              Cohort Comparison
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Side-by-side performance comparison across 2-5 cohorts. Useful for identifying which
              cohort setups and configurations produce the best outcomes.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What You Need to Do</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Ensure consistent metric recording across cohorts for valid comparison</li>
                  <li>Select 2-5 cohorts to compare</li>
                  <li>Use the metric selector to focus on specific KPIs</li>
                  <li>Compare radar charts to see category strengths per cohort</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to Read the Charts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Stats table:</strong> Quick comparison of key numbers (mentees, mentors, pairs, scores)</li>
                  <li><strong>Metric bars:</strong> Grouped bar chart comparing a selected metric across cohorts</li>
                  <li><strong>Radar overlay:</strong> Shows relative strengths across multiple dimensions per cohort</li>
                </ul>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* 11. Match Quality Analytics */}
        <AccordionItem value="match-quality" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Match Quality Analytics
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              Deep-dive into how well the matching algorithm is performing for each cohort.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div>
                  <strong>Score distribution:</strong> Are most matches high quality (70+) or spread out?
                  Aim for the distribution to be right-skewed (more high scores).
                </div>
                <div>
                  <strong>Feature contributions:</strong> Which matching criteria drive scores - topics overlap,
                  industry, seniority fit, AI semantic similarity, timezone, language, or capacity.
                </div>
                <div>
                  <strong>Common risks:</strong> What risks appear most frequently across matches. Patterns
                  here suggest areas where the participant pool needs strengthening.
                </div>
                <div>
                  <strong>Top pick rate:</strong> How often the admin accepted the algorithm's #1 recommendation.
                  A low rate might mean matching weights need adjustment.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What You Need to Do</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Review after each matching round</li>
                  <li>If average scores are low, consider adjusting matching model weights</li>
                  <li>If common risks repeat, address the root cause (e.g., recruit mentors with specific expertise)</li>
                  <li>Compare match quality across cohorts to see if improvements are working</li>
                </ol>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
