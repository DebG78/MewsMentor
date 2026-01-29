import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SkillProgress {
  skill: {
    name: string
  }
  proficiency_level: 'learning' | 'practicing' | 'proficient' | 'expert'
  evidence_count: number
}

interface SkillsProgressWidgetProps {
  skills: SkillProgress[]
}

const PROFICIENCY_COLORS: Record<string, string> = {
  learning: 'bg-blue-100 text-blue-800',
  practicing: 'bg-yellow-100 text-yellow-800',
  proficient: 'bg-green-100 text-green-800',
  expert: 'bg-purple-100 text-purple-800',
}

const PROFICIENCY_PROGRESS: Record<string, number> = {
  learning: 25,
  practicing: 50,
  proficient: 75,
  expert: 100,
}

export function SkillsProgressWidget({ skills }: SkillsProgressWidgetProps) {
  const navigate = useNavigate()

  if (skills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skills Development</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No skills tracked yet.</p>
            <p className="text-xs mt-1">Skills will appear as you log growth events.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Skills Development</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {skills.slice(0, 5).map((skillProgress, idx) => {
          const colorClass = PROFICIENCY_COLORS[skillProgress.proficiency_level]
          const progressValue = PROFICIENCY_PROGRESS[skillProgress.proficiency_level]

          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{skillProgress.skill.name}</span>
                <Badge variant="secondary" className={`${colorClass} text-xs`}>
                  {skillProgress.proficiency_level}
                </Badge>
              </div>
              <div className="space-y-1">
                <Progress value={progressValue} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {skillProgress.evidence_count} evidence{skillProgress.evidence_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={() => navigate('/skills')}
        >
          View Full Portfolio <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}