import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoldingArea } from "@/components/HoldingArea";

export default function MentoringUnassigned() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unassigned Participants</CardTitle>
        <CardDescription>Mentees and mentors waiting for cohort assignment</CardDescription>
      </CardHeader>
      <CardContent>
        <HoldingArea />
      </CardContent>
    </Card>
  );
}
