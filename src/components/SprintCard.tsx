import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Target, Users, ArrowRight, CheckCircle, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SprintSession {
  id: number;
  title: string;
  date: string;
  duration: number;
  status: 'completed' | 'upcoming' | 'in-progress';
  objectives?: string[];
  notes?: string;
}

interface Sprint {
  id: number;
  skill: string;
  mentor: {
    name: string;
    avatar?: string;
    title: string;
  };
  startDate: string;
  endDate: string;
  progress: number;
  status: 'active' | 'completed' | 'upcoming' | 'paused';
  sessions: SprintSession[];
  currentLevel: number;
  targetLevel: number;
  objectives: string[];
  nextSession?: {
    date: string;
    time: string;
  };
}

interface SprintCardProps {
  sprint: Sprint;
  onContinue?: (sprintId: number) => void;
  onViewDetails?: (sprintId: number) => void;
  variant?: 'default' | 'detailed' | 'compact';
}

export function SprintCard({ sprint, onContinue, onViewDetails, variant = 'default' }: SprintCardProps) {
  const navigate = useNavigate();
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'upcoming': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'paused': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getSessionIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress': return <Circle className="w-4 h-4 text-blue-500 fill-blue-500" />;
      case 'upcoming': return <Circle className="w-4 h-4 text-muted-foreground" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(sprint.status)}>
              {sprint.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{sprint.progress}%</span>
          </div>
          <CardTitle className="text-base">{sprint.skill}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="w-6 h-6">
              <AvatarImage src={sprint.mentor.avatar} alt={sprint.mentor.name} />
              <AvatarFallback className="text-xs bg-muted">
                {getInitials(sprint.mentor.name)}
              </AvatarFallback>
            </Avatar>
            <span>{sprint.mentor.name}</span>
          </div>
          <Progress value={sprint.progress} className="w-full h-2" />
        </CardHeader>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(sprint.status)}>
                  {sprint.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-2xl font-bold">{sprint.skill} Sprint</h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{sprint.progress}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>

          {/* Mentor Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src={sprint.mentor.avatar} alt={sprint.mentor.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(sprint.mentor.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{sprint.mentor.name}</h3>
              <p className="text-sm text-muted-foreground">{sprint.mentor.title}</p>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{sprint.progress}%</span>
            </div>
            <Progress value={sprint.progress} className="w-full" />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-bold text-muted-foreground">Level {sprint.currentLevel}</div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-lg font-bold text-primary">Level {sprint.targetLevel}</div>
                <div className="text-xs text-muted-foreground">Target</div>
              </div>
            </div>
          </div>

          {/* Next Session */}
          {sprint.nextSession && (
            <div className="mt-6 p-4 bg-accent-light rounded-lg border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="font-medium text-accent">Next Session</span>
              </div>
              <p className="text-sm">
                {sprint.nextSession.date} at {sprint.nextSession.time}
              </p>
            </div>
          )}
        </Card>

        {/* Sessions Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Sessions Timeline</h3>
          <div className="space-y-3">
            {sprint.sessions.map((session, index) => (
              <div key={session.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="mt-1">
                  {getSessionIcon(session.status)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{session.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {session.date}
                      <Clock className="w-3 h-3" />
                      {session.duration}min
                    </div>
                  </div>
                  {session.objectives && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {session.objectives.slice(0, 2).map((objective, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <Target className="w-3 h-3 flex-shrink-0" />
                          {objective}
                        </li>
                      ))}
                    </ul>
                  )}
                  {session.notes && (
                    <p className="text-sm text-muted-foreground italic">{session.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Objectives */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Sprint Objectives</h3>
          <ul className="space-y-2">
            {sprint.objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                {objective}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  // Default variant
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <Badge className={getStatusColor(sprint.status)}>
            {sprint.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {sprint.sessions.filter(s => s.status === 'completed').length}/{sprint.sessions.length} sessions
          </span>
        </div>
        
        <CardTitle className="text-lg">{sprint.skill}</CardTitle>
        <CardDescription>
          Level {sprint.currentLevel} → {sprint.targetLevel}
        </CardDescription>
        
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={sprint.mentor.avatar} alt={sprint.mentor.name} />
            <AvatarFallback className="text-sm bg-muted">
              {getInitials(sprint.mentor.name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <div className="font-medium">{sprint.mentor.name}</div>
            <div className="text-muted-foreground">{sprint.mentor.title}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{sprint.progress}%</span>
          </div>
          <Progress value={sprint.progress} className="w-full" />
        </div>

        {sprint.nextSession && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Next: {sprint.nextSession.date}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1" 
            onClick={() => navigate('/workspace/' + sprint.id)}
            disabled={sprint.status !== 'active'}
          >
            Continue Sprint
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onViewDetails?.(sprint.id)}
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}