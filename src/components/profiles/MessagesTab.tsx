import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, X } from "lucide-react";
import { getMessagesByRecipient, type MessageLogEntry } from "@/lib/messageService";
import { DatePicker } from "@/components/ui/date-picker";

interface MessagesTabProps {
  personId: string;
  slackUserId?: string;
}

export function MessagesTab({ personId, slackUserId }: MessagesTabProps) {
  const [messages, setMessages] = useState<MessageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMessagesByRecipient(personId, slackUserId)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [personId, slackUserId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-destructive">Failed to load messages: {error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No messages have been sent to this person.</p>
      </div>
    );
  }

  // Get unique template types for filter chips
  const templateTypes = [...new Set(messages.map((m) => m.template_type))];
  const hasDateFilter = dateFrom || dateTo;
  const filtered = messages.filter((m) => {
    if (filter && m.template_type !== filter) return false;
    if (dateFrom) {
      const msgDate = new Date(m.created_at);
      if (msgDate < dateFrom) return false;
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(m.created_at) > end) return false;
    }
    return true;
  });

  const statusCounts = {
    sent: messages.filter((m) => m.delivery_status === "sent").length,
    failed: messages.filter((m) => m.delivery_status === "failed").length,
    pending: messages.filter((m) => m.delivery_status === "pending").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{messages.length} messages</span>
        {statusCounts.sent > 0 && (
          <Badge variant="outline" className="text-green-600 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {statusCounts.sent} sent
          </Badge>
        )}
        {statusCounts.failed > 0 && (
          <Badge variant="outline" className="text-red-600 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {statusCounts.failed} failed
          </Badge>
        )}
        {statusCounts.pending > 0 && (
          <Badge variant="outline" className="text-amber-600 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            {statusCounts.pending} pending
          </Badge>
        )}
      </div>

      {/* Filter chips */}
      {templateTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={filter === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setFilter(null)}
          >
            All
          </Badge>
          {templateTypes.map((tt) => (
            <Badge
              key={tt}
              variant={filter === tt ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFilter(filter === tt ? null : tt)}
            >
              {tt.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">From</span>
          <DatePicker date={dateFrom} onDateChange={setDateFrom} placeholder="Start date" className="h-8 text-xs w-[150px]" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">To</span>
          <DatePicker date={dateTo} onDateChange={setDateTo} placeholder="End date" className="h-8 text-xs w-[150px]" />
        </div>
        {hasDateFilter && (
          <button
            onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Clear dates
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No messages match the current filters.</p>
          </div>
        ) : filtered.map((msg) => (
          <MessageCard key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}

function MessageCard({ message }: { message: MessageLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    sent: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
    failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  }[message.delivery_status];

  const date = new Date(message.created_at);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {statusIcon}
            <Badge variant="outline" className="text-[10px] shrink-0">
              {message.template_type.replace(/_/g, " ")}
            </Badge>
            {message.journey_phase && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {message.journey_phase.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Message preview */}
        <div className="mt-2">
          <p className={`text-xs text-muted-foreground whitespace-pre-wrap ${!expanded ? "line-clamp-2" : ""}`}>
            {message.message_text}
          </p>
          {message.message_text && message.message_text.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5"
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> Less</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> More</>
              )}
            </button>
          )}
        </div>

        {message.error_detail && (
          <p className="text-xs text-red-500 mt-1">Error: {message.error_detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-3 animate-pulse">
          <div className="h-3 bg-muted rounded w-1/4 mb-2" />
          <div className="h-3 bg-muted rounded w-3/4 mb-1" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
