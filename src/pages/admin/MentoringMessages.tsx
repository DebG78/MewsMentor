import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomatedMessages } from "@/components/AutomatedMessages";

export default function MentoringMessages() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automated Messages</CardTitle>
        <CardDescription>Configure automated messaging for mentoring program participants</CardDescription>
      </CardHeader>
      <CardContent>
        <AutomatedMessages />
      </CardContent>
    </Card>
  );
}
