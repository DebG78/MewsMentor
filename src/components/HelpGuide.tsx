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
              <Badge variant="outline">Excel (.xlsx, .xls)</Badge> files. Mentees and mentors are
              uploaded in a single combined file — each row has a{" "}
              <strong>"How would you like to participate as?"</strong> column that determines the role.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How does it know if a row is a mentee or mentor?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>The parser uses the <strong>"How would you like to participate as?"</strong> column:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Mentee</strong> — creates a mentee profile (fills mentee columns)</li>
                  <li><strong>Mentor</strong> — creates a mentor profile (fills mentor columns)</li>
                  <li><strong>Both</strong> — creates both a mentee and mentor profile from the same row</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  The system auto-detects the survey format version. The current format (V3) is detected
                  when Workday columns like "Business Title" or "Compensation Grade" are present alongside
                  the role selection column.
                </p>
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
                      <TableCell className="font-mono text-sm">Name</TableCell>
                      <TableCell>Full name of the participant</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-sm">Email</TableCell>
                      <TableCell>Work email address (used as unique identifier for deduplication)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-sm">How would you like to participate as?</TableCell>
                      <TableCell>Role selection: Mentee, Mentor, or Both</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended columns</CardTitle>
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
                      <TableCell className="font-mono text-sm">Business Title</TableCell>
                      <TableCell>Workday job title (e.g. Senior Software Engineer)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-sm">Compensation Grade</TableCell>
                      <TableCell>Workday level (L1-L7) — used for seniority-based matching</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-sm">Location Address - Country</TableCell>
                      <TableCell>Country — auto-converted to timezone for matching</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-sm">Slack User ID</TableCell>
                      <TableCell>Slack member ID (e.g. U01ABC123) — required for automated messaging</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Multi-select fields</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  Fields that accept multiple values (e.g. "What kind of mentor help would you like?")
                  should use <strong>semicolons</strong> as separators:
                </p>
                <code className="block bg-muted rounded-md p-2 text-xs">
                  Accountability partner;Sounding board;Career guidance
                </code>
                <p className="text-muted-foreground">
                  This matches the Microsoft Forms multi-select export format.
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Mentee Columns */}
        <AccordionItem value="mentee-columns" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Mentee Columns (Q7-Q14)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-sm text-muted-foreground">
              These columns are filled in by participants who selected <strong>Mentee</strong> or <strong>Both</strong>.
              Column headers use flexible keyword matching — you don't need exact names.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mentee Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Matching keywords</TableHead>
                      <TableHead>Used for</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs">What capabilities would you like to develop?</TableCell>
                      <TableCell className="text-xs font-mono">"capabilities" + "develop"</TableCell>
                      <TableCell className="text-sm">Free-text capabilities — primary input for matching</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Job-specific or role-related mentoring area</TableCell>
                      <TableCell className="text-xs font-mono">"job-specific", "role-specific"</TableCell>
                      <TableCell className="text-sm">Role-specific development area</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Mentoring goal (I want to...)</TableCell>
                      <TableCell className="text-xs font-mono">"mentoring goal", "using the format"</TableCell>
                      <TableCell className="text-sm">Goal statement — used for semantic matching</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Specific situation or challenge</TableCell>
                      <TableCell className="text-xs font-mono">"specific situation", "specific challenge"</TableCell>
                      <TableCell className="text-sm">Current challenge context</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">What kind of mentor help would you like?</TableCell>
                      <TableCell className="text-xs font-mono">"kind of mentor help"</TableCell>
                      <TableCell className="text-sm">Multi-select (semicolons) — help type preferences</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Open to a first-time mentor?</TableCell>
                      <TableCell className="text-xs font-mono">"open to" + "first-time"</TableCell>
                      <TableCell className="text-sm">First-time mentor acceptance</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Session style preference</TableCell>
                      <TableCell className="text-xs font-mono">"session style"</TableCell>
                      <TableCell className="text-sm">Preferred meeting format</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Feedback style preference</TableCell>
                      <TableCell className="text-xs font-mono">"feedback style"</TableCell>
                      <TableCell className="text-sm">How they prefer to receive feedback</TableCell>
                    </TableRow>
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
              Mentor Columns (Q15-Q25)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <p className="text-sm text-muted-foreground">
              These columns are filled in by participants who selected <strong>Mentor</strong> or <strong>Both</strong>.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mentor Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Matching keywords</TableHead>
                      <TableHead>Used for</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs">Why do you want to mentor?</TableCell>
                      <TableCell className="text-xs font-mono">"want to mentor", "hope to get out"</TableCell>
                      <TableCell className="text-sm">Motivation — used for semantic matching</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">How many mentees would you like?</TableCell>
                      <TableCell className="text-xs font-mono">"how many mentees"</TableCell>
                      <TableCell className="text-sm">Capacity (accepts "One", "Two", or numbers). Defaults to 1.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Is this your first time mentoring?</TableCell>
                      <TableCell className="text-xs font-mono">"first time mentoring"</TableCell>
                      <TableCell className="text-sm">Experience level — parsed to boolean</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">What support would help you feel confident?</TableCell>
                      <TableCell className="text-xs font-mono">"support" + "feel confident"</TableCell>
                      <TableCell className="text-sm">Multi-select — support resources wanted</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Capabilities you feel confident mentoring on</TableCell>
                      <TableCell className="text-xs font-mono">"confident mentoring", "capabilities" + "confident"</TableCell>
                      <TableCell className="text-sm">Multi-select (semicolons) — primary input for matching</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Something specific about your job a mentee could benefit from?</TableCell>
                      <TableCell className="text-xs font-mono">"benefit from" + "job"</TableCell>
                      <TableCell className="text-sm">Role-specific offering</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Meaningful impact story</TableCell>
                      <TableCell className="text-xs font-mono">"meaningful impact"</TableCell>
                      <TableCell className="text-sm">Story — used for semantic matching</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">What do you naturally bring? (Pick up to 3)</TableCell>
                      <TableCell className="text-xs font-mono">"naturally bring", "natural strengths"</TableCell>
                      <TableCell className="text-sm">Multi-select — mentor strengths</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Preferred session style (Mentor)</TableCell>
                      <TableCell className="text-xs font-mono">"session style" + "mentor"</TableCell>
                      <TableCell className="text-sm">Meeting format preference</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Topics you prefer not to be matched on</TableCell>
                      <TableCell className="text-xs font-mono">"prefer not" + "matched"</TableCell>
                      <TableCell className="text-sm">Exclusions — prevents matching on these areas</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Anything else that would make a match not work?</TableCell>
                      <TableCell className="text-xs font-mono">"make a match not work"</TableCell>
                      <TableCell className="text-sm">Additional matching exclusions</TableCell>
                    </TableRow>
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
                      <TableCell>Timezone difference</TableCell>
                      <TableCell>Maximum 6 hours apart (configurable)</TableCell>
                      <TableCell>Removes pairs too far apart to schedule meetings</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Mentor capacity</TableCell>
                      <TableCell>Must be &gt; 0</TableCell>
                      <TableCell>Removes mentors who are full</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Excluded scenarios</TableCell>
                      <TableCell>No overlap</TableCell>
                      <TableCell>Removes pairs where the mentee's practice scenarios overlap with the mentor's excluded scenarios</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Feature Scoring */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 2: Core Feature Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Each mentee-mentor pair is scored on these core features:
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
                      <TableCell className="font-semibold">Capability Match</TableCell>
                      <TableCell><Badge>45%</Badge></TableCell>
                      <TableCell className="text-sm">Tiered scoring: exact primary match (100%), mentor secondary (80%), same cluster (55%/40%), plus bonuses for secondary capability and practice scenario overlap</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Semantic Similarity</TableCell>
                      <TableCell><Badge>30%</Badge></TableCell>
                      <TableCell className="text-sm">Keyword-based or AI embeddings (cosine similarity) comparing mentee goals/bio with mentor motivation/lessons</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Seniority Fit</TableCell>
                      <TableCell><Badge variant="secondary">10%</Badge></TableCell>
                      <TableCell className="text-sm">Mentor 1-2 levels above = 100%, 3-4 above = 80%, same level = 50%, mentor below = 20%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Domain Detail Match</TableCell>
                      <TableCell><Badge variant="outline">5%</Badge></TableCell>
                      <TableCell className="text-sm">Keyword overlap between free-text capability detail descriptions</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Timezone Bonus</TableCell>
                      <TableCell><Badge variant="outline">5%</Badge></TableCell>
                      <TableCell className="text-sm">Same timezone = 100%, within 2 hours = 50%, further = 0%</TableCell>
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

            {/* Advanced Weights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 2b: Advanced Weights (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  These additional factors are disabled by default (weight = 0%). Enable them via the
                  "Advanced Weights" section when editing a matching model.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>How it's calculated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Compatibility</TableCell>
                      <TableCell><Badge variant="outline">0%</Badge></TableCell>
                      <TableCell className="text-sm">Averages alignment on mentoring style, energy, feedback preference, and meeting frequency. Only counts sub-factors where both people provided answers.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Proficiency Gap</TableCell>
                      <TableCell><Badge variant="outline">0%</Badge></TableCell>
                      <TableCell className="text-sm">Rewards mentors with higher skill proficiency than their mentee. Gap of 1-2 levels = 100%, gap of 3+ = 80%, same level = 40%, mentee higher = 10%.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Department Diversity</TableCell>
                      <TableCell><Badge variant="outline">0%</Badge></TableCell>
                      <TableCell className="text-sm">Bonus for cross-department matches (100% if different departments, 0% if same). Encourages fresh perspectives across teams.</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">
                  Advanced weights can be set up to 30% each. They add to the core score (total is clamped at 100).
                </p>
              </CardContent>
            </Card>

            {/* Score Formula */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Formula</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-md p-4 font-mono text-sm">
                  Total = 45 x capability + 30 x semantic + 10 x seniority
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + 5 x domain + 5 x timezone - 10 x capacity_penalty
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + compatibility_weight x compatibility
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + proficiency_weight x proficiency_gap
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; + department_weight x department_diversity
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Score is clamped between 0 and 100. Core weights are fixed per the defaults above.
                  Advanced weights are configurable per matching model (default 0).
                </p>
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
                  <li>Higher capability match wins</li>
                  <li>Higher semantic similarity wins</li>
                  <li>Higher remaining capacity wins (spreads load)</li>
                  <li>Mentor name alphabetically (A-Z)</li>
                </ol>
              </CardContent>
            </Card>

            {/* Seniority Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seniority Level Mapping (Compensation Grade)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  The V3 format uses Workday Compensation Grade for seniority matching. Lower L-number = higher seniority.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compensation Grade</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["L7", "Entry level", "1"],
                      ["L6", "Junior IC", "2"],
                      ["L5", "Mid IC", "3"],
                      ["L4", "Senior IC / Lead", "4"],
                      ["L3", "Sr. Manager", "5"],
                      ["L2", "Director", "6"],
                      ["L1", "SVP/VP", "7"],
                    ].map(([grade, level, score]) => (
                      <TableRow key={grade}>
                        <TableCell className="font-mono">{grade}</TableCell>
                        <TableCell>{level}</TableCell>
                        <TableCell>{score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">
                  Ideal match: mentor is 1-2 levels above the mentee. Same level scores 50%. Mentor below mentee scores 20%.
                </p>
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
