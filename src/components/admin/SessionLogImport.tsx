import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, CheckCircle, AlertTriangle, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllCohorts } from '@/lib/supabaseService';
import { parseSessionLogCSV, type SessionLogMatch, type SessionLogUnmatched } from '@/lib/dataParser';
import { createSession } from '@/lib/sessionService';

interface SessionLogImportProps {
  onImported: () => void;
}

export function SessionLogImport({ onImported }: SessionLogImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Parse results
  const [matched, setMatched] = useState<SessionLogMatch[]>([]);
  const [unmatched, setUnmatched] = useState<SessionLogUnmatched[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  const reset = () => {
    setMatched([]);
    setUnmatched([]);
    setParseErrors([]);
    setParseWarnings([]);
    setHasParsed(false);
    setIsParsing(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setHasParsed(false);

    try {
      const text = await file.text();
      const cohorts = await getAllCohorts();
      const result = parseSessionLogCSV(text, cohorts);

      setMatched(result.matched);
      setUnmatched(result.unmatched);
      setParseErrors(result.errors);
      setParseWarnings(result.warnings);
      setHasParsed(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to parse file',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (matched.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of matched) {
      try {
        await createSession({
          mentor_id: item.pair.mentor_id,
          mentee_id: item.pair.mentee_id,
          cohort_id: item.pair.cohort_id,
          title: 'Session logged via import',
          scheduled_datetime: item.date,
          duration_minutes: item.duration_minutes,
          status: 'completed',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast({
      title: 'Import complete',
      description: `${successCount} sessions imported${failCount > 0 ? `, ${failCount} failed` : ''}`,
    });

    setIsOpen(false);
    reset();
    onImported();
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Upload className="w-4 h-4 mr-2" />
        Import Session Logs
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Session Logs</DialogTitle>
            <DialogDescription>
              Upload a CSV from MS Forms or similar. Expected columns: name, date, duration, rating.
              Names are automatically matched to active mentoring pairs.
            </DialogDescription>
          </DialogHeader>

          {/* File Upload */}
          {!hasParsed && (
            <div className="py-6">
              <label
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {isParsing ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 mb-2 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Parsing and matching names...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileUp className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Columns: name, date, duration (optional), rating (optional)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isParsing}
                />
              </label>
            </div>
          )}

          {/* Parse Results */}
          {hasParsed && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {matched.length} matched
                </Badge>
                {unmatched.length > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {unmatched.length} unmatched
                  </Badge>
                )}
              </div>

              {/* Errors */}
              {parseErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <ul className="list-disc pl-4 text-sm space-y-0.5">
                      {parseErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {parseWarnings.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <details>
                      <summary className="cursor-pointer text-sm font-medium">
                        {parseWarnings.length} warning(s)
                      </summary>
                      <ul className="list-disc pl-4 text-sm mt-2 space-y-0.5">
                        {parseWarnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {/* Matched Sessions */}
              {matched.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sessions to import</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Respondent</TableHead>
                        <TableHead>Matched Pair</TableHead>
                        <TableHead>Cohort</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Duration</TableHead>
                        <TableHead className="text-center">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matched.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.respondent_name}</TableCell>
                          <TableCell className="text-sm">
                            {item.pair.mentee_name} & {item.pair.mentor_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.pair.cohort_name}
                          </TableCell>
                          <TableCell>
                            {new Date(item.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center">{item.duration_minutes}m</TableCell>
                          <TableCell className="text-center">{item.rating}/5</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Unmatched Rows */}
              {unmatched.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-amber-600">
                    Unmatched rows (will be skipped)
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmatched.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.respondent_name}</TableCell>
                          <TableCell>
                            {new Date(item.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {hasParsed && (
              <>
                <Button variant="outline" onClick={reset}>
                  Upload Different File
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={matched.length === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${matched.length} Session${matched.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
