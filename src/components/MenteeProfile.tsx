import React from "react";
import { MenteeData } from "@/types/mentoring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  MapPin,
  Clock,
  Target,
  MessageCircle,
  Globe,
  Building,
  BookOpen,
  Edit,
} from "lucide-react";
import { toDisplayName } from '@/lib/displayName';

interface MenteeProfileProps {
  mentee: MenteeData;
  onEdit?: () => void;
  variant?: "default" | "detailed" | "compact";
}

export function MenteeProfile({ mentee, onEdit, variant = "default" }: MenteeProfileProps) {
  const formatTimezone = (tz: string) => {
    return tz.replace(/_/g, ' ').replace(/\//g, ' / ');
  };

  if (variant === "compact") {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{toDisplayName(mentee.name)}</h3>
            <p className="text-sm text-muted-foreground">{mentee.role}</p>
          </div>
          <Badge variant="outline">{mentee.experience_level}</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{toDisplayName(mentee.name)}</CardTitle>
              <CardDescription className="text-lg">{mentee.role}</CardDescription>
              {mentee.company && (
                <div className="flex items-center gap-1 mt-1">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{mentee.company}</span>
                </div>
              )}
            </div>
          </div>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{mentee.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{formatTimezone(mentee.timezone)}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Experience: {mentee.experience_level}</span>
          </div>
          {mentee.manager && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Manager: {mentee.manager}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Description */}
        {mentee.description && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              About
            </h4>
            <p className="text-sm leading-relaxed">{mentee.description}</p>
          </div>
        )}

        <Separator />

        {/* Goals */}
        {mentee.goals && mentee.goals.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Learning Goals
            </h4>
            <div className="flex flex-wrap gap-2">
              {mentee.goals.map((goal, index) => (
                <Badge key={index} variant="outline">
                  {goal}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Topics */}
        {mentee.topics && mentee.topics.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Topics of Interest</h4>
            <div className="flex flex-wrap gap-2">
              {mentee.topics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Industries */}
        {mentee.industries && mentee.industries.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Industry Background</h4>
            <div className="flex flex-wrap gap-2">
              {mentee.industries.map((industry, index) => (
                <Badge key={index} variant="secondary">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {mentee.languages && mentee.languages.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Languages
            </h4>
            <div className="flex flex-wrap gap-2">
              {mentee.languages.map((language, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        {mentee.availability && (
          <div>
            <h4 className="font-semibold mb-2">Availability</h4>
            <p className="text-sm text-muted-foreground">{mentee.availability}</p>
          </div>
        )}

        {variant === "detailed" && mentee.additional_info && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Additional Information</h4>
              <p className="text-sm leading-relaxed">{mentee.additional_info}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}