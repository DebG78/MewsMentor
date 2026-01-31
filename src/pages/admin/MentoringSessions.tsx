import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MentoringSessions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentoring Sessions</CardTitle>
        <CardDescription>View and analyze mentoring sessions across all cohorts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Session tracking coming soon.</p>
          <p className="text-sm mt-2">This feature will be available in a future update.</p>
        </div>
      </CardContent>
    </Card>
  );
}
