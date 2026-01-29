import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Target, TrendingUp, Calendar, Award, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for demonstration
const mockSkills = [
  { id: 1, name: "Strategic Stakeholdering", category: "Leadership", level: 3, mentorsAvailable: 12 },
  { id: 2, name: "Data-led Storytelling", category: "Analytics", level: 2, mentorsAvailable: 8 },
  { id: 3, name: "Cross-functional Collaboration", category: "Communication", level: 4, mentorsAvailable: 15 },
  { id: 4, name: "Delegation & Coaching", category: "Management", level: 2, mentorsAvailable: 10 },
];

const mockSprints = [
  { id: 1, skill: "Strategic Stakeholdering", mentor: "Sarah Chen", sessions: 3, progress: 67 },
  { id: 2, skill: "Data-led Storytelling", mentor: "Marcus Rodriguez", sessions: 5, progress: 40 },
];

const Index = () => {
  const [userType, setUserType] = useState<'mentee' | 'mentor' | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGetStarted = (type: 'mentee' | 'mentor') => {
    navigate(`/signup/${type}`);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">SkillBridge</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/skills')}>Skills</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>My Sprints</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>Admin</Button>
            <Button size="sm" onClick={() => {
              toast({
                title: "Profile",
                description: "Profile management coming soon!",
              });
            }}>Profile</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!userType ? (
          // Landing Page
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Hero Section */}
            <section className="text-center space-y-6 py-12">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold tracking-tight">
                  Skills-Focused
                  <span className="bg-gradient-primary bg-clip-text text-transparent"> Internal Mentoring</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Move beyond networking. Structured 3-7 session sprints with measurable skill development,
                  AI-assisted matching, and built-in outcome tracking.
                </p>
              </div>
              
              <div className="flex justify-center gap-4 pt-4">
                <Button 
                  size="lg" 
                  onClick={() => handleGetStarted('mentee')}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  Find a Mentor
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => handleGetStarted('mentor')}
                >
                  Become a Mentor
                  <Users className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </section>

            {/* Features Grid */}
            <section className="grid md:grid-cols-3 gap-6">
              <Card className="card-elevated">
                <CardHeader>
                  <Target className="w-8 h-8 text-primary mb-2" />
                  <CardTitle>Precision Matching</CardTitle>
                  <CardDescription>
                    AI-powered matching based on skill gaps and proven mentor expertise
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="card-elevated">
                <CardHeader>
                  <Calendar className="w-8 h-8 text-secondary mb-2" />
                  <CardTitle>Structured Sprints</CardTitle>
                  <CardDescription>
                    3-7 session programs with clear objectives, exercises, and measurable outcomes
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="card-elevated">
                <CardHeader>
                  <TrendingUp className="w-8 h-8 text-accent mb-2" />
                  <CardTitle>Impact Measurement</CardTitle>
                  <CardDescription>
                    Before/after skill assessments with dashboard tracking and ROI metrics
                  </CardDescription>
                </CardHeader>
              </Card>
            </section>

            {/* Skills Preview */}
            <section className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">Popular Skills</h3>
                <p className="text-muted-foreground">Start your development journey with these in-demand capabilities</p>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mockSkills.map((skill) => (
                  <Card key={skill.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">{skill.category}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {skill.mentorsAvailable}
                        </div>
                      </div>
                      <CardTitle className="text-base">{skill.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${
                                i < skill.level ? 'bg-primary' : 'bg-muted'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">Level {skill.level}/5</span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        ) : userType === 'mentee' ? (
          // Mentee Dashboard
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Your Learning Dashboard</h2>
                <p className="text-muted-foreground">Track your skill development journey</p>
              </div>
              <Button onClick={() => navigate('/skills')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Skills
              </Button>
            </div>

            {/* Active Sprints */}
            <section className="space-y-4">
              <h3 className="text-xl font-semibold">Active Sprints</h3>
              <div className="grid gap-4">
                {mockSprints.map((sprint) => (
                  <Card key={sprint.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{sprint.skill}</h4>
                        <p className="text-sm text-muted-foreground">
                          Mentor: {sprint.mentor} • {sprint.sessions} sessions
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${sprint.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{sprint.progress}%</span>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/workspace/1')}>Continue Sprint</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recommended Skills */}
            <section className="space-y-4">
              <h3 className="text-xl font-semibold">Recommended for You</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockSkills.slice(0, 3).map((skill) => (
                  <Card key={skill.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{skill.category}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {skill.mentorsAvailable}
                        </div>
                      </div>
                      <h4 className="font-medium">{skill.name}</h4>
                      <Button size="sm" className="w-full" onClick={() => navigate('/workspace/new')}>Start Learning</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        ) : (
          // Mentor Dashboard
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Mentor Dashboard</h2>
                <p className="text-muted-foreground">Share your expertise and grow others</p>
              </div>
              <Button variant="outline">
                <Award className="w-4 h-4 mr-2" />
                View Enablement Resources
              </Button>
            </div>

            {/* Mentor Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">8</div>
                <div className="text-sm text-muted-foreground">Active Mentees</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary">24</div>
                <div className="text-sm text-muted-foreground">Sessions Completed</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">4.8</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-success">92%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </Card>
            </div>

            {/* Mentoring Queue */}
            <section className="space-y-4">
              <h3 className="text-xl font-semibold">Mentoring Requests</h3>
              <div className="space-y-3">
                {[
                  { name: "Alex Thompson", skill: "Strategic Stakeholdering", match: 95 },
                  { name: "Jordan Kim", skill: "Data-led Storytelling", match: 87 },
                ].map((request, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{request.name}</h4>
                        <p className="text-sm text-muted-foreground">{request.skill}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {request.match}% match
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">View Profile</Button>
                        <Button size="sm">Accept</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;