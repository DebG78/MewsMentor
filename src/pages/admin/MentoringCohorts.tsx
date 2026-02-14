import { useState } from "react";
import { useParams } from "react-router-dom";
import { CohortManagement } from "@/components/CohortManagement";
import type { Cohort } from "@/types/mentoring";
import { PageHeader } from "@/components/admin/PageHeader";

export default function MentoringCohorts() {
  const { cohortId } = useParams<{ cohortId?: string }>();
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  const handleCohortSelected = (cohort: Cohort | null) => {
    setSelectedCohort(cohort);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentoring Cohorts"
        description="Create and manage mentoring program cohorts"
      />
      <CohortManagement
        onCohortSelected={handleCohortSelected}
        selectedCohortId={cohortId}
      />
    </div>
  );
}
