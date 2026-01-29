import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCheck,
  Plus,
  Search,
  Pin,
  Archive,
  MoreVertical,
  FileText,
  Paperclip
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  message_type: "text" | "note" | "action_item";
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_role: string;
  last_message: Message | null;
  unread_count: number;
  created_at: string;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  status: "pending" | "completed";
  created_at: string;
}

interface MessagingHubProps {
  userId: string;
  userType: "mentor" | "mentee";
}

export const MessagingHub = ({ userId, userType }: MessagingHubProps) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    loadActionItems();
  }, [userId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      // TODO: Implement conversation loading
      // For now, return empty array
      const userConversations: Conversation[] = [];
      setConversations(userConversations);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActionItems = async () => {
    try {
      // TODO: Implement action items loading
      const userActionItems: ActionItem[] = [];
      setActionItems(userActionItems);
    } catch (err) {
      console.error("Failed to load action items:", err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // TODO: Implement message loading
      const conversationMessages: Message[] = [];
      setMessages(conversationMessages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      // TODO: Implement message sending
      setNewMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  };

  const createActionItem = async (title: string, description: string, dueDate: string) => {
    try {
      // TODO: Implement action item creation
      toast({
        title: "Action item created",
        description: "New action item has been created.",
      });
    } catch (err) {
      console.error("Failed to create action item:", err);
      toast({
        title: "Error",
        description: "Failed to create action item.",
        variant: "destructive",
      });
    }
  };

  const ConversationList = () => (
    <div className="space-y-2">
      {conversations.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Conversations</h3>
          <p className="text-sm text-muted-foreground">
            Start a conversation with your {userType === "mentor" ? "mentees" : "mentor"}.
          </p>
        </div>
      ) : (
        conversations.map((conversation) => (
          <Card
            key={conversation.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              selectedConversation?.id === conversation.id ? "bg-muted" : ""
            }`}
            onClick={() => {
              setSelectedConversation(conversation);
              loadMessages(conversation.id);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{conversation.participant_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {conversation.participant_role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conversation.unread_count > 0 && (
                    <Badge variant="default" className="rounded-full">
                      {conversation.unread_count}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {conversation.last_message &&
                      formatDistanceToNow(new Date(conversation.last_message.created_at), {
                        addSuffix: true,
                      })}
                  </p>
                </div>
              </div>
              {conversation.last_message && (
                <p className="text-sm text-muted-foreground mt-2 truncate">
                  {conversation.last_message.content}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const MessageView = () => {
    if (!selectedConversation) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Select a Conversation</h3>
            <p className="text-sm text-muted-foreground">
              Choose a conversation to start messaging.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-96">
        {/* Chat Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{selectedConversation.participant_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.participant_role}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === userId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === userId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs opacity-70">
                      {format(new Date(message.created_at), "h:mm a")}
                    </p>
                    {message.sender_id === userId && (
                      <CheckCheck className="w-3 h-3 opacity-70" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const ActionItemsList = () => (
    <div className="space-y-4">
      {actionItems.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Action Items</h3>
                <p className="text-sm text-muted-foreground">
                  Create action items to track commitments and follow-ups.
                </p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Action Item
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        actionItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.title}</h4>
                    <Badge
                      variant={item.status === "completed" ? "default" : "secondary"}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Due: {format(new Date(item.due_date), "MMM d, yyyy")}</span>
                    <span>Assigned by: {item.assigned_by}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {item.status === "pending" ? "Mark Complete" : "Completed"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Messages & Communication</h2>
        <p className="text-muted-foreground">
          Stay connected with your {userType === "mentor" ? "mentees" : "mentor"} and track action items
        </p>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
          <TabsTrigger value="shared-notes">Shared Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>
                  Your recent conversations and messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConversationList />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedConversation ? selectedConversation.participant_name : "Messages"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MessageView />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="action-items" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Action Items</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Action Item
            </Button>
          </div>
          <ActionItemsList />
        </TabsContent>

        <TabsContent value="shared-notes" className="space-y-4 mt-6">
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Shared Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Collaborative note-taking space coming soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};