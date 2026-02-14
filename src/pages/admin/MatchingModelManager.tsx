import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Settings2,
  Copy,
  Archive,
  CheckCircle,
  Star,
  Loader2,
  Scale,
  Filter,
} from 'lucide-react';
import type { MatchingModel, MatchingWeights, MatchingFilters } from '@/types/matching';
import {
  getMatchingModels,
  createMatchingModel,
  updateMatchingModel,
  createNewVersion,
  archiveMatchingModel,
  activateMatchingModel,
} from '@/lib/matchingModelService';
import { PageHeader } from '@/components/admin/PageHeader';

export default function MatchingModelManager() {
  const { toast } = useToast();
  const [models, setModels] = useState<MatchingModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<MatchingModel | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for creating new model
  const [newModelName, setNewModelName] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');

  // Edit state
  const [editWeights, setEditWeights] = useState<MatchingWeights | null>(null);
  const [editFilters, setEditFilters] = useState<MatchingFilters | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const data = await getMatchingModels();
      setModels(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load matching models',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim()) {
      toast({
        title: 'Error',
        description: 'Model name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMatchingModel({
        name: newModelName,
        description: newModelDescription,
      });
      toast({
        title: 'Success',
        description: 'Matching model created',
      });
      setIsCreateDialogOpen(false);
      setNewModelName('');
      setNewModelDescription('');
      loadModels();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create matching model',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNewVersion = async (model: MatchingModel) => {
    try {
      await createNewVersion(model.id);
      toast({
        title: 'Success',
        description: `Created version ${model.version + 1} of ${model.name}`,
      });
      loadModels();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create new version',
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async (model: MatchingModel) => {
    try {
      await activateMatchingModel(model.id);
      toast({
        title: 'Success',
        description: `${model.name} v${model.version} is now active`,
      });
      loadModels();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to activate model',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (model: MatchingModel) => {
    try {
      await archiveMatchingModel(model.id);
      toast({
        title: 'Success',
        description: `${model.name} v${model.version} has been archived`,
      });
      loadModels();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive model',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (model: MatchingModel) => {
    try {
      await updateMatchingModel(model.id, { is_default: true });
      toast({
        title: 'Success',
        description: `${model.name} v${model.version} is now the default`,
      });
      loadModels();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set as default',
        variant: 'destructive',
      });
    }
  };

  const handleEditModel = (model: MatchingModel) => {
    setSelectedModel(model);
    setEditWeights(model.weights);
    setEditFilters(model.filters);
    setIsEditDialogOpen(true);
  };

  const handleSaveWeights = async () => {
    if (!selectedModel || !editWeights || !editFilters) return;

    try {
      await updateMatchingModel(selectedModel.id, {
        weights: editWeights,
        filters: editFilters,
      });
      toast({
        title: 'Success',
        description: 'Model settings updated',
      });
      setIsEditDialogOpen(false);
      loadModels();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update model settings',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string, isDefault: boolean) => {
    if (isDefault) {
      return <Badge className="bg-yellow-500">Default</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matching Models"
        description="Configure matching algorithms with versioned criteria and rules"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Model
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Matching Model</DialogTitle>
                <DialogDescription>
                  Create a new matching model with default weights and filters
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Model Name</Label>
                  <Input
                    id="name"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="e.g., Q2 2026 Matching Model"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newModelDescription}
                    onChange={(e) => setNewModelDescription(e.target.value)}
                    placeholder="Describe the purpose of this matching model..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateModel}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Models</CardTitle>
          <CardDescription>
            Manage matching models and their versions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No matching models yet</p>
              <p className="text-sm">Create your first model to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>v{model.version}</TableCell>
                    <TableCell>{getStatusBadge(model.status, model.is_default)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {model.description || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(model.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditModel(model)}
                          title="Edit weights and filters"
                        >
                          <Scale className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateNewVersion(model)}
                          title="Create new version"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {model.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(model)}
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {model.status === 'active' && !model.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(model)}
                            title="Set as default"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        {model.status !== 'archived' && !model.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(model)}
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Weights/Filters Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Model Settings: {selectedModel?.name} v{selectedModel?.version}
            </DialogTitle>
            <DialogDescription>
              Configure scoring weights and matching filters
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="weights" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weights">
                <Scale className="w-4 h-4 mr-2" />
                Weights
              </TabsTrigger>
              <TabsTrigger value="filters">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weights" className="space-y-4 mt-4">
              {editWeights && (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Capability Match</span>
                      <span className="font-medium">{editWeights.capability}%</span>
                    </div>
                    <Slider
                      value={[editWeights.capability]}
                      onValueChange={([v]) =>
                        setEditWeights({ ...editWeights, capability: v })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Semantic Similarity</span>
                      <span className="font-medium">{editWeights.semantic}%</span>
                    </div>
                    <Slider
                      value={[editWeights.semantic]}
                      onValueChange={([v]) =>
                        setEditWeights({ ...editWeights, semantic: v })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Domain Detail Match</span>
                      <span className="font-medium">{editWeights.domain}%</span>
                    </div>
                    <Slider
                      value={[editWeights.domain]}
                      onValueChange={([v]) =>
                        setEditWeights({ ...editWeights, domain: v })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Seniority Fit</span>
                      <span className="font-medium">{editWeights.seniority}%</span>
                    </div>
                    <Slider
                      value={[editWeights.seniority]}
                      onValueChange={([v]) =>
                        setEditWeights({ ...editWeights, seniority: v })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Timezone Bonus</span>
                      <span className="font-medium">{editWeights.timezone}%</span>
                    </div>
                    <Slider
                      value={[editWeights.timezone]}
                      onValueChange={([v]) =>
                        setEditWeights({ ...editWeights, timezone: v })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Capacity Penalty</span>
                      <span className="font-medium">{editWeights.capacity_penalty}%</span>
                    </div>
                    <Slider
                      value={[editWeights.capacity_penalty]}
                      onValueChange={([v]) =>
                        setEditWeights({ ...editWeights, capacity_penalty: v })
                      }
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="pt-2 text-sm text-muted-foreground">
                    Total:{' '}
                    {editWeights.capability +
                      editWeights.semantic +
                      editWeights.domain +
                      editWeights.seniority +
                      editWeights.timezone}
                    % (excluding penalty)
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="filters" className="space-y-4 mt-4">
              {editFilters && (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Maximum Timezone Difference</span>
                      <span className="font-medium">
                        {editFilters.max_timezone_difference} hours
                      </span>
                    </div>
                    <Slider
                      value={[editFilters.max_timezone_difference]}
                      onValueChange={([v]) =>
                        setEditFilters({ ...editFilters, max_timezone_difference: v })
                      }
                      min={1}
                      max={12}
                      step={1}
                    />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium">
                        Require Available Capacity
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Only match mentors with remaining capacity
                      </div>
                    </div>
                    <Switch
                      checked={editFilters.require_available_capacity}
                      onCheckedChange={(checked) =>
                        setEditFilters({
                          ...editFilters,
                          require_available_capacity: checked,
                        })
                      }
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWeights}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
