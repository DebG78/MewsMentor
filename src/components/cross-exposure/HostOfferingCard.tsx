import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Calendar, Edit, Trash2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface HostOfferingCardProps {
  offering: {
    id: string
    title: string
    description: string
    skills_offered: string[]
    is_active: boolean
    max_concurrent_shadows: number
    slots_per_week: number
  }
  onUpdate: () => void
  onCalendarClick?: (offeringId: string) => void
}

export function HostOfferingCard({ offering, onUpdate, onCalendarClick }: HostOfferingCardProps) {
  const { toast } = useToast()
  const [isActive, setIsActive] = useState(offering.is_active)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggleActive = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('host_offerings')
        .update({ is_active: checked })
        .eq('id', offering.id)

      if (error) throw error

      setIsActive(checked)
      toast({
        title: checked ? 'Offering Activated' : 'Offering Deactivated',
        description: checked
          ? 'Your offering is now visible to shadows'
          : 'Your offering has been hidden from shadows',
      })
      onUpdate()
    } catch (error) {
      console.error('Error updating offering:', error)
      toast({
        title: 'Error',
        description: 'Failed to update offering status',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsUpdating(true)
    try {
      // First delete availability blocks
      const { error: availabilityError } = await supabase
        .from('host_availability_blocks')
        .delete()
        .eq('host_offering_id', offering.id)

      if (availabilityError) throw availabilityError

      // Then delete the offering
      const { error: offeringError } = await supabase
        .from('host_offerings')
        .delete()
        .eq('id', offering.id)

      if (offeringError) throw offeringError

      toast({
        title: 'Offering Deleted',
        description: 'Your host offering has been deleted',
      })
      onUpdate()
    } catch (error) {
      console.error('Error deleting offering:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete offering',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{offering.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={handleToggleActive} disabled={isUpdating} />
              <Label className="text-sm">{isActive ? 'Active' : 'Inactive'}</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{offering.description}</p>

          <div className="flex flex-wrap gap-2">
            {offering.skills_offered.map((skill, idx) => (
              <Badge key={idx} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Max {offering.max_concurrent_shadows} shadows</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{offering.slots_per_week} slots/week</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" disabled>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            {onCalendarClick && (
              <Button variant="outline" size="sm" onClick={() => onCalendarClick(offering.id)}>
                <Calendar className="w-4 h-4 mr-2" />
                Manage Calendar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isUpdating}
              className="ml-auto text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Host Offering?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{offering.title}" and all associated availability blocks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
