import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, Target, X, Plus } from 'lucide-react'

interface BookingFormProps {
  selectedDate: Date | null
  selectedTimeSlot: string | null
  offeringSkills: string[]
  onSubmit: (data: { learningGoals: string; skillsToDevelop: string[] }) => void
  isSubmitting: boolean
}

export function BookingForm({
  selectedDate,
  selectedTimeSlot,
  offeringSkills,
  onSubmit,
  isSubmitting,
}: BookingFormProps) {
  const [learningGoals, setLearningGoals] = useState('')
  const [skillsToDevelop, setSkillsToDevelop] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')

  const toggleSkill = (skill: string) => {
    if (skillsToDevelop.includes(skill)) {
      setSkillsToDevelop(skillsToDevelop.filter(s => s !== skill))
    } else {
      setSkillsToDevelop([...skillsToDevelop, skill])
    }
  }

  const addCustomSkill = () => {
    if (customSkill.trim() && !skillsToDevelop.includes(customSkill.trim())) {
      setSkillsToDevelop([...skillsToDevelop, customSkill.trim()])
      setCustomSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setSkillsToDevelop(skillsToDevelop.filter(s => s !== skill))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTimeSlot || !learningGoals.trim()) {
      return
    }
    onSubmit({ learningGoals, skillsToDevelop })
  }

  const canSubmit = selectedDate && selectedTimeSlot && learningGoals.trim().length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Summary */}
          {selectedDate && selectedTimeSlot && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{selectedTimeSlot}</span>
              </div>
            </div>
          )}

          {/* Learning Goals */}
          <div className="space-y-2">
            <Label htmlFor="learningGoals">
              What do you hope to learn? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="learningGoals"
              placeholder="Describe your learning goals for this shadowing experience..."
              value={learningGoals}
              onChange={e => setLearningGoals(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">{learningGoals.length} / 500 characters</p>
          </div>

          {/* Skills to Develop */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Skills You Want to Develop
            </Label>

            {/* Suggested Skills from Offering */}
            {offeringSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Select from offering skills:</p>
                <div className="flex flex-wrap gap-2">
                  {offeringSkills.map(skill => (
                    <Badge
                      key={skill}
                      variant={skillsToDevelop.includes(skill) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                      {skillsToDevelop.includes(skill) && ' ✓'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Skill */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Or add your own:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a custom skill"
                  value={customSkill}
                  onChange={e => setCustomSkill(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomSkill()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCustomSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Selected Skills */}
            {skillsToDevelop.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Your selected skills:</p>
                <div className="flex flex-wrap gap-2">
                  {skillsToDevelop.map(skill => (
                    <Badge key={skill} variant="secondary" className="gap-2">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </Button>

          {!canSubmit && (
            <p className="text-xs text-center text-muted-foreground">
              Please select a date, time slot, and enter your learning goals to continue
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
