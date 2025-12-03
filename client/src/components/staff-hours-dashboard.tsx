import { StaffHoursCard } from "@/components/staff-hours-card";
import type { StaffHoursSummary } from "@shared/schema";
import { Users } from "lucide-react";

interface StaffHoursDashboardProps {
  summaries: StaffHoursSummary[];
  isLoading?: boolean;
}

export function StaffHoursDashboard({ summaries, isLoading }: StaffHoursDashboardProps) {
  const totalHours = summaries.reduce((sum, s) => sum + s.totalHours, 0);
  const totalShifts = summaries.reduce((sum, s) => sum + s.shiftCount, 0);

  if (summaries.length === 0 || totalShifts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg">
        <Users className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Staff hours will appear here once a roster is generated
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Staff Hours Summary</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{totalShifts}</span> shifts
          </span>
          <span>
            <span className="font-medium text-foreground font-mono">{totalHours}</span> total hours
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map((summary) => (
          <StaffHoursCard 
            key={summary.name} 
            summary={summary}
            maxHours={totalHours / 2}
            warningThreshold={168}
          />
        ))}
      </div>
    </div>
  );
}
