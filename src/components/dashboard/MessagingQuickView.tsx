import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCheck,
  MessageCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  getUserConversations,
  type Conversation,
  type Message
} from "@/lib/messagingService";

interface MessagingQuickViewProps {
  userId: string;
  userType: "mentor" | "mentee";
  maxConversations?: number;
}

const MessagingQuickView = ({
  userId,
  userType,
  maxConversations = 5
}: MessagingQuickViewProps) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const fetchedConversations = await getUserConversations(userId, userType);
      setConversations(fetchedConversations.slice(0, maxConversations));
      setError(null);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const getParticipantName = (conversation: Conversation) => {
    if (userType === "mentor") {
      return `Mentee ${conversation.mentee_id}`;
    } else {
      return `Mentor ${conversation.mentor_id}`;
    }
  };

  const getParticipantInitials = (conversation: Conversation) => {
    const name = getParticipantName(conversation);
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getUnreadCount = (conversation: Conversation) => {
    const lastReadField = userType === "mentor"
      ? "mentor_last_read_at"
      : "mentee_last_read_at";

    // This is a simplified calculation - in a real app, you'd query for actual unread count
    if (!conversation[lastReadField] ||
        new Date(conversation.last_message_at) > new Date(conversation[lastReadField])) {
      return 1; // Simplified - just show 1 if there might be unread messages
    }
    return 0;
  };

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId, userType]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
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
          <MessageSquare className="h-5 w-5" />
          Recent Messages
          {conversations.some(c => getUnreadCount(c) > 0) && (
            <Badge variant="destructive" className="h-5 min-w-5 text-xs">
              {conversations.reduce((sum, c) => sum + getUnreadCount(c), 0)}
            </Badge>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast({
            title: "Open Messaging",
            description: "Navigate to MessagingHub for full chat interface."
          })}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No conversations yet
            <p className="text-xs mt-1">
              Messages with your {userType === "mentor" ? "mentees" : "mentor"} will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const unreadCount = getUnreadCount(conversation);
              return (
                <div
                  key={conversation.id}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toast({
                    title: "Open Conversation",
                    description: "Navigate to MessagingHub to continue this conversation."
                  })}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getParticipantInitials(conversation)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">
                        {getParticipantName(conversation)}
                      </p>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="h-4 min-w-4 text-xs">
                            {unreadCount}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.last_message_at), {
                            addSuffix: true
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Latest activity: {format(new Date(conversation.last_message_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })}

            {conversations.length === maxConversations && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => toast({
                  title: "View all conversations",
                  description: "Navigate to MessagingHub to see all conversations."
                })}
              >
                View all conversations
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessagingQuickView;