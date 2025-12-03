import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRightLeft, Check, X, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { SwapRequestWithDetails, StaffMember } from "@shared/schema";
import { STAFF_COLORS } from "@shared/schema";

function StaffBadge({ staff }: { staff: StaffMember }) {
  const colors = STAFF_COLORS[staff];
  return (
    <Badge className={`${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      {staff}
    </Badge>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const variants = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const icons = {
    pending: <Clock className="h-3 w-3" />,
    approved: <Check className="h-3 w-3" />,
    rejected: <X className="h-3 w-3" />,
  };

  return (
    <Badge className={variants[status]}>
      <span className="flex items-center gap-1">
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </Badge>
  );
}

function SwapRequestCard({ 
  request, 
  onApprove, 
  onReject,
  isResponding 
}: { 
  request: SwapRequestWithDetails;
  onApprove: () => void;
  onReject: () => void;
  isResponding: boolean;
}) {
  return (
    <Card data-testid={`swap-request-${request.id}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StaffBadge staff={request.fromStaff} />
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              <StaffBadge staff={request.toStaff} />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(request.shiftDate), "EEEE, MMMM d, yyyy")} - {request.shiftType} shift
              </span>
            </div>

            {request.reason && (
              <p className="text-sm text-muted-foreground">
                Reason: {request.reason}
              </p>
            )}

            <div className="text-xs text-muted-foreground">
              Requested {format(new Date(request.createdAt), "MMM d, yyyy 'at' HH:mm")}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={request.status} />
            
            {request.status === "pending" && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                  onClick={onApprove}
                  disabled={isResponding}
                  data-testid={`button-approve-swap-${request.id}`}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  onClick={onReject}
                  disabled={isResponding}
                  data-testid={`button-reject-swap-${request.id}`}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}

            {request.respondedAt && (
              <div className="text-xs text-muted-foreground">
                Responded {format(new Date(request.respondedAt), "MMM d, HH:mm")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SwapRequestsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  const { data: pendingRequests, isLoading: pendingLoading } = useQuery<SwapRequestWithDetails[]>({
    queryKey: ["/api/swap-requests", "pending"],
  });

  const { data: allRequests, isLoading: allLoading } = useQuery<SwapRequestWithDetails[]>({
    queryKey: ["/api/swap-requests"],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "approved" | "rejected" }) => {
      const response = await apiRequest("POST", `/api/swap-requests/${requestId}/respond`, { status });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/swap-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      toast({
        title: status === "approved" ? "Swap Approved" : "Swap Rejected",
        description: status === "approved" 
          ? "The shift assignment has been updated." 
          : "The swap request has been declined.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to respond to swap request.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (requestId: string) => {
    respondMutation.mutate({ requestId, status: "approved" });
  };

  const handleReject = (requestId: string) => {
    respondMutation.mutate({ requestId, status: "rejected" });
  };

  const displayRequests = activeTab === "pending" 
    ? (pendingRequests || []).filter(r => r.status === "pending")
    : (allRequests || []);

  const isLoading = activeTab === "pending" ? pendingLoading : allLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-home">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Shift Swap Requests</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Manage staff shift swap requests
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Swap Requests</CardTitle>
            <CardDescription>
              Review and approve or reject shift swap requests from staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "all")}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Pending
                  {pendingRequests && pendingRequests.filter(r => r.status === "pending").length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingRequests.filter(r => r.status === "pending").length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" data-testid="tab-all">
                  All Requests
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <ScrollArea className="h-[500px]">
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                      ))}
                    </div>
                  ) : displayRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {activeTab === "pending" 
                          ? "No pending swap requests" 
                          : "No swap requests yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayRequests.map((request) => (
                        <SwapRequestCard
                          key={request.id}
                          request={request}
                          onApprove={() => handleApprove(request.id)}
                          onReject={() => handleReject(request.id)}
                          isResponding={respondMutation.isPending}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
