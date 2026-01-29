import React, { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { importMentoringData } from "@/lib/dataParser";
import { ImportResult, MenteeData, MentorData } from "@/types/mentoring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, UserCheck, AlertTriangle, CheckCircle, Upload, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataImportProps {
  onDataImported?: (data: ImportResult) => void;
  // Controlled props to survive Dialog remounts
  importResult?: ImportResult | null;
  onImportResultChange?: (result: ImportResult | null) => void;
}

export function DataImport({ onDataImported, importResult: controlledImportResult, onImportResultChange }: DataImportProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalImportResult, setInternalImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use controlled state if provided, otherwise use internal state
  const importResult = controlledImportResult !== undefined ? controlledImportResult : internalImportResult;
  const setImportResult = onImportResultChange || setInternalImportResult;

  React.useEffect(() => {
    console.log('DataImport useEffect - importResult changed:', importResult);
  }, [importResult]);

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setError(null);
    setIsProcessing(true);

    try {
      console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
      const result = await importMentoringData(file);
      console.log('Import result:', result);
      console.log('Setting importResult state...');
      setImportResult(result);
      console.log('importResult state set');

      if (result.errors.length > 0) {
        setError(result.errors.join('; '));
        toast({
          variant: "destructive",
          title: "Import failed",
          description: result.errors[0],
        });
      } else if (result.mentees.length === 0 && result.mentors.length === 0) {
        setError("No mentor or mentee data found in file. Please check your CSV format.");
        toast({
          variant: "destructive",
          title: "No data found",
          description: "The file doesn't contain valid mentor or mentee data.",
        });
      } else {
        toast({
          title: "File processed successfully",
          description: `Found ${result.mentees.length} mentees and ${result.mentors.length} mentors. Review the data below and click 'Confirm Import' to add them to the cohort.`,
        });
        // Don't call onDataImported here - wait for user confirmation
      }
    } catch (err) {
      console.error('Import error:', err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Import failed",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
    setImportResult(null);
    setError(null);
  };

  const handleConfirmImport = () => {
    if (importResult) {
      onDataImported?.(importResult);
      toast({
        title: "Data imported successfully!",
        description: `Added ${importResult.mentees.length} mentees and ${importResult.mentors.length} mentors to the cohort.`,
      });
      // Clear the import state after successful confirmation
      setImportResult(null);
      setUploadedFile(null);
      setError(null);
    }
  };

  const MenteeTable = ({ mentees }: { mentees: MenteeData[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name/ID</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Experience</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Topics to Learn</TableHead>
          <TableHead>Meeting Frequency</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mentees.map((mentee) => (
          <TableRow key={mentee.id}>
            <TableCell className="font-medium">{mentee.id}</TableCell>
            <TableCell>{mentee.role}</TableCell>
            <TableCell>{mentee.experience_years}</TableCell>
            <TableCell className="text-sm">{mentee.location_timezone}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {mentee.topics_to_learn.slice(0, 2).map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic.split(' ')[0]}...
                  </Badge>
                ))}
                {mentee.topics_to_learn.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{mentee.topics_to_learn.length - 2}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm">{mentee.meeting_frequency}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const MentorTable = ({ mentors }: { mentors: MentorData[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name/ID</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Experience</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Topics to Mentor</TableHead>
          <TableHead>Capacity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mentors.map((mentor) => (
          <TableRow key={mentor.id}>
            <TableCell className="font-medium">{mentor.id}</TableCell>
            <TableCell>{mentor.role}</TableCell>
            <TableCell>{mentor.experience_years}</TableCell>
            <TableCell className="text-sm">{mentor.location_timezone}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {mentor.topics_to_mentor.slice(0, 2).map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic.split(' ')[0]}...
                  </Badge>
                ))}
                {mentor.topics_to_mentor.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{mentor.topics_to_mentor.length - 2}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={mentor.capacity_remaining > 1 ? "default" : "destructive"}>
                {mentor.capacity_remaining}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  console.log('DataImport render - importResult:', importResult ? 'EXISTS' : 'NULL', importResult);

  const hasValidData = importResult && (importResult.mentees.length > 0 || importResult.mentors.length > 0);
  console.log('hasValidData:', hasValidData);

  return (
    <div className="space-y-6">
      {!hasValidData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Import Mentor & Mentee Data
            </CardTitle>
            <CardDescription>
              Upload your CSV files containing mentor and mentee information to begin the matching process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              uploadedFile={uploadedFile}
              isProcessing={isProcessing}
              error={error}
              acceptedFileTypes={[".csv", ".xlsx", ".xls"]}
              maxFileSize={10}
            />
          </CardContent>
        </Card>
      )}

      {hasValidData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Results
            </CardTitle>
            <CardDescription>
              Review the imported data before proceeding with matching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{importResult.mentees.length}</p>
                      <p className="text-sm text-muted-foreground">Mentees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{importResult.mentors.length}</p>
                      <p className="text-sm text-muted-foreground">Mentors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-2xl font-bold">{importResult.warnings.length}</p>
                      <p className="text-sm text-muted-foreground">Warnings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold">{importResult.errors.length}</p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Warnings and Errors */}
            {importResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings:</strong>
                  <ul className="mt-1 list-disc list-inside text-sm">
                    {importResult.warnings.slice(0, 5).map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                    {importResult.warnings.length > 5 && (
                      <li>... and {importResult.warnings.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errors:</strong>
                  <ul className="mt-1 list-disc list-inside text-sm">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Data Preview */}
            <Tabs defaultValue="mentees" className="w-full">
              <TabsList>
                <TabsTrigger value="mentees">
                  Mentees ({importResult.mentees.length})
                </TabsTrigger>
                <TabsTrigger value="mentors">
                  Mentors ({importResult.mentors.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mentees">
                <ScrollArea className="h-[300px]">
                  <MenteeTable mentees={importResult.mentees} />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="mentors">
                <ScrollArea className="h-[300px]">
                  <MentorTable mentors={importResult.mentors} />
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleFileRemove}>
                Start Over
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={importResult.errors.length > 0}
              >
                Confirm Import & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}