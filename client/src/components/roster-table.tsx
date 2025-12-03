import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StaffAssignmentCell } from "@/components/staff-assignment-cell";
import type { RosterShift, StaffMember } from "@shared/schema";
import { formatDisplayDate, isToday, isPast } from "@/lib/roster-utils";
import { cn } from "@/lib/utils";
import { Sun, Moon, Clock } from "lucide-react";

interface RosterTableProps {
  shifts: RosterShift[];
  onAssign: (shiftId: string, staff: StaffMember | null) => void;
  isLoading?: boolean;
}

const weekdayColors: Record<string, string> = {
  Mon: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Tue: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Wed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Thu: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Fri: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Sat: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  Sun: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
};

function ShiftIcon({ shiftType }: { shiftType: string }) {
  if (shiftType === "Day") {
    return <Sun className="h-4 w-4 text-amber-500" />;
  }
  if (shiftType === "Night") {
    return <Moon className="h-4 w-4 text-indigo-500" />;
  }
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export function RosterTable({ shifts, onAssign, isLoading }: RosterTableProps) {
  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Roster Generated</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Select a start date and generate a roster to see shift assignments.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold text-xs uppercase tracking-wide w-[140px]">
              Date
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide w-[80px]">
              Day
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide w-[120px]">
              Shift
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide w-[150px]">
              Assigned
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wide text-right w-[80px]">
              Hours
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift, index) => {
            const isTodayShift = isToday(shift.date);
            const isPastShift = isPast(shift.date) && !isTodayShift;
            const isNewDate = index === 0 || shifts[index - 1].date !== shift.date;
            
            return (
              <TableRow 
                key={shift.id}
                className={cn(
                  "transition-colors",
                  isTodayShift && "bg-primary/5 dark:bg-primary/10",
                  isPastShift && "opacity-60",
                  !isNewDate && "border-t-0"
                )}
                data-testid={`row-shift-${shift.id}`}
              >
                <TableCell className="font-medium">
                  {isNewDate ? (
                    <div className="flex items-center gap-2">
                      <span data-testid={`text-date-${shift.id}`}>
                        {formatDisplayDate(shift.date)}
                      </span>
                      {isTodayShift && (
                        <Badge variant="secondary" className="text-xs">
                          Today
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {isNewDate ? (
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "font-medium text-xs",
                        weekdayColors[shift.weekday]
                      )}
                      data-testid={`badge-weekday-${shift.id}`}
                    >
                      {shift.weekday}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ShiftIcon shiftType={shift.shiftType} />
                    <span 
                      className="text-sm font-medium"
                      data-testid={`text-shift-${shift.id}`}
                    >
                      {shift.shiftLabel}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StaffAssignmentCell 
                    shift={shift} 
                    onAssign={onAssign}
                    disabled={isLoading}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <span 
                    className="font-mono text-sm tabular-nums"
                    data-testid={`text-hours-${shift.id}`}
                  >
                    {shift.hours}h
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
