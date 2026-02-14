import { HoldingArea } from "@/components/HoldingArea";
import { PageHeader } from "@/components/admin/PageHeader";

export default function MentoringUnassigned() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Unassigned Participants"
        description="Mentees and mentors waiting for cohort assignment"
      />
      <HoldingArea />
    </div>
  );
}
