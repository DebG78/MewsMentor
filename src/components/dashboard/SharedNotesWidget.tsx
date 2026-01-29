import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  Edit3,
  Clock,
  User,
  Archive
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  getSharedNotesForUser,
  type SharedNote
} from "@/lib/sharedNotesService";

interface SharedNotesWidgetProps {
  userId: string;
  userType: "mentor" | "mentee";
  cohortId?: string;
  showCreateButton?: boolean;
  maxNotes?: number;
}

const SharedNotesWidget = ({
  userId,
  userType,
  cohortId,
  showCreateButton = true,
  maxNotes = 5
}: SharedNotesWidgetProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const fetchedNotes = await getSharedNotesForUser(userId, userType);
      setNotes(fetchedNotes.slice(0, maxNotes));
      setError(null);
    } catch (err) {
      console.error("Failed to load shared notes:", err);
      setError("Failed to load shared notes");
    } finally {
      setIsLoading(false);
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  useEffect(() => {
    if (userId) {
      loadNotes();
    }
  }, [userId, userType]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shared Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
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
          <FileText className="h-5 w-5" />
          Shared Notes
          {notes.length > 0 && (
            <Badge variant="secondary">{notes.length}</Badge>
          )}
        </CardTitle>
        {showCreateButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast({
              title: "Create Shared Note",
              description: "Feature coming soon - create notes in the workspace."
            })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No shared notes yet
            <p className="text-xs mt-1">
              Shared notes with your {userType === "mentor" ? "mentees" : "mentor"} will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => toast({
                  title: note.title,
                  description: "Open full note in workspace to edit."
                })}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{note.title}</h4>
                  <div className="flex items-center gap-1">
                    {note.is_archived && (
                      <Badge variant="outline" className="text-xs">
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      v{note.version}
                    </Badge>
                  </div>
                </div>

                {note.content && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {truncateContent(note.content)}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Last edited by {note.last_edited_by_type}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast({
                        title: "Edit Note",
                        description: "Open workspace to edit this note."
                      });
                    }}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {notes.length === maxNotes && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => toast({
                  title: "View all notes",
                  description: "Navigate to workspace to see all shared notes."
                })}
              >
                View all shared notes
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SharedNotesWidget;