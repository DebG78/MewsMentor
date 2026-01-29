import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Plus,
  ExternalLink,
  Video
} from "lucide-react";

interface Session {
  id: number;
  date: string;
  time: string;
  title: string;
  duration: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  type: 'video' | 'in-person';
  location?: string;
}

interface CalendarViewProps {
  sessions: Session[];
  onScheduleSession?: (date: Date) => void;
  onSessionClick?: (session: Session) => void;
}

export function CalendarView({ sessions, onScheduleSession, onSessionClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  // Generate calendar weeks
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      // Find sessions for this day
      const daySessionsCount = sessions.filter(session => 
        isSameDay(parseISO(session.date), day)
      ).length;

      const dayUpcomingSessions = sessions.filter(session => 
        isSameDay(parseISO(session.date), day) && session.status === 'upcoming'
      );

      days.push(
        <div
          className={`
            min-h-24 p-2 border-r border-b cursor-pointer transition-colors hover:bg-muted/50
            ${!isSameMonth(day, monthStart) ? 'text-muted-foreground bg-muted/20' : ''}
            ${isSameDay(day, new Date()) ? 'bg-primary/10' : ''}
          `}
          key={day.toString()}
          onClick={() => onScheduleSession?.(cloneDay)}
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>
              {formattedDate}
            </span>
            {daySessionsCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {daySessionsCount}
              </Badge>
            )}
          </div>
          
          <div className="mt-1 space-y-1">
            {dayUpcomingSessions.slice(0, 2).map((session) => (
              <div
                key={session.id}
                className="bg-primary/20 text-primary text-xs p-1 rounded truncate cursor-pointer hover:bg-primary/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onSessionClick?.(session);
                }}
              >
                <div className="flex items-center gap-1">
                  {session.type === 'video' ? (
                    <Video className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  <span>{session.time}</span>
                </div>
                <div className="truncate">{session.title}</div>
              </div>
            ))}
            {dayUpcomingSessions.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{dayUpcomingSessions.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const onDateClick = (day: Date) => {
    onScheduleSession?.(day);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <CardDescription>
              Click on any date to schedule a new session
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Body */}
        <div className="border-t">
          {rows}
        </div>
      </CardContent>
    </Card>
  );
}