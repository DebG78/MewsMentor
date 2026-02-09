import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Loader2, FileSpreadsheet, Users, Star, BarChart3, BookOpen, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  exportMatchList,
  exportParticipantList,
  exportVIPList,
  exportCohortMetrics,
  exportRunbookStages,
  exportMatchingModels,
  exportCohortsSummary,
} from '@/lib/exportService';

export type ExportType =
  | 'matches'
  | 'participants-all'
  | 'participants-mentors'
  | 'participants-mentees'
  | 'vips'
  | 'metrics'
  | 'runbook'
  | 'matching-models'
  | 'cohorts-summary';

interface ExportButtonProps {
  cohortId?: string;
  cohortName?: string;
  availableExports?: ExportType[];
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const exportConfig: Record<ExportType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresCohort: boolean;
}> = {
  'matches': { label: 'Match List', icon: Users, requiresCohort: true },
  'participants-all': { label: 'All Participants', icon: Users, requiresCohort: true },
  'participants-mentors': { label: 'Mentors Only', icon: Users, requiresCohort: true },
  'participants-mentees': { label: 'Mentees Only', icon: Users, requiresCohort: true },
  'vips': { label: 'VIP List', icon: Star, requiresCohort: false },
  'metrics': { label: 'Success Metrics', icon: BarChart3, requiresCohort: true },
  'runbook': { label: 'Runbook Stages', icon: BookOpen, requiresCohort: true },
  'matching-models': { label: 'Matching Models', icon: Settings2, requiresCohort: false },
  'cohorts-summary': { label: 'Cohorts Summary', icon: FileSpreadsheet, requiresCohort: false },
};

export function ExportButton({
  cohortId,
  cohortName,
  availableExports = ['matches', 'participants-all', 'vips', 'metrics', 'runbook'],
  variant = 'outline',
  size = 'default',
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [currentExport, setCurrentExport] = useState<ExportType | null>(null);

  const handleExport = async (type: ExportType) => {
    const config = exportConfig[type];

    if (config.requiresCohort && !cohortId) {
      toast({
        title: 'Error',
        description: 'Please select a cohort first',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setCurrentExport(type);

    try {
      switch (type) {
        case 'matches':
          await exportMatchList(cohortId!, cohortName);
          break;
        case 'participants-all':
          await exportParticipantList(cohortId!, 'all', cohortName);
          break;
        case 'participants-mentors':
          await exportParticipantList(cohortId!, 'mentor', cohortName);
          break;
        case 'participants-mentees':
          await exportParticipantList(cohortId!, 'mentee', cohortName);
          break;
        case 'vips':
          await exportVIPList(cohortId, cohortName);
          break;
        case 'metrics':
          await exportCohortMetrics(cohortId!, cohortName);
          break;
        case 'runbook':
          await exportRunbookStages(cohortId!, cohortName);
          break;
        case 'matching-models':
          await exportMatchingModels();
          break;
        case 'cohorts-summary':
          await exportCohortsSummary();
          break;
      }

      toast({
        title: 'Export Complete',
        description: `${config.label} exported successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setCurrentExport(null);
    }
  };

  // Filter available exports based on cohort requirement
  const filteredExports = availableExports.filter(type => {
    const config = exportConfig[type];
    return !config.requiresCohort || cohortId;
  });

  // Group exports
  const cohortExports = filteredExports.filter(type => exportConfig[type].requiresCohort);
  const globalExports = filteredExports.filter(type => !exportConfig[type].requiresCohort);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {cohortExports.length > 0 && (
          <>
            <DropdownMenuLabel>Cohort Data</DropdownMenuLabel>
            {cohortExports.map(type => {
              const config = exportConfig[type];
              const Icon = config.icon;
              const isCurrentlyExporting = isExporting && currentExport === type;

              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleExport(type)}
                  disabled={isExporting}
                >
                  {isCurrentlyExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 mr-2" />
                  )}
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {globalExports.length > 0 && cohortExports.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {globalExports.length > 0 && (
          <>
            <DropdownMenuLabel>Global Data</DropdownMenuLabel>
            {globalExports.map(type => {
              const config = exportConfig[type];
              const Icon = config.icon;
              const isCurrentlyExporting = isExporting && currentExport === type;

              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleExport(type)}
                  disabled={isExporting}
                >
                  {isCurrentlyExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 mr-2" />
                  )}
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
