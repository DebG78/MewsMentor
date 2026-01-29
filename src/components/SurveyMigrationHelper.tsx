import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, Database, HardDrive } from "lucide-react";
import { migrateFromLocalStorage, getAllSurveyTemplates } from "@/lib/surveyTemplateSupabaseService";

export const SurveyMigrationHelper = () => {
  const { toast } = useToast();
  const [hasLocalData, setHasLocalData] = useState(false);
  const [hasSupabaseData, setHasSupabaseData] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    checkDataSources();
  }, []);

  const checkDataSources = async () => {
    setIsChecking(true);

    // Check localStorage
    const localData = localStorage.getItem('survey_templates');
    setHasLocalData(!!localData);

    // Check Supabase
    try {
      const supabaseTemplates = await getAllSurveyTemplates();
      setHasSupabaseData(supabaseTemplates.length > 0);
    } catch (error) {
      console.error('Error checking Supabase data:', error);
      setHasSupabaseData(false);
    }

    setIsChecking(false);
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateFromLocalStorage();
      await checkDataSources(); // Refresh status

      toast({
        title: result.success ? "Migration Successful" : "Migration Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Migration Error",
        description: "Failed to migrate survey templates",
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Checking data sources...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no local data and we have Supabase data, everything is good
  if (!hasLocalData && hasSupabaseData) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          ✅ Survey templates are successfully stored in Supabase database. No migration needed.
        </AlertDescription>
      </Alert>
    );
  }

  // If we have local data but no Supabase data, show migration option
  if (hasLocalData && !hasSupabaseData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Migration Required
          </CardTitle>
          <CardDescription>
            Survey templates are currently stored locally. Migrate them to Supabase for production use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <HardDrive className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Local Storage</p>
                <p className="text-xs text-muted-foreground">Has survey data</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Database className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Supabase Database</p>
                <p className="text-xs text-muted-foreground">Ready for migration</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleMigration}
            disabled={isMigrating}
            className="w-full"
          >
            {isMigrating ? "Migrating..." : "Migrate to Supabase"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If we have both local and Supabase data
  if (hasLocalData && hasSupabaseData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          ⚠️ Survey templates exist in both local storage and Supabase. Using Supabase data.
          You can safely clear local storage data.
        </AlertDescription>
      </Alert>
    );
  }

  // If no data anywhere, show initialization message
  return (
    <Alert>
      <Database className="h-4 w-4" />
      <AlertDescription>
        🎯 Survey templates will be automatically created in Supabase when you first access them.
      </AlertDescription>
    </Alert>
  );
};