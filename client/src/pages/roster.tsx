import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RosterControls } from "@/components/roster-controls";
import { RosterTable } from "@/components/roster-table";
import { StaffHoursDashboard } from "@/components/staff-hours-dashboard";
import { RosterHistory } from "@/components/roster-history";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { getNextMonday, calculateStaffHours } from "@/lib/roster-utils";
import type { Roster, StaffMember, RosterShift } from "@shared/schema";
import { Calendar, ClipboardList, History, PanelLeftClose, PanelLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RosterPage() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(getNextMonday());
  const [weeks, setWeeks] = useState(4);
  const [localShifts, setLocalShifts] = useState<RosterShift[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [selectedRosterId, setSelectedRosterId] = useState<string>();

  const { data: activeRoster, isLoading: isLoadingRoster } = useQuery<Roster | null>({
    queryKey: ["/api/roster"],
  });

  const { data: selectedRoster } = useQuery<Roster | null>({
    queryKey: ["/api/roster", selectedRosterId],
    enabled: !!selectedRosterId && selectedRosterId !== activeRoster?.id,
  });

  const displayRoster = selectedRosterId && selectedRoster ? selectedRoster : activeRoster;
  
  const shifts = useMemo(() => {
    return localShifts.length > 0 ? localShifts : (displayRoster?.shifts || []);
  }, [localShifts, displayRoster?.shifts]);

  const staffHours = useMemo(() => {
    return calculateStaffHours(shifts);
  }, [shifts]);

  const generateMutation = useMutation({
    mutationFn: async ({ startDate, weeks }: { startDate: string; weeks: number }) => {
      const response = await apiRequest("POST", "/api/roster/generate", { startDate, weeks });
      return await response.json() as Roster;
    },
    onSuccess: (data) => {
      setLocalShifts(data.shifts);
      setSelectedRosterId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rosters"] });
      toast({
        title: "Roster Generated",
        description: `Created ${data.shifts.length} shifts for ${weeks} week${weeks !== 1 ? "s" : ""}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate roster. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ shiftId, assigned }: { shiftId: string; assigned: StaffMember | null }) => {
      const response = await apiRequest("PATCH", "/api/roster/shift", { shiftId, assigned });
      return await response.json() as RosterShift;
    },
    onSuccess: (updatedShift) => {
      setLocalShifts((prev) =>
        prev.length > 0 
          ? prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
          : (displayRoster?.shifts || []).map((s) => (s.id === updatedShift.id ? updatedShift : s))
      );
      queryClient.invalidateQueries({ queryKey: ["/api/roster"] });
      if (selectedRosterId) {
        queryClient.invalidateQueries({ queryKey: ["/api/roster", selectedRosterId] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/roster/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId: displayRoster?.id || "current" }),
      });
      if (!response.ok) throw new Error("Export failed");
      return response.blob();
    },
    onSuccess: async (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roster_${displayRoster?.startDate || new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Export Complete",
        description: "Roster has been downloaded as Excel file.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = useCallback(() => {
    if (!startDate) return;
    generateMutation.mutate({
      startDate: startDate.toISOString().split("T")[0],
      weeks,
    });
  }, [startDate, weeks, generateMutation]);

  const handleAssign = useCallback(
    (shiftId: string, staff: StaffMember | null) => {
      const currentShifts = localShifts.length > 0 ? localShifts : (displayRoster?.shifts || []);
      setLocalShifts(
        currentShifts.map((s) => (s.id === shiftId ? { ...s, assigned: staff } : s))
      );
      updateShiftMutation.mutate({ shiftId, assigned: staff });
    },
    [updateShiftMutation, localShifts, displayRoster?.shifts]
  );

  const handleExport = useCallback(() => {
    exportMutation.mutate();
  }, [exportMutation]);

  const handleRosterSelect = useCallback((rosterId: string) => {
    setSelectedRosterId(rosterId);
    setLocalShifts([]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Staff Roster Manager</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Healthcare scheduling made simple
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                data-testid="button-toggle-history"
              >
                {showHistory ? (
                  <PanelLeftClose className="h-5 w-5" />
                ) : (
                  <PanelLeft className="h-5 w-5" />
                )}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {showHistory && (
            <aside className="w-72 shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" />
                    Roster History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RosterHistory 
                    onRosterSelect={handleRosterSelect}
                    selectedRosterId={selectedRosterId || activeRoster?.id}
                  />
                </CardContent>
              </Card>
            </aside>
          )}

          <main className="flex-1 space-y-6 min-w-0">
            <section className="space-y-4">
              <RosterControls
                startDate={startDate}
                onStartDateChange={setStartDate}
                weeks={weeks}
                onWeeksChange={setWeeks}
                onGenerate={handleGenerate}
                onExport={handleExport}
                isGenerating={generateMutation.isPending}
                isExporting={exportMutation.isPending}
                hasRoster={shifts.length > 0}
              />
            </section>

            {displayRoster && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Viewing: <strong className="text-foreground">{displayRoster.name}</strong>
                  {displayRoster.isActive && (
                    <span className="ml-2 text-xs text-primary">(Active)</span>
                  )}
                </span>
              </div>
            )}

            <section>
              <StaffHoursDashboard summaries={staffHours} isLoading={isLoadingRoster} />
            </section>

            <section>
              {isLoadingRoster ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <RosterTable
                  shifts={shifts}
                  onAssign={handleAssign}
                  isLoading={updateShiftMutation.isPending}
                />
              )}
            </section>
          </main>
        </div>
      </div>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Staff Roster Manager — Automated shift scheduling for healthcare teams
          </p>
        </div>
      </footer>
    </div>
  );
}
