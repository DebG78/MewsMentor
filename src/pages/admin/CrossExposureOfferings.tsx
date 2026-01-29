import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Eye, Trash2, CheckCircle, XCircle, Users } from "lucide-react";
import * as crossExposureService from "@/lib/crossExposureService";
import { useToast } from "@/hooks/use-toast";

export default function CrossExposureOfferings() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const data = await crossExposureService.getAllHostOfferings();
      setOfferings(data || []);
    } catch (error) {
      console.error("Error loading offerings:", error);
      toast({
        title: "Error",
        description: "Failed to load host offerings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (offeringId: string, currentStatus: boolean) => {
    try {
      await crossExposureService.updateHostOffering(offeringId, {
        is_active: !currentStatus,
      });
      toast({
        title: "Success",
        description: `Offering ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
      loadOfferings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update offering",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOffering = async (offeringId: string) => {
    if (!confirm("Are you sure you want to delete this offering?")) return;

    try {
      await crossExposureService.deleteHostOffering(offeringId);
      toast({
        title: "Success",
        description: "Offering deleted successfully",
      });
      loadOfferings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete offering",
        variant: "destructive",
      });
    }
  };

  const filteredOfferings = offerings.filter((offering) => {
    const query = searchQuery.toLowerCase();
    return (
      offering.title?.toLowerCase().includes(query) ||
      offering.host_name?.toLowerCase().includes(query) ||
      offering.department?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: offerings.length,
    active: offerings.filter((o) => o.is_active).length,
    inactive: offerings.filter((o) => !o.is_active).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Host Offerings</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Offerings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <XCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offerings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Host Offerings</CardTitle>
              <CardDescription>View and manage all cross-exposure offerings</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search offerings..."
                  className="pl-8 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOfferings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No offerings found matching your search" : "No host offerings yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Host</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Skills Offered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOfferings.map((offering) => (
                  <TableRow key={offering.id}>
                    <TableCell className="font-medium">
                      {offering.host_name || "Unknown"}
                    </TableCell>
                    <TableCell>{offering.title}</TableCell>
                    <TableCell>{offering.department || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {offering.skills_offered?.slice(0, 2).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {offering.skills_offered?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{offering.skills_offered.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={offering.is_active ? "default" : "secondary"}>
                        {offering.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {offering.max_concurrent_shadows || 0} shadows/week
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => window.open(`/cross-exposure/offering/${offering.id}`, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(offering.id, offering.is_active)}
                          >
                            {offering.is_active ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteOffering(offering.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
