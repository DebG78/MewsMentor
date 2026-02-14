import { AllProfiles } from "@/components/AllProfiles";
import { PageHeader } from "@/components/admin/PageHeader";

export default function PeopleProfiles() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="All Profiles"
        description="Browse and search all participant profiles across programs"
      />
      <AllProfiles selectedCohort={null} />
    </div>
  );
}
