import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortManagement } from "@/components/CohortManagement";
import type { Cohort } from "@/types/mentoring";

export default function MentoringCohorts() {
  const { cohortId } = useParams<{ cohortId?: string }>();
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  const handleCohortSelected = (cohort: Cohort | null) => {
    setSelectedCohort(cohort);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentoring Cohorts</CardTitle>
        <CardDescription>Create and manage mentoring program cohorts</CardDescription>
      </CardHeader>
      <CardContent>
        <CohortManagement
          onCohortSelected={handleCohortSelected}
          selectedCohortId={cohortId}
        />
      </CardContent>
    </Card>
  );
}
