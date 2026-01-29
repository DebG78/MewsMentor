import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Plus,
  Clock,
  Users,
  Settings,
  Play,
  Pause,
  MoreHorizontal,
  Calendar,
  MessageSquare,
  CheckCircle,
  Send,
  Edit,
  Copy,
  Trash2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for automated messages
const mockAutomations = [
  {
    id: 1,
    name: "Welcome to Mentoring Sprint",
    type: "onboarding",
    trigger: "match_launch",
    recipients: "mentor_mentee_pairs",
    status: "active",
    lastSent: "2024-01-15",
    totalSent: 45,
    schedule: "immediate",
    template: {
      subject: "Welcome to your mentoring sprint!",
      content: "Hi {{mentee_name}} and {{mentor_name}},\n\nCongratulations! Your mentoring sprint has officially begun..."
    }
  },
  {
    id: 2,
    name: "Weekly Check-in Reminder",
    type: "engagement",
    trigger: "weekly_schedule",
    recipients: "mentor_mentee_pairs",
    status: "active",
    lastSent: "2024-01-20",
    totalSent: 128,
    schedule: "weekly_monday",
    template: {
      subject: "Weekly mentoring check-in reminder",
      content: "Hi {{mentee_name}} and {{mentor_name}},\n\nIt's time for your weekly mentoring session..."
    }
  },
  {
    id: 3,
    name: "Mid-Sprint Progress Review",
    type: "milestone",
    trigger: "sprint_midpoint",
    recipients: "mentor_mentee_pairs",
    status: "draft",
    lastSent: null,
    totalSent: 0,
    schedule: "milestone_based",
    template: {
      subject: "Mid-sprint progress review",
      content: "Hi {{mentee_name}} and {{mentor_name}},\n\nYou're halfway through your mentoring sprint..."
    }
  }
];

const messageTypes = [
  { id: "onboarding", label: "Onboarding", icon: CheckCircle },
  { id: "engagement", label: "Engagement", icon: MessageSquare },
  { id: "milestone", label: "Milestone", icon: Calendar },
  { id: "reminder", label: "Reminder", icon: Clock },
];

const triggers = [
  { id: "match_launch", label: "When match is launched" },
  { id: "session_scheduled", label: "When session is scheduled" },
  { id: "session_completed", label: "After session completion" },
  { id: "weekly_schedule", label: "Weekly schedule" },
  { id: "sprint_midpoint", label: "Sprint midpoint" },
  { id: "sprint_end", label: "Sprint completion" },
  { id: "inactivity", label: "After period of inactivity" },
];

const recipients = [
  { id: "mentor_mentee_pairs", label: "Mentor-Mentee Pairs" },
  { id: "mentees_only", label: "Mentees Only" },
  { id: "mentors_only", label: "Mentors Only" },
  { id: "program_managers", label: "Program Managers" },
];

export const AutomatedMessages = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    trigger: "",
    recipients: "",
    subject: "",
    content: "",
    schedule: "immediate"
  });
  const { toast } = useToast();

  const handleCreateAutomation = () => {
    toast({
      title: "Automation created",
      description: `"${formData.name}" has been created and saved as draft.`,
    });
    setIsCreateDialogOpen(false);
    setFormData({
      name: "",
      type: "",
      trigger: "",
      recipients: "",
      subject: "",
      content: "",
      schedule: "immediate"
    });
  };

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    toast({
      title: `Automation ${newStatus}`,
      description: `The automation has been ${newStatus}.`,
    });
  };

  const handlePreview = (automation: any) => {
    toast({
      title: "Preview generated",
      description: "Message preview opened in new tab.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "paused":
        return <Badge variant="outline" className="text-amber-700 border-amber-300">Paused</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-gray-700">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = messageTypes.find(t => t.id === type);
    if (!typeConfig) return <Badge variant="outline">{type}</Badge>;
    
    const Icon = typeConfig.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {typeConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automated Messages</h2>
          <p className="text-muted-foreground">Set up automated communications for your mentoring program</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Automation</DialogTitle>
              <DialogDescription>
                Set up an automated message that will be sent to your mentoring program participants.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="automation-name">Automation Name</Label>
                  <Input
                    id="automation-name"
                    placeholder="e.g. Welcome Message"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message-type">Message Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {messageTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger</Label>
                  <Select value={formData.trigger} onValueChange={(value) => setFormData({ ...formData, trigger: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggers.map((trigger) => (
                        <SelectItem key={trigger.id} value={trigger.id}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipients">Recipients</Label>
                  <Select value={formData.recipients} onValueChange={(value) => setFormData({ ...formData, recipients: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((recipient) => (
                        <SelectItem key={recipient.id} value={recipient.id}>
                          {recipient.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Welcome to your mentoring sprint!"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder={"Hi {{mentee_name}} and {{mentor_name}},\n\nWelcome to your mentoring sprint..."}
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use variables: {"{{mentee_name}}, {{mentor_name}}, {{skill}}, {{program_name}}"}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAutomation}>
                Create Automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              +1 from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">173</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89%</div>
            <p className="text-xs text-muted-foreground">
              Above average
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">All Automations</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sent</TableHead>
                  <TableHead>Total Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAutomations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell>
                      <div className="font-medium">{automation.name}</div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(automation.type)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {triggers.find(t => t.id === automation.trigger)?.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {recipients.find(r => r.id === automation.recipients)?.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(automation.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {automation.lastSent || "Never"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{automation.totalSent}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(automation)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant={automation.status === "active" ? "outline" : "default"}
                          onClick={() => handleToggleStatus(automation.id, automation.status)}
                        >
                          {automation.status === "active" ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="p-6">
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Message Templates</h3>
              <p className="text-muted-foreground mb-4">Create reusable message templates for your automations</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="p-6">
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Message Analytics</h3>
              <p className="text-muted-foreground">View detailed analytics for your automated messages</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};