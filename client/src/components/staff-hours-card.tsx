import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle } from "lucide-react";
import type { StaffHoursSummary, StaffMember } from "@shared/schema";
import { cn } from "@/lib/utils";

interface StaffHoursCardProps {
  summary: StaffHoursSummary;
  maxHours?: number;
  warningThreshold?: number;
}

const staffColorStyles: Record<StaffMember, { border: string; accent: string; progressBg: string }> = {
  Joflix: {
    border: "border-l-orange-400 dark:border-l-orange-500",
    accent: "text-orange-600 dark:text-orange-400",
    progressBg: "[&>div]:bg-orange-400 dark:[&>div]:bg-orange-500",
  },
  Peninah: {
    border: "border-l-pink-400 dark:border-l-pink-500",
    accent: "text-pink-600 dark:text-pink-400",
    progressBg: "[&>div]:bg-pink-400 dark:[&>div]:bg-pink-500",
  },
  Ashley: {
    border: "border-l-blue-400 dark:border-l-blue-500",
    accent: "text-blue-600 dark:text-blue-400",
    progressBg: "[&>div]:bg-blue-400 dark:[&>div]:bg-blue-500",
  },
  Locum: {
    border: "border-l-gray-400 dark:border-l-gray-500",
    accent: "text-gray-600 dark:text-gray-400",
    progressBg: "[&>div]:bg-gray-400 dark:[&>div]:bg-gray-500",
  },
};

export function StaffHoursCard({ summary, maxHours = 200, warningThreshold = 168 }: StaffHoursCardProps) {
  const { name, totalHours, shiftCount } = summary;
  const styles = staffColorStyles[name];
  const isOverThreshold = totalHours > warningThreshold;
  const progressValue = Math.min((totalHours / maxHours) * 100, 100);
  
  return (
    <Card 
      className={cn(
        "border-l-4 overflow-visible",
        styles.border
      )}
      data-testid={`card-staff-hours-${name.toLowerCase()}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-foreground" data-testid={`text-staff-name-${name.toLowerCase()}`}>
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {shiftCount} shift{shiftCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isOverThreshold ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Clock className={cn("h-4 w-4", styles.accent)} />
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-baseline gap-1">
            <span 
              className={cn(
                "text-3xl font-bold font-mono tabular-nums",
                isOverThreshold ? "text-destructive" : styles.accent
              )}
              data-testid={`text-total-hours-${name.toLowerCase()}`}
            >
              {totalHours}
            </span>
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          
          <Progress 
            value={progressValue} 
            className={cn(
              "h-2",
              styles.progressBg,
              isOverThreshold && "[&>div]:bg-destructive"
            )}
          />
          
          {isOverThreshold && (
            <p className="text-xs text-destructive font-medium mt-1">
              Exceeds {warningThreshold}h weekly limit
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
