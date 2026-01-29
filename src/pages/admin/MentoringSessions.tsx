import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionAnalytics } from "@/components/SessionAnalytics";

export default function MentoringSessions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentoring Sessions</CardTitle>
        <CardDescription>View and analyze mentoring sessions across all cohorts</CardDescription>
      </CardHeader>
      <CardContent>
        <SessionAnalytics selectedCohort={null} />
      </CardContent>
    </Card>
  );
}
