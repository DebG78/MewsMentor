import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllProfiles } from "@/components/AllProfiles";

export default function PeopleProfiles() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Profiles</CardTitle>
        <CardDescription>Browse and search all participant profiles across programs</CardDescription>
      </CardHeader>
      <CardContent>
        <AllProfiles selectedCohort={null} />
      </CardContent>
    </Card>
  );
}
