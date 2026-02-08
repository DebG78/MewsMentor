import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Upload, FileSpreadsheet, Target, Brain, Zap, Users } from "lucide-react";

export function HelpGuide() {
  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={[]} className="space-y-4">
        {/* Uploading Data */}
        <AccordionItem value="uploading" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Uploading Data
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p>
              MewsMentor accepts <Badge variant="outline">CSV (.csv)</Badge> and{" "}
              <Badge variant="outline">Excel (.xlsx, .xls)</Badge> files. You can upload mentee and
              mentor data as separate files or combined into one file.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How does it know if a row is a mentee or mentor?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>The parser identifies rows using these methods (in priority order):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    <strong>"Role Type" column</strong> (most reliable) — values: <code>mentee</code>,{" "}
                    <code>mentor</code>, or <code>both</code>
                  </li>
                  <li>
                    <strong>Header-based detection</strong> — if no "Role Type" column exists, it checks for
                    columns unique to mentor surveys (e.g., "Have you mentored before?") or mentee surveys
                    (e.g., "What's the main reason you'd like a mentor?")
                  </li>
                  <li>
                    <strong>Fallback</strong> — rows with at least 3 non-empty fields default to mentee
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Required columns</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-sm"># or id</TableCell>
                      <TableCell>A unique identifier for the person (e.g., row number, employee ID)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Optional but recommended</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-sm">Full Name or Name</TableCell>
                      <TableCell>The person's display name. If absent, the ID is used as the name.</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Mentee Columns */}
        <AccordionItem value="mentee-columns" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Mentee Spreadsheet Columns
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  These columns use flexible matching — the parser looks for keywords in the column header.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Matching keywords</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Role</TableCell>
                      <TableCell className="text-xs font-mono">"current role"</TableCell>
                      <TableCell>Current job role</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Experience</TableCell>
                      <TableCell className="text-xs font-mono">"years of work experience"</TableCell>
                      <TableCell>e.g., "3-5", "6-10", "10+"</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Location</TableCell>
                      <TableCell className="text-xs font-mono">"where are you based", "location", "time zone"</TableCell>
                      <TableCell>Location or timezone</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Pronouns</TableCell>
                      <TableCell className="text-xs font-mono">"Do you want to share your pronouns?"</TableCell>
                      <TableCell>Optional pronouns</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell className="text-xs font-mono">"department", "team", "business unit"</TableCell>
                      <TableCell>Department or team name</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Job Grade</TableCell>
                      <TableCell className="text-xs font-mono">"job grade", "job_grade", "grade", "level", "band"</TableCell>
                      <TableCell>Job grade or level</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Development Topics (boolean columns)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Column headers with a value of <code>1</code>, <code>true</code>, or any non-empty text to indicate selection:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Career growth & progression",
                    "Leadership & management",
                    "Technical / product knowledge",
                    "Customer success & client relationships",
                    "Communication & soft skills",
                    "Cross-functional collaboration",
                    "Strategic thinking & vision",
                    "Change management / navigating transformation",
                    "Diversity, equity & inclusion",
                    "Work-life balance & wellbeing",
                  ].map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Life Experiences (boolean columns)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Returning from maternity/paternity/parental leave",
                    "Navigating menopause or andropause",
                    "Career break / sabbatical",
                    "Relocation to a new country",
                    "Career change or industry switch",
                    "Managing health challenges",
                    "Stepping into leadership for the first time",
                    "Working towards a promotion",
                    "Thinking about an internal move",
                  ].map((exp) => (
                    <Badge key={exp} variant="outline" className="text-xs">
                      {exp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preferences & Goals (text columns)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Used for</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["Why would you like to join the mentorship program?", "Motivation — used in goals text for matching"],
                      ["What's the main reason you'd like a mentor?", "Main reason — used in goals text for matching"],
                      ["What expectations do you have for the mentorship program", "Expectations — used in goals text for matching"],
                      ["What kind of mentor style do you think would help you most", "Preferred mentor style"],
                      ["What kind of mentor energy would help you thrive?", "Preferred mentor energy"],
                      ["How do you prefer to receive feedback?", "Feedback preference"],
                      ["How important is it that your mentor has prior mentoring experience?", "Mentor experience importance"],
                      ["What do you NOT want in a mentor?", "Dealbreakers"],
                      ["How often would you ideally like to meet with a mentor?", "Meeting frequency"],
                      ["What qualities would you like in a mentor", "Desired mentor qualities — used in AI matching"],
                    ].map(([col, usage]) => (
                      <TableRow key={col}>
                        <TableCell className="text-xs">{col}</TableCell>
                        <TableCell className="text-sm">{usage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Mentor Columns */}
        <AccordionItem value="mentor-columns" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Mentor Spreadsheet Columns
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Same flexible matching as mentee columns:</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Matching keywords</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Role</TableCell>
                      <TableCell className="text-xs font-mono">"current role", "role at", "your role"</TableCell>
                      <TableCell>Current job role</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Experience</TableCell>
                      <TableCell className="text-xs font-mono">"years of work experience"</TableCell>
                      <TableCell>e.g., "3-5", "6-10", "10+"</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Location</TableCell>
                      <TableCell className="text-xs font-mono">"where are you based", "location", "time zone"</TableCell>
                      <TableCell>Location or timezone</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Pronouns</TableCell>
                      <TableCell className="text-xs font-mono">"Do you want to share your pronouns?"</TableCell>
                      <TableCell>Optional pronouns</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Capacity</TableCell>
                      <TableCell className="text-xs font-mono">"capacity", "how many mentees", "max mentees"</TableCell>
                      <TableCell>How many mentees this mentor can take. Defaults to 1.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell className="text-xs font-mono">"department", "team", "business unit"</TableCell>
                      <TableCell>Department or team name</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Job Grade</TableCell>
                      <TableCell className="text-xs font-mono">"job grade", "job_grade", "grade", "level", "band"</TableCell>
                      <TableCell>Job grade or level</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topics to Mentor (boolean columns)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Same topic list as mentees — indicates which areas this mentor can coach on.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preferred Mentee Levels (boolean columns)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {["Early-career", "Mid-level", "Senior stretch role"].map((level) => (
                    <Badge key={level} variant="secondary" className="text-xs">
                      {level}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mentoring Approach (text columns)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Used for</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["Have you mentored before?", "Value \"1\" = yes"],
                      ["Your mentoring style / How would you describe your preferred mentoring style?", "Mentoring style — used in AI matching"],
                      ["What type of meeting style do you usually prefer?", "Meeting style preference"],
                      ["How would you describe your energy as a mentor?", "Mentor energy"],
                      ["What's your feedback style?", "Feedback style"],
                      ["Are there any topics you would prefer NOT to mentor on?", "Topics to avoid (comma-separated)"],
                      ["How often would you ideally like to meet with a mentee?", "Meeting frequency"],
                      ["What do you hope to gain from being a mentor?", "Motivation — used in bio text for matching"],
                      ["What expectations do you have for the mentorship program?", "Expectations — used in bio text for matching"],
                    ].map(([col, usage]) => (
                      <TableRow key={col}>
                        <TableCell className="text-xs">{col}</TableCell>
                        <TableCell className="text-sm">{usage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* How Matching Works */}
        <AccordionItem value="matching" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              How Matching Works
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {/* Hard Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 1: Hard Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Before scoring, pairs are filtered out if they fail any of these:
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filter</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>What it does</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Language overlap</TableCell>
                      <TableCell>At least 1 shared language</TableCell>
                      <TableCell>Removes pairs with no common language</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Timezone difference</TableCell>
                      <TableCell>Maximum 3 hours apart</TableCell>
                      <TableCell>Removes pairs too far apart</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Mentor capacity</TableCell>
                      <TableCell>Must be &gt; 0</TableCell>
                      <TableCell>Removes mentors who are full</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Feature Scoring */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 2: Feature Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Each mentee-mentor pair is scored on 7 features:
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>How it's calculated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Topics Overlap</TableCell>
                      <TableCell><Badge>40%</Badge></TableCell>
                      <TableCell className="text-sm">Jaccard similarity between mentee's topics to learn and mentor's topics to mentor</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Goals Alignment</TableCell>
                      <TableCell><Badge>20%</Badge></TableCell>
                      <TableCell className="text-sm">Keyword-based or AI embeddings (cosine similarity) comparing goals and bio text</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Industry Overlap</TableCell>
                      <TableCell><Badge variant="secondary">15%</Badge></TableCell>
                      <TableCell className="text-sm">Currently always 100% (all employees = same industry)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Seniority Fit</TableCell>
                      <TableCell><Badge variant="secondary">10%</Badge></TableCell>
                      <TableCell className="text-sm">Mentor should ideally be more senior. Less senior = 50%.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Timezone Overlap</TableCell>
                      <TableCell><Badge variant="outline">5%</Badge></TableCell>
                      <TableCell className="text-sm">100% if within 2 hours, 0% otherwise</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Language Match</TableCell>
                      <TableCell><Badge variant="outline">5%</Badge></TableCell>
                      <TableCell className="text-sm">100% if they share the mentee's primary language</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Capacity Penalty</TableCell>
                      <TableCell><Badge variant="destructive">-10%</Badge></TableCell>
                      <TableCell className="text-sm">Applied when mentor has only 1 slot remaining</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Score Formula */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Formula</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-md p-4 font-mono text-sm">
                  Total = 40 x topics + 20 x goals + 15 x industry + 10 x seniority
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + 5 x timezone + 5 x language - 10 x capacity_penalty
                </div>
                <p className="text-sm text-muted-foreground mt-2">Score is clamped between 0 and 100.</p>
              </CardContent>
            </Card>

            {/* Tie Breaking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 3: Tie-Breaking</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="mb-2">When two mentors have the same total score, ties are broken in this order:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Higher topics overlap wins</li>
                  <li>Higher goals alignment wins</li>
                  <li>Higher remaining capacity wins (spreads load)</li>
                  <li>Mentor name alphabetically (A-Z)</li>
                </ol>
              </CardContent>
            </Card>

            {/* Experience Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Experience Level Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experience</TableHead>
                      <TableHead>Band</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>0-2 years</TableCell>
                      <TableCell>IC1</TableCell>
                      <TableCell>1</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>3-5 years</TableCell>
                      <TableCell>IC2</TableCell>
                      <TableCell>2</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>6-10 years</TableCell>
                      <TableCell>IC3</TableCell>
                      <TableCell>3</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>10+ years</TableCell>
                      <TableCell>IC4</TableCell>
                      <TableCell>4</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Matching Modes */}
        <AccordionItem value="matching-modes" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Matching Modes
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Batch Mode</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Assigns one mentor to each mentee automatically</li>
                    <li>Goes through mentees and picks the best available mentor</li>
                    <li>Decreases mentor capacity after each assignment</li>
                    <li>Good for quick, automated matching</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 3 Mode</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Generates the top 3 mentor recommendations for each mentee</li>
                    <li>Does NOT auto-assign — you review and manually select</li>
                    <li>Mentor capacity is NOT decreased</li>
                    <li>Shows a mentor-centric view for review</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* AI-Enhanced Matching */}
        <AccordionItem value="ai-matching" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI-Enhanced Matching
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-sm text-muted-foreground">
              When AI matching is enabled (via OpenAI integration), the matching process is enhanced in two ways:
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI Embeddings (Goals Alignment)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Instead of simple keyword matching for the "Goals Alignment" feature (20% of the score), the system:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Builds a text summary of each mentee's goals (motivation, main reason, expectations, topics, desired qualities)</li>
                  <li>Builds a text summary of each mentor's offering (bio, motivation, expectations, topics, mentoring style)</li>
                  <li>Sends these to OpenAI's <code>text-embedding-3-small</code> model to generate 1536-dimension vectors</li>
                  <li>Compares vectors using cosine similarity</li>
                </ol>
                <p className="text-muted-foreground mt-2">
                  This captures semantic meaning — e.g., a mentee wanting "career growth advice" will match well with a mentor
                  offering "professional development guidance" even though they don't share the same keywords.
                </p>
                <p className="text-muted-foreground">Embeddings are cached per cohort, so re-running matching doesn't re-call OpenAI.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI Match Explanations
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  After matching, you can click "AI Explain Match" on any pair to get a 2-3 sentence human-readable
                  explanation of why they were matched, generated by GPT-4o-mini. These are also cached.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fallback</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  If the AI service is unavailable, matching falls back to keyword-based similarity automatically.
                  You'll see a notification when this happens.
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
