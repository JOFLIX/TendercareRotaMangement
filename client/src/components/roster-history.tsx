import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Check, Trash2, History } from "lucide-react";
import type { RosterSummary } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RosterHistoryProps {
  onRosterSelect: (rosterId: string) => void;
  selectedRosterId?: string;
}

export function RosterHistory({ onRosterSelect, selectedRosterId }: RosterHistoryProps) {
  const { toast } = useToast();

  const { data: rosters, isLoading } = useQuery<RosterSummary[]>({
    queryKey: ["/api/rosters"],
  });

  const activateMutation = useMutation({
    mutationFn: async (rosterId: string) => {
      const response = await apiRequest("POST", `/api/roster/${rosterId}/activate`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rosters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      toast({
        title: "Roster Activated",
        description: "This roster is now the active version.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate roster.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (rosterId: string) => {
      const response = await apiRequest("DELETE", `/api/roster/${rosterId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rosters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      toast({
        title: "Roster Deleted",
        description: "The roster has been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete roster.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!rosters || rosters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No saved rosters yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate a roster to get started
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-2">
      <div className="space-y-2">
        {rosters.map((roster) => (
          <div
            key={roster.id}
            data-testid={`roster-history-item-${roster.id}`}
            className={`
              group p-3 rounded-lg border cursor-pointer transition-colors
              ${roster.isActive ? "border-primary bg-primary/5" : "border-border hover-elevate"}
              ${selectedRosterId === roster.id ? "ring-2 ring-primary" : ""}
            `}
            onClick={() => onRosterSelect(roster.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {roster.name}
                  </span>
                  {roster.isActive && (
                    <Badge variant="default" className="text-xs shrink-0">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(roster.startDate), "MMM d")} - {format(new Date(roster.endDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {roster.shiftCount} shifts · v{roster.version}
                </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!roster.isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    data-testid={`button-activate-roster-${roster.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      activateMutation.mutate(roster.id);
                    }}
                    disabled={activateMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      data-testid={`button-delete-roster-${roster.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Roster</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this roster? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(roster.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
