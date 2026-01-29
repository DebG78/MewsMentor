import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ProgramParticipation {
  id: string
  role_in_program: string
  status: string
  cohort_name: string
  program_type: string
}

interface ProgramsQuickAccessCardProps {
  programs: ProgramParticipation[]
}

const ROLE_COLORS: Record<string, string> = {
  mentee: 'bg-blue-100 text-blue-800',
  mentor: 'bg-green-100 text-green-800',
  host: 'bg-purple-100 text-purple-800',
  shadow: 'bg-orange-100 text-orange-800',
}

const PROGRAM_ICONS: Record<string, any> = {
  mentoring: Users,
  'cross-exposure': Eye,
}

export function ProgramsQuickAccessCard({ programs }: ProgramsQuickAccessCardProps) {
  const navigate = useNavigate()

  if (programs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Programs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">You're not enrolled in any programs yet.</p>
            <Button variant="link" className="mt-2" onClick={() => navigate('/programs')}>
              Browse Programs
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My Programs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {programs.map((program) => {
          const Icon = PROGRAM_ICONS[program.program_type] || Users
          const roleColor = ROLE_COLORS[program.role_in_program] || 'bg-gray-100 text-gray-800'

          return (
            <div
              key={program.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/programs/${program.program_type}`)}
            >
              <div className="flex items-center gap-3 flex-1">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{program.cohort_name}</p>
                  <Badge variant="secondary" className={`${roleColor} text-xs mt-1`}>
                    {program.role_in_program}
                  </Badge>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={() => navigate('/programs')}
        >
          View All Programs
        </Button>
      </CardContent>
    </Card>
  )
}