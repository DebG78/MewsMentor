import React from "react";
import { MentorData } from "@/types/mentoring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  MapPin,
  Clock,
  Users,
  MessageCircle,
  Globe,
  Building,
  Award,
  Edit,
} from "lucide-react";
import { toDisplayName } from '@/lib/displayName';

interface MentorProfileProps {
  mentor: MentorData;
  onEdit?: () => void;
  variant?: "default" | "detailed" | "compact";
}

export function MentorProfile({ mentor, onEdit, variant = "default" }: MentorProfileProps) {
  const formatTimezone = (tz: string) => {
    return tz.replace(/_/g, ' ').replace(/\//g, ' / ');
  };

  if (variant === "compact") {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{toDisplayName(mentor.name)}</h3>
            <p className="text-sm text-muted-foreground">{mentor.role}</p>
          </div>
          <Badge variant="secondary">{mentor.capacity} slots</Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{toDisplayName(mentor.name)}</CardTitle>
              <CardDescription className="text-lg">{mentor.role}</CardDescription>
              {mentor.company && (
                <div className="flex items-center gap-1 mt-1">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{mentor.company}</span>
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
            <span className="text-sm">{mentor.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{formatTimezone(mentor.timezone)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Capacity: {mentor.capacity} mentees</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Experience: {mentor.experience_level}</span>
          </div>
        </div>

        <Separator />

        {/* Description */}
        {mentor.description && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              About
            </h4>
            <p className="text-sm leading-relaxed">{mentor.description}</p>
          </div>
        )}

        <Separator />

        {/* Topics */}
        {mentor.topics && mentor.topics.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Mentoring Topics</h4>
            <div className="flex flex-wrap gap-2">
              {mentor.topics.map((topic, index) => (
                <Badge key={index} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Industries */}
        {mentor.industries && mentor.industries.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Industry Experience</h4>
            <div className="flex flex-wrap gap-2">
              {mentor.industries.map((industry, index) => (
                <Badge key={index} variant="secondary">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {mentor.languages && mentor.languages.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Languages
            </h4>
            <div className="flex flex-wrap gap-2">
              {mentor.languages.map((language, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Availability */}
        {mentor.availability && (
          <div>
            <h4 className="font-semibold mb-2">Availability</h4>
            <p className="text-sm text-muted-foreground">{mentor.availability}</p>
          </div>
        )}

        {variant === "detailed" && mentor.additional_info && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Additional Information</h4>
              <p className="text-sm leading-relaxed">{mentor.additional_info}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}