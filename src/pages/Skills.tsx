import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SkillCard } from "@/components/SkillCard";
import { MatchingInterface } from "@/components/MatchingInterface";
import { MenteeProfile } from "@/components/MenteeProfile";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { Search, Filter, TrendingUp, Users, Target, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MenteeData } from "@/types/mentoring";

// Clean slate - no mock data

const categories = ["All", "Leadership", "Analytics", "Communication", "Management", "Finance", "Product"];

const Skills = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [showMatching, setShowMatching] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock user profile data
  const [userProfile, setUserProfile] = useState<MenteeData>({
    name: "Alex Johnson",
    role: "Product Manager",
    company: "TechCorp",
    location: "San Francisco, CA",
    timezone: "America/Los_Angeles",
    experience_level: "Mid-level",
    description: "Product manager looking to develop leadership and strategic thinking skills. Passionate about user experience and data-driven decision making.",
    topics: ["Product Strategy", "Leadership", "Data Analysis", "User Experience"],
    goals: ["Improve delegation skills", "Learn strategic planning", "Enhance team communication"],
    industries: ["Technology", "SaaS", "E-commerce"],
    languages: ["English", "Spanish"],
    availability: "Weekday evenings (6-8 PM PST), Saturday mornings",
    additional_info: "Open to remote or in-person mentoring sessions. Particularly interested in learning from senior leaders in product management."
  });

  const filteredSkills: any[] = []; // Empty - no skills data yet

  const handleSkillSelect = (skill: any) => {
    // Will be implemented when skills data is available
  };

  const handleMatchComplete = (mentorId: number) => {
    toast({
      title: "Mentoring request sent!",
      description: "You'll receive a response within 24 hours.",
    });
    setShowMatching(false);
    setSelectedSkill(null);
  };

  const handleProfileSave = (updatedProfile: MenteeData) => {
    setUserProfile(updatedProfile);
    setEditingProfile(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully!",
    });
  };

  if (showMatching && selectedSkill) {
    const skill = null; // No skills data available
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setShowMatching(false)}
          >
            ← Back to Skills
          </Button>
          <div>
            <h1 className="text-xl font-bold">Finding Mentors</h1>
            <p className="text-sm text-muted-foreground">{skill?.name}</p>
          </div>
        </div>

        <MatchingInterface
          skillId={selectedSkill}
          skillName={skill?.name || ""}
          onMatchComplete={handleMatchComplete}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Discover Your Next Growth Area</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse our curated skills catalog and find expert mentors to accelerate your professional development
            </p>
          </div>

          {/* Search and Filter */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search skills, categories, or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* Skills Overview Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{filteredSkills.length}</div>
              <div className="text-sm text-muted-foreground">Available Skills</div>
            </Card>
            <Card className="p-4 text-center">
              <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
              <div className="text-2xl font-bold">47</div>
              <div className="text-sm text-muted-foreground">Active Mentors</div>
            </Card>
            <Card className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold">92%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </Card>
            <Card className="p-4 text-center">
              <Target className="w-8 h-8 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold">4.8</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </Card>
          </div>

          {/* Skills Grid */}
          <Tabs defaultValue="grid" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="list">Detailed List</TabsTrigger>
              </TabsList>
              
              <div className="text-sm text-muted-foreground">
                {filteredSkills.length} skills found
              </div>
            </div>

            <TabsContent value="grid" className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onSelect={handleSkillSelect}
                    variant="default"
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onSelect={handleSkillSelect}
                    variant="detailed"
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* No Results */}
          {filteredSkills.length === 0 && (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No skills found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or category filters
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </Card>
          )}
        </div>

      {/* Profile View Dialog */}
      <Dialog open={showProfile && !editingProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>
              View and manage your mentee profile information
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <MenteeProfile
              mentee={userProfile}
              variant="detailed"
              onEdit={() => {
                setEditingProfile(true);
                setShowProfile(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={editingProfile} onOpenChange={() => setEditingProfile(false)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and preferences
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProfileEditForm
              profile={userProfile}
              type="mentee"
              onSave={handleProfileSave}
              onCancel={() => setEditingProfile(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Skills;