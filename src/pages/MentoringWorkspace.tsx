import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CalendarView } from "@/components/CalendarView";
import { SessionScheduler } from "@/components/SessionScheduler";
import { SessionCompletion } from "@/components/SessionCompletion";
import { format, parseISO } from "date-fns";
import { 
  ArrowLeft,
  FileText,
  Upload,
  MessageSquare,
  Target,
  Calendar,
  Download,
  Plus,
  Send,
  CheckSquare,
  Clock,
  Star,
  Paperclip,
  Edit,
  Trash2,
  MoreVertical,
  Video,
  ExternalLink,
  Copy,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for mentoring relationship
const mentoringData = {
  sprint: {
    id: 1,
    skill: "Strategic Stakeholdering",
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    progress: 67,
    currentLevel: 2,
    targetLevel: 4,
  },
  mentee: {
    name: "Alex Thompson",
    role: "Product Manager",
    avatar: undefined,
  },
  mentor: {
    name: "Sarah Chen",
    role: "Senior Product Director",
    avatar: undefined,
  },
  sessions: [
    {
      id: 1,
      date: "2024-01-15",
      time: "14:00",
      title: "Stakeholder Mapping Session",
      duration: 60,
      status: 'completed' as const,
      type: 'video' as const,
      notes: "Covered the fundamentals of stakeholder analysis. Alex demonstrated good understanding of power/interest matrix. Next session we'll focus on influence strategies.",
      actionItems: ["Complete stakeholder map for current project", "Read 'Getting to Yes' chapter 3"],
      documents: ["Stakeholder_Analysis_Template.pdf"],
      calendarLink: "https://outlook.live.com/calendar/meeting-link-1",
      location: "Video Call - Teams"
    },
    {
      id: 2,
      date: "2024-01-22",
      time: "14:00",
      title: "Influence Without Authority",
      duration: 60,
      status: 'completed' as const,
      type: 'video' as const,
      notes: "Great session on building influence. Alex shared real scenarios from their work. Practiced reciprocity and commitment techniques.",
      actionItems: ["Practice influence techniques in next team meeting", "Document outcomes"],
      documents: ["Influence_Strategies_Guide.docx"],
      calendarLink: "https://outlook.live.com/calendar/meeting-link-2",
      location: "Video Call - Teams"
    },
    {
      id: 3,
      date: "2024-01-29",
      time: "14:00",
      title: "Managing Conflicting Priorities",
      duration: 60,
      status: 'upcoming' as const,
      type: 'video' as const,
      notes: "",
      actionItems: [],
      documents: [],
      calendarLink: "https://outlook.live.com/calendar/meeting-link-3",
      location: "Video Call - Teams"
    },
    {
      id: 4,
      date: "2024-02-05",
      time: "15:00",
      title: "Strategic Communication Workshop",
      duration: 90,
      status: 'upcoming' as const,
      type: 'in-person' as const,
      notes: "",
      actionItems: [],
      documents: [],
      location: "Conference Room B, Building A"
    }
  ],
  sharedDocuments: [
    { id: 1, name: "Sprint Goals & Objectives.pdf", uploadedBy: "Sarah Chen", date: "2024-01-15", size: "245 KB" },
    { id: 2, name: "Stakeholder Analysis Template.xlsx", uploadedBy: "Sarah Chen", date: "2024-01-15", size: "67 KB" },
    { id: 3, name: "Project Context - Q1 Roadmap.pptx", uploadedBy: "Alex Thompson", date: "2024-01-16", size: "1.2 MB" },
    { id: 4, name: "Influence Strategies Reference.pdf", uploadedBy: "Sarah Chen", date: "2024-01-22", size: "890 KB" },
  ],
  comments: [
    {
      id: 1,
      author: "Sarah Chen",
      date: "2024-01-16",
      content: "Great work on the stakeholder map! I can see you've identified all the key players. One suggestion - consider adding the CFO to your high-influence list given the budget implications.",
      replies: [
        {
          id: 2,
          author: "Alex Thompson", 
          date: "2024-01-16",
          content: "Good point! I hadn't considered the budget angle. I'll update the map and include the CFO. Thanks for the feedback!"
        }
      ]
    },
    {
      id: 3,
      author: "Alex Thompson",
      date: "2024-01-24",
      content: "Update: I tried the reciprocity technique in yesterday's meeting and it worked really well! The engineering lead was much more open to our timeline after I acknowledged their concerns first.",
      replies: []
    }
  ],
  goals: [
    { id: 1, title: "Master stakeholder mapping framework", completed: true, dueDate: "2024-01-20" },
    { id: 2, title: "Successfully influence 3 key decisions", completed: false, dueDate: "2024-02-05" },
    { id: 3, title: "Handle conflicting stakeholder priorities", completed: false, dueDate: "2024-02-10" },
    { id: 4, title: "Receive positive stakeholder feedback", completed: false, dueDate: "2024-02-15" }
  ]
};

const MentoringWorkspace = () => {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [selectedSession, setSelectedSession] = useState(mentoringData.sessions[0]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [sessions, setSessions] = useState(mentoringData.sessions);

  const handleScheduleSession = (date: Date) => {
    setSelectedDate(date);
    setShowScheduler(true);
  };

  const handleSessionScheduled = (sessionData: any) => {
    const newSession = {
      ...sessionData,
      id: sessions.length + 1,
      status: 'upcoming' as const
    };
    setSessions([...sessions, newSession]);
  };

  const handleSessionClick = (session: any) => {
    setSelectedSession(session);
    setActiveTab("sessions");
  };

  const handleSessionComplete = (sessionId: number, completionData: any) => {
    setSessions(sessions.map(session => 
      session.id === sessionId 
        ? { ...session, ...completionData }
        : session
    ));
  };

  const generateOutlookLink = (session: any) => {
    const startDateTime = new Date(`${session.date}T${session.time}`);
    const endDateTime = new Date(startDateTime.getTime() + session.duration * 60000);
    
    const title = encodeURIComponent(session.title);
    const startTime = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const location = encodeURIComponent(session.location || '');
    
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startTime}&enddt=${endTime}&location=${location}`;
  };

  const copyCalendarLink = (session: any) => {
    const link = generateOutlookLink(session);
    navigator.clipboard.writeText(link);
    toast({
      title: "Calendar link copied",
      description: "Outlook calendar link has been copied to clipboard.",
    });
  };

  const handleSaveNote = () => {
    if (!newNote.trim()) return;
    
    toast({
      title: "Note saved",
      description: "Your session note has been saved successfully.",
    });
    setNewNote("");
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    toast({
      title: "Comment added", 
      description: "Your comment has been posted to the workspace.",
    });
    setNewComment("");
  };

  const handleFileUpload = () => {
    toast({
      title: "File upload",
      description: "File upload functionality would be integrated with cloud storage.",
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold">{mentoringData.sprint.skill} Sprint</h1>
                <p className="text-sm text-muted-foreground">Mentoring workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowScheduler(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Sprint Overview */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={mentoringData.mentee.avatar} alt={mentoringData.mentee.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(mentoringData.mentee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{mentoringData.mentee.name}</h3>
                    <p className="text-sm text-muted-foreground">{mentoringData.mentee.role}</p>
                  </div>
                </div>
                <div className="text-muted-foreground">×</div>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={mentoringData.mentor.avatar} alt={mentoringData.mentor.name} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitials(mentoringData.mentor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{mentoringData.mentor.name}</h3>
                    <p className="text-sm text-muted-foreground">{mentoringData.mentor.role}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{mentoringData.sprint.progress}%</div>
                <div className="text-sm text-muted-foreground">Progress</div>
                <Badge className="mt-1">
                  Level {mentoringData.sprint.currentLevel} → {mentoringData.sprint.targetLevel}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Main Workspace */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="sessions">Session Notes</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
              <TabsTrigger value="goals">Goals & Progress</TabsTrigger>
            </TabsList>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Session Calendar</h3>
                    <p className="text-muted-foreground">View and schedule mentoring sessions</p>
                  </div>
                  <Button onClick={() => setShowScheduler(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Session
                  </Button>
                </div>

                <CalendarView
                  sessions={sessions.map(session => ({
                    id: session.id,
                    date: session.date,
                    time: session.time,
                    title: session.title,
                    duration: session.duration,
                    status: session.status,
                    type: session.type,
                    location: session.location
                  }))}
                  onScheduleSession={handleScheduleSession}
                  onSessionClick={handleSessionClick}
                />

                {/* Upcoming Sessions List */}
                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4">Upcoming Sessions</h4>
                  <div className="space-y-4">
                    {sessions
                      .filter(session => session.status === 'upcoming')
                      .map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {session.type === 'video' ? (
                            <Video className="w-5 h-5 text-blue-500" />
                          ) : (
                            <MapPin className="w-5 h-5 text-green-500" />
                          )}
                          <div>
                            <h5 className="font-medium">{session.title}</h5>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(session.date), 'MMM d, yyyy')} at {session.time} • {session.duration} minutes
                            </p>
                            <p className="text-xs text-muted-foreground">{session.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyCalendarLink(session)}>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Link
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => window.open(generateOutlookLink(session), '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open in Outlook
                          </Button>
                          {session.type === 'video' && session.calendarLink && (
                            <Button size="sm" onClick={() => window.open(session.calendarLink, '_blank')}>
                              <Video className="w-4 h-4 mr-1" />
                              Join Call
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                      {mentoringData.comments.slice(0, 2).map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(comment.author)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.author}</span>
                              <span className="text-xs text-muted-foreground">{comment.date}</span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Upcoming Sessions</h3>
                    <div className="space-y-3">
                      {sessions
                        .filter(s => s.status === "upcoming")
                        .map((session) => (
                        <div key={session.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          {session.type === 'video' ? (
                            <Video className="w-5 h-5 text-primary" />
                          ) : (
                            <Calendar className="w-5 h-5 text-primary" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{session.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(session.date), 'MMM d, yyyy')} at {session.time} • {session.duration} minutes
                            </p>
                          </div>
                          <SessionCompletion 
                            session={session}
                            onSessionComplete={handleSessionComplete}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Quick Stats & Actions */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sessions completed:</span>
                        <span className="font-medium">{sessions.filter(s => s.status === 'completed').length}/{sessions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Goals achieved:</span>
                        <span className="font-medium">1/4</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Documents shared:</span>
                        <span className="font-medium">{mentoringData.sharedDocuments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Comments posted:</span>
                        <span className="font-medium">{mentoringData.comments.length}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("sessions")}>
                        <FileText className="w-4 h-4 mr-2" />
                        Add Session Notes
                      </Button>
                      <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("calendar")}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Session
                      </Button>
                      <Button className="w-full justify-start" variant="outline" onClick={handleFileUpload}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </Button>
                      <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("discussions")}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Start Discussion
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Session Notes Tab */}
            <TabsContent value="sessions" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Session List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Sessions</h3>
                    <Button size="sm" onClick={() => setShowScheduler(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Session
                    </Button>
                  </div>
                  {sessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedSession.id === session.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={session.status === 'completed' ? 'default' : 'outline'}>
                          {session.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{format(parseISO(session.date), 'MMM d')}</span>
                      </div>
                      <h4 className="font-medium">{session.title}</h4>
                      <p className="text-sm text-muted-foreground">{session.duration} minutes</p>
                    </Card>
                  ))}
                </div>

                {/* Session Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Session Completion Component */}
                  <SessionCompletion 
                    session={selectedSession}
                    onSessionComplete={handleSessionComplete}
                  />

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedSession.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(selectedSession.date), 'MMM d, yyyy')} at {selectedSession.time} • {selectedSession.duration} minutes
                        </p>
                      </div>
                      <Badge variant={selectedSession.status === 'completed' ? 'default' : 'outline'}>
                        {selectedSession.status}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Session Notes</label>
                        <Textarea
                          value={selectedSession.notes || ""}
                          onChange={(e) => setSelectedSession({...selectedSession, notes: e.target.value})}
                          placeholder="Add your session notes here..."
                          className="min-h-32"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Action Items</label>
                        <div className="space-y-2">
                          {selectedSession.actionItems && selectedSession.actionItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{item}</span>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <Input placeholder="Add action item..." className="flex-1" />
                            <Button size="sm">Add</Button>
                          </div>
                        </div>
                      </div>

                      <Button onClick={handleSaveNote}>
                        Save Session Notes
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Shared Documents</h3>
                <Button onClick={handleFileUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mentoringData.sharedDocuments.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                    <h4 className="font-medium text-sm mb-1 truncate">{doc.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Uploaded by {doc.uploadedBy} • {doc.date}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">{doc.size}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Discussions Tab */}
            <TabsContent value="discussions" className="space-y-6">
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        AT
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Start a discussion or share an update..."
                        className="min-h-20"
                      />
                      <div className="flex justify-between">
                        <Button variant="ghost" size="sm">
                          <Paperclip className="w-4 h-4 mr-2" />
                          Attach file
                        </Button>
                        <Button size="sm" onClick={handleAddComment}>
                          <Send className="w-4 h-4 mr-2" />
                          Post Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Comments Thread */}
                <div className="space-y-4">
                  {mentoringData.comments.map((comment) => (
                    <Card key={comment.id} className="p-4">
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.author)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">{comment.author}</span>
                            <span className="text-xs text-muted-foreground">{comment.date}</span>
                          </div>
                          <p className="text-sm mb-3">{comment.content}</p>
                          
                          {comment.replies.length > 0 && (
                            <div className="space-y-3 ml-4 pt-3 border-t">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex gap-3">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(reply.author)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-xs">{reply.author}</span>
                                      <span className="text-xs text-muted-foreground">{reply.date}</span>
                                    </div>
                                    <p className="text-sm">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <Button variant="ghost" size="sm" className="mt-2">
                            Reply
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sprint Goals & Milestones</h3>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Goal
                </Button>
              </div>

              <div className="space-y-4">
                {mentoringData.goals.map((goal) => (
                  <Card key={goal.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <CheckSquare 
                          className={`w-5 h-5 mt-0.5 ${
                            goal.completed ? 'text-green-500' : 'text-muted-foreground'
                          }`} 
                        />
                        <div>
                          <h4 className={`font-medium ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {goal.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Due: {goal.dueDate}</span>
                            {goal.completed && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Session Scheduler Modal */}
          <SessionScheduler
            isOpen={showScheduler}
            onClose={() => setShowScheduler(false)}
            selectedDate={selectedDate}
            mentorName={mentoringData.mentor.name}
            menteeName={mentoringData.mentee.name}
            onSchedule={handleSessionScheduled}
          />
        </div>
      </main>
    </div>
  );
};

export default MentoringWorkspace;