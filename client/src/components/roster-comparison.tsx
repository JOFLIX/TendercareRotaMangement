import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowRight, Equal, AlertCircle } from "lucide-react";
import type { Roster, RosterShift, StaffMember, RosterSummary } from "@shared/schema";
import { STAFF_COLORS } from "@shared/schema";

interface RosterComparisonProps {
  leftRosterId: string;
  rightRosterId: string;
}

interface ShiftDiff {
  shiftId: string;
  date: string;
  weekday: string;
  shiftType: string;
  leftAssigned: StaffMember | null;
  rightAssigned: StaffMember | null;
  isDifferent: boolean;
}

function StaffBadge({ staff }: { staff: StaffMember | null }) {
  if (!staff) {
    return (
      <span className="text-xs text-muted-foreground italic">Unassigned</span>
    );
  }

  const colors = STAFF_COLORS[staff];
  return (
    <Badge className={`${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      {staff}
    </Badge>
  );
}

export function RosterComparison({ leftRosterId, rightRosterId }: RosterComparisonProps) {
  const { data: leftRoster, isLoading: leftLoading } = useQuery<Roster | null>({
    queryKey: ["/api/roster", leftRosterId],
    enabled: !!leftRosterId,
  });

  const { data: rightRoster, isLoading: rightLoading } = useQuery<Roster | null>({
    queryKey: ["/api/roster", rightRosterId],
    enabled: !!rightRosterId,
  });

  const isLoading = leftLoading || rightLoading;

  const diffs = useMemo(() => {
    if (!leftRoster || !rightRoster) return [];

    const leftShiftsMap = new Map<string, RosterShift>();
    leftRoster.shifts.forEach((shift) => {
      const key = `${shift.date}-${shift.shiftType}`;
      leftShiftsMap.set(key, shift);
    });

    const rightShiftsMap = new Map<string, RosterShift>();
    rightRoster.shifts.forEach((shift) => {
      const key = `${shift.date}-${shift.shiftType}`;
      rightShiftsMap.set(key, shift);
    });

    const allKeys = new Set([...Array.from(leftShiftsMap.keys()), ...Array.from(rightShiftsMap.keys())]);
    const results: ShiftDiff[] = [];

    allKeys.forEach((key) => {
      const leftShift = leftShiftsMap.get(key);
      const rightShift = rightShiftsMap.get(key);

      const leftAssigned = leftShift?.assigned || null;
      const rightAssigned = rightShift?.assigned || null;
      const isDifferent = leftAssigned !== rightAssigned;

      const shift = leftShift || rightShift;
      if (shift) {
        results.push({
          shiftId: shift.id,
          date: shift.date,
          weekday: shift.weekday,
          shiftType: shift.shiftType,
          leftAssigned,
          rightAssigned,
          isDifferent,
        });
      }
    });

    return results.sort((a, b) => a.date.localeCompare(b.date) || a.shiftType.localeCompare(b.shiftType));
  }, [leftRoster, rightRoster]);

  const changedCount = useMemo(() => {
    return diffs.filter((d) => d.isDifferent).length;
  }, [diffs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparing Rosters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leftRoster || !rightRoster) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roster Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select two rosters to compare
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Roster Comparison</CardTitle>
          <Badge variant={changedCount > 0 ? "destructive" : "secondary"}>
            {changedCount} difference{changedCount !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <span className="font-medium text-foreground">{leftRoster.name}</span>
          <ArrowRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{rightRoster.name}</span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-1">
            <div className="grid grid-cols-[120px_80px_1fr_24px_1fr] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              <div>Date</div>
              <div>Shift</div>
              <div className="text-center">Old</div>
              <div></div>
              <div className="text-center">New</div>
            </div>

            {diffs.map((diff) => (
              <div
                key={`${diff.date}-${diff.shiftType}`}
                data-testid={`comparison-row-${diff.date}-${diff.shiftType}`}
                className={`
                  grid grid-cols-[120px_80px_1fr_24px_1fr] gap-2 px-3 py-2 rounded-md items-center
                  ${diff.isDifferent ? "bg-amber-50 dark:bg-amber-900/20" : ""}
                `}
              >
                <div className="text-sm">
                  <div className="font-medium">{format(new Date(diff.date), "MMM d")}</div>
                  <div className="text-xs text-muted-foreground">{diff.weekday}</div>
                </div>
                <div>
                  <Badge variant="outline" className="text-xs">
                    {diff.shiftType}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <StaffBadge staff={diff.leftAssigned} />
                </div>
                <div className="flex justify-center">
                  {diff.isDifferent ? (
                    <ArrowRight className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Equal className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex justify-center">
                  <StaffBadge staff={diff.rightAssigned} />
                </div>
              </div>
            ))}

            {diffs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No shifts to compare
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
