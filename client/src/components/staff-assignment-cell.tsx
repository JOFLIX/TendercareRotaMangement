import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffMember, RosterShift } from "@shared/schema";
import { cn } from "@/lib/utils";

interface StaffAssignmentCellProps {
  shift: RosterShift;
  onAssign: (shiftId: string, staff: StaffMember | null) => void;
  disabled?: boolean;
}

const staffColors: Record<StaffMember, { bg: string; text: string }> = {
  Joflix: { 
    bg: "bg-orange-400 dark:bg-orange-500", 
    text: "text-white" 
  },
  Peninah: { 
    bg: "bg-pink-300 dark:bg-pink-400", 
    text: "text-pink-900 dark:text-pink-950" 
  },
  Ashley: { 
    bg: "bg-blue-400 dark:bg-blue-500", 
    text: "text-white" 
  },
  Locum: { 
    bg: "bg-gray-400 dark:bg-gray-500", 
    text: "text-white" 
  },
};

export function StaffAssignmentCell({ shift, onAssign, disabled }: StaffAssignmentCellProps) {
  const currentAssignment = shift.assigned;
  const colors = currentAssignment ? staffColors[currentAssignment] : null;
  const isLocked = shift.allowedStaff.length === 1;
  
  return (
    <Select
      value={currentAssignment || "unassigned"}
      onValueChange={(value) => {
        if (value === "unassigned") {
          onAssign(shift.id, null);
        } else {
          onAssign(shift.id, value as StaffMember);
        }
      }}
      disabled={disabled || isLocked}
    >
      <SelectTrigger
        className={cn(
          "w-[130px] font-medium border-0",
          colors ? `${colors.bg} ${colors.text}` : "bg-muted text-muted-foreground",
          isLocked && "cursor-not-allowed opacity-90"
        )}
        data-testid={`select-trigger-${shift.id}`}
      >
        <SelectValue placeholder="Unassigned">
          {currentAssignment || "Unassigned"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {shift.allowedStaff.map((staff) => {
          const staffColor = staffColors[staff];
          return (
            <SelectItem 
              key={staff} 
              value={staff}
              className={cn(
                "font-medium",
                staffColor.bg,
                staffColor.text
              )}
              data-testid={`select-item-${shift.id}-${staff.toLowerCase()}`}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  staff === "Joflix" && "bg-orange-600",
                  staff === "Peninah" && "bg-pink-600",
                  staff === "Ashley" && "bg-blue-600",
                  staff === "Locum" && "bg-gray-600",
                )} />
                {staff}
              </div>
            </SelectItem>
          );
        })}
        {!isLocked && (
          <SelectItem 
            value="unassigned"
            className="text-muted-foreground"
            data-testid={`select-item-${shift.id}-unassigned`}
          >
            Unassigned
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
