import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CohortOverview } from "@/components/dashboard/CohortOverview";
import { useUser } from "@/contexts/UserContext";
import type { Database } from "@/types/database";

type MenteeRow = Database["public"]["Tables"]["mentees"]["Row"];
type MentorRow = Database["public"]["Tables"]["mentors"]["Row"];

const Sprints = () => {
  const { isLoading, userProfile } = useUser();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">We couldn't find your profile</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Try signing out and back in. If the issue continues, contact the program team so we can restore your access.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const userType = userProfile.type === 'mentee' ? 'mentee' : userProfile.type === 'mentor' ? 'mentor' : null;

  if (!userType || userType === 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">My Sprints</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sprints view is available for mentors and mentees only.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Sprints</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your mentoring cohorts and sprints
          </p>
        </div>

        <CohortOverview
          userId={userProfile.id}
          userType={userType}
        />
      </div>
    </div>
  );
};

export default Sprints;