import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MentorProfile } from "./MentorProfile";
import { Loader2, Users, Zap, Star, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MatchingInterfaceProps {
  skillId: number;
  skillName: string;
  onMatchComplete?: (mentorId: number) => void;
}

// Mock data for demonstration
const mockMentors = [
  {
    id: 1,
    name: "Sarah Chen",
    title: "Senior Product Manager",
    department: "Product & Engineering",
    location: "San Francisco, CA",
    avatar: undefined,
    skills: [
      { name: "Strategic Stakeholdering", level: 5, endorsements: 24 },
      { name: "Product Strategy", level: 5, endorsements: 18 },
      { name: "Cross-functional Leadership", level: 4, endorsements: 15 },
    ],
    stats: {
      totalMentees: 12,
      completedSessions: 48,
      averageRating: 4.9,
      responseTime: "< 4 hours",
    },
    availability: {
      timezone: "PST",
      preferredDays: ["Tuesday", "Wednesday", "Thursday"],
      capacity: 3,
      currentMentees: 2,
    },
    bio: "I've spent 8+ years building products that delight users and drive business results. I'm passionate about helping others develop stakeholder management skills and strategic thinking.",
    matchScore: 95,
  },
  {
    id: 2,
    name: "Marcus Rodriguez",
    title: "Director of Analytics",
    department: "Data & Insights",
    location: "Austin, TX",
    avatar: undefined,
    skills: [
      { name: "Data-led Storytelling", level: 5, endorsements: 31 },
      { name: "Strategic Analytics", level: 5, endorsements: 22 },
      { name: "Executive Communication", level: 4, endorsements: 19 },
    ],
    stats: {
      totalMentees: 8,
      completedSessions: 32,
      averageRating: 4.8,
      responseTime: "< 6 hours",
    },
    availability: {
      timezone: "CST",
      preferredDays: ["Monday", "Tuesday", "Friday"],
      capacity: 3,
      currentMentees: 2,
    },
    bio: "I help teams turn complex data into compelling narratives that drive decision-making. My focus is on practical frameworks for communicating insights to stakeholders at all levels.",
    matchScore: 87,
  },
  {
    id: 3,
    name: "Jennifer Walsh",
    title: "VP of Operations",
    department: "Operations",
    location: "New York, NY",
    avatar: undefined,
    skills: [
      { name: "Cross-functional Collaboration", level: 5, endorsements: 28 },
      { name: "Process Optimization", level: 5, endorsements: 21 },
      { name: "Team Leadership", level: 4, endorsements: 16 },
    ],
    stats: {
      totalMentees: 15,
      completedSessions: 72,
      averageRating: 4.7,
      responseTime: "< 2 hours",
    },
    availability: {
      timezone: "EST",
      preferredDays: ["Wednesday", "Thursday", "Friday"],
      capacity: 5,
      currentMentees: 3,
    },
    bio: "With 12+ years in operations, I specialize in building bridges between teams and creating efficient collaborative processes. I love helping others navigate complex organizational dynamics.",
    matchScore: 78,
  },
];

export function MatchingInterface({ skillId, skillName, onMatchComplete }: MatchingInterfaceProps) {
  const [isMatching, setIsMatching] = useState(true);
  const [matches, setMatches] = useState<typeof mockMentors>([]);
  const [selectedMentor, setSelectedMentor] = useState<number | null>(null);
  const [matchingProgress, setMatchingProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate AI matching process
    const matchingInterval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 100) {
          setIsMatching(false);
          setMatches(mockMentors.filter(m => 
            m.skills.some(skill => 
              skill.name.toLowerCase().includes(skillName.toLowerCase().split(' ')[0])
            )
          ));
          clearInterval(matchingInterval);
          return 100;
        }
        return prev + Math.random() * 25;
      });
    }, 500);

    return () => clearInterval(matchingInterval);
  }, [skillName]);

  const handleConnect = (mentorId: number) => {
    const mentor = matches.find(m => m.id === mentorId);
    if (!mentor) return;

    toast({
      title: "Mentoring request sent!",
      description: `Your request has been sent to ${mentor.name}. They typically respond within ${mentor.stats.responseTime}.`,
    });
    
    onMatchComplete?.(mentorId);
  };

  const handleMessage = (mentorId: number) => {
    const mentor = matches.find(m => m.id === mentorId);
    if (!mentor) return;

    toast({
      title: "Message sent",
      description: `Opening conversation with ${mentor.name}...`,
    });
  };

  if (isMatching) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h3 className="text-xl font-semibold">Finding your perfect mentor match</h3>
            <p className="text-muted-foreground">
              Our AI is analyzing mentor expertise, availability, and compatibility for <strong>{skillName}</strong>
            </p>
          </div>
          
          <div className="space-y-3 max-w-md mx-auto">
            <Progress value={matchingProgress} className="w-full" />
            <div className="text-sm text-muted-foreground">
              {matchingProgress < 30 && "Scanning mentor skill profiles..."}
              {matchingProgress >= 30 && matchingProgress < 60 && "Analyzing availability and capacity..."}
              {matchingProgress >= 60 && matchingProgress < 90 && "Calculating compatibility scores..."}
              {matchingProgress >= 90 && "Finalizing top matches..."}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>47 mentors analyzed</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>12 skill dimensions</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Availability checked</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matching Results Header */}
      <Card className="p-6 bg-gradient-subtle">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-success" />
          <h2 className="text-xl font-semibold">Perfect Matches Found!</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          We found {matches.length} highly compatible mentors for <strong>{skillName}</strong> based on expertise, availability, and learning style compatibility.
        </p>
        
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full" />
            <span>All mentors have 4.5+ ratings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>Available within 7 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <span>Proven track record</span>
          </div>
        </div>
      </Card>

      {/* Matching Results */}
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          </TabsList>
          
          <div className="text-sm text-muted-foreground">
            Showing {matches.length} matches
          </div>
        </div>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches
              .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
              .map(mentor => (
                <MentorProfile
                  key={mentor.id}
                  mentor={mentor}
                  onConnect={handleConnect}
                  onMessage={handleMessage}
                  variant="card"
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {matches
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
            .map(mentor => (
              <Card key={mentor.id} className="p-6">
                <MentorProfile
                  mentor={mentor}
                  onConnect={handleConnect}
                  onMessage={handleMessage}
                  variant="detailed"
                />
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="p-4 bg-muted/50">
        <div className="text-sm">
          <p className="font-medium mb-2">Need help choosing?</p>
          <p className="text-muted-foreground">
            Consider match score, availability, and mentor style. You can also message mentors 
            before sending a formal request to ensure good alignment.
          </p>
        </div>
      </Card>
    </div>
  );
}