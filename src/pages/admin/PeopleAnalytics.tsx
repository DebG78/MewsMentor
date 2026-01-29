import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PeopleAnalytics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Analytics</CardTitle>
        <CardDescription>Cross-program insights, skills development, engagement, and growth metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          Growth analytics dashboard coming soon...
        </p>
      </CardContent>
    </Card>
  );
}
