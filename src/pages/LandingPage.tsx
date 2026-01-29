import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, Target, TrendingUp, Calendar } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

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
            <h1 className="text-xl font-bold text-foreground">SkillPoint</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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


        </div>
      </main>
    </div>
  );
};

export default LandingPage;