import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Clock } from "lucide-react";

interface Skill {
  id: number;
  name: string;
  category: string;
  description?: string;
  currentLevel: number;
  targetLevel: number;
  mentorsAvailable: number;
  averageSessionCount: number;
  demandLevel: 'high' | 'medium' | 'low';
}

interface SkillCardProps {
  skill: Skill;
  onSelect?: (skill: Skill) => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export function SkillCard({ skill, onSelect, variant = 'default' }: SkillCardProps) {
  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSkillLevelColor = (level: number) => {
    const colors = [
      'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'
    ];
    return colors[level - 1] || 'bg-gray-300';
  };

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onSelect?.(skill)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-xs">{skill.category}</Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {skill.mentorsAvailable}
            </div>
          </div>
          <CardTitle className="text-sm leading-tight">{skill.name}</CardTitle>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < skill.currentLevel ? getSkillLevelColor(skill.currentLevel) : 'bg-muted'
                  }`} 
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">L{skill.currentLevel}</span>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{skill.category}</Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getDemandColor(skill.demandLevel)}`}
                >
                  {skill.demandLevel} demand
                </Badge>
              </div>
              <CardTitle className="text-lg">{skill.name}</CardTitle>
              {skill.description && (
                <CardDescription>{skill.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current vs Target Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Level</span>
              <span className="font-medium">Level {skill.currentLevel}/5</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 h-2 rounded-sm ${
                    i < skill.currentLevel ? getSkillLevelColor(skill.currentLevel) : 'bg-muted'
                  }`} 
                />
              ))}
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target Level</span>
              <span className="font-medium text-primary">Level {skill.targetLevel}/5</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 h-2 rounded-sm ${
                    i < skill.targetLevel ? 'bg-primary' : 'bg-muted'
                  }`} 
                />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {skill.mentorsAvailable} mentors
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                ~{skill.averageSessionCount} sessions
              </span>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={() => onSelect?.(skill)}
          >
            Start Learning Journey
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">{skill.category}</Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-3 h-3" />
            {skill.mentorsAvailable}
            <TrendingUp className="w-3 h-3 ml-2" />
            {skill.demandLevel}
          </div>
        </div>
        <CardTitle className="text-base leading-tight">{skill.name}</CardTitle>
        
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Level</span>
            <span className="font-medium">Level {skill.currentLevel}/5</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 h-2 rounded-sm ${
                  i < skill.currentLevel ? getSkillLevelColor(skill.currentLevel) : 'bg-muted'
                }`} 
              />
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Button 
          size="sm" 
          className="w-full" 
          onClick={() => onSelect?.(skill)}
        >
          Find Mentor
        </Button>
      </CardContent>
    </Card>
  );
}