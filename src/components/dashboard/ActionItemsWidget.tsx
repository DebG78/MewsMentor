import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Target,
  AlertCircle,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import {
  getActionItemsForUser,
  completeActionItem,
  createActionItem,
  type ActionItem
} from "@/lib/actionItemsService";

interface ActionItemsWidgetProps {
  userId: string;
  userType: "mentor" | "mentee";
  cohortId?: string;
  showCreateButton?: boolean;
  maxItems?: number;
}

const ActionItemsWidget = ({
  userId,
  userType,
  cohortId,
  showCreateButton = true,
  maxItems = 5
}: ActionItemsWidgetProps) => {
  const { toast } = useToast();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActionItems = async () => {
    try {
      setIsLoading(true);
      const items = await getActionItemsForUser(userId, userType);
      setActionItems(items.slice(0, maxItems));
      setError(null);
    } catch (err) {
      console.error("Failed to load action items:", err);
      setError("Failed to load action items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      await completeActionItem(itemId, "Completed via dashboard");
      await loadActionItems(); // Refresh the list
      toast({
        title: "Action item completed",
        description: "Great job! The item has been marked as complete."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to complete action item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  useEffect(() => {
    if (userId) {
      loadActionItems();
    }
  }, [userId, userType]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Action Items
          {actionItems.length > 0 && (
            <Badge variant="secondary">{actionItems.length}</Badge>
          )}
        </CardTitle>
        {showCreateButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast({
              title: "Create Action Item",
              description: "Feature coming soon - create action items in the workspace."
            })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {actionItems.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No action items yet
            <p className="text-xs mt-1">
              Action items will appear here as you work with your {userType === "mentor" ? "mentees" : "mentor"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleCompleteItem(item.id)}
                  disabled={item.status === "completed"}
                >
                  {item.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`font-medium text-sm ${
                      item.status === "completed" ? "line-through text-muted-foreground" : ""
                    }`}>
                      {item.title}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(item.priority)}`}
                    >
                      {item.priority}
                    </Badge>
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.assignee_type !== userType && (
                      <span>
                        Assigned by {item.assigner_type === "mentor" ? "mentor" : "mentee"}
                      </span>
                    )}
                    {item.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {format(new Date(item.due_date), "MMM d")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.created_at), "MMM d")}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {actionItems.length === maxItems && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => toast({
                  title: "View all action items",
                  description: "Navigate to the workspace to see all items."
                })}
              >
                View all action items
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionItemsWidget;