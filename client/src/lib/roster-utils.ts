import { format, addDays, getDay, startOfWeek, parseISO } from "date-fns";
import type { RosterShift, StaffMember, StaffHoursSummary } from "@shared/schema";
import { STAFF_MEMBERS } from "@shared/schema";

// Get allowed staff for a specific shift
export function getAllowedStaff(date: Date, shiftType: "Day" | "Night" | "24h"): StaffMember[] {
  const dayOfWeek = getDay(date); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  
  // Saturday Day: Only Joflix
  if (dayOfWeek === 6 && shiftType === "Day") {
    return ["Joflix"];
  }
  
  // Saturday Night: Ashley, Peninah, Locum (no Joflix)
  if (dayOfWeek === 6 && shiftType === "Night") {
    return ["Ashley", "Peninah", "Locum"];
  }
  
  // Sunday: Ashley, Peninah, Locum (no Joflix)
  if (dayOfWeek === 0) {
    return ["Ashley", "Peninah", "Locum"];
  }
  
  // Weekdays: All staff
  return ["Ashley", "Peninah", "Joflix", "Locum"];
}

// Get default assignment based on rules
export function getDefaultAssignment(date: Date, shiftType: "Day" | "Night" | "24h", weekIndex: number): StaffMember | null {
  const dayOfWeek = getDay(date); // 0=Sun, 6=Sat
  
  // Saturday Day: Always Joflix
  if (dayOfWeek === 6 && shiftType === "Day") {
    return "Joflix";
  }
  
  // Saturday Night: Alternate Ashley/Peninah, use Locum after week 3
  if (dayOfWeek === 6 && shiftType === "Night") {
    if (weekIndex >= 3) return "Locum";
    return weekIndex % 2 === 0 ? "Ashley" : "Peninah";
  }
  
  // Sunday Day: Alternate Ashley/Peninah
  if (dayOfWeek === 0 && shiftType === "Day") {
    return weekIndex % 2 === 0 ? "Ashley" : "Peninah";
  }
  
  // Sunday Night: Alternate Peninah/Ashley (opposite of day)
  if (dayOfWeek === 0 && shiftType === "Night") {
    return weekIndex % 2 === 0 ? "Peninah" : "Ashley";
  }
  
  // Weekdays
  if (dayOfWeek === 1) return "Ashley";     // Monday
  if (dayOfWeek === 2) return "Peninah";    // Tuesday
  if (dayOfWeek === 3) return "Joflix";     // Wednesday (48h block start)
  if (dayOfWeek === 4) return "Joflix";     // Thursday (48h block end)
  if (dayOfWeek === 5) {                    // Friday
    return weekIndex >= 3 ? "Locum" : "Peninah";
  }
  
  return null;
}

// Get shift hours
export function getShiftHours(dayOfWeek: number, shiftType: "Day" | "Night" | "24h"): number {
  // Weekdays are 24h shifts
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return 24;
  }
  
  // Weekend shifts - simplified to 12h each
  if (shiftType === "Day") return 12;
  if (shiftType === "Night") return 12;
  
  return 24;
}

// Generate roster shifts for a given start date and number of weeks
export function generateRosterShifts(startDate: Date, weeks: number): RosterShift[] {
  const shifts: RosterShift[] = [];
  const totalDays = weeks * 7;
  
  // Ensure we start on a Monday
  const adjustedStart = startOfWeek(startDate, { weekStartsOn: 1 });
  
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(adjustedStart, i);
    const dayOfWeek = getDay(date);
    const weekIndex = Math.floor(i / 7);
    const dateStr = format(date, "yyyy-MM-dd");
    const weekday = format(date, "EEE");
    
    // Weekend shifts (Saturday & Sunday)
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      // Day shift
      const dayHours = getShiftHours(dayOfWeek, "Day");
      const dayAllowed = getAllowedStaff(date, "Day");
      const dayAssigned = getDefaultAssignment(date, "Day", weekIndex);
      
      shifts.push({
        id: `${dateStr}-day`,
        date: dateStr,
        weekday,
        shiftType: "Day",
        shiftLabel: `Day ${dayHours}h`,
        hours: dayHours,
        assigned: dayAssigned,
        allowedStaff: dayAllowed,
      });
      
      // Night shift
      const nightHours = getShiftHours(dayOfWeek, "Night");
      const nightAllowed = getAllowedStaff(date, "Night");
      const nightAssigned = getDefaultAssignment(date, "Night", weekIndex);
      
      shifts.push({
        id: `${dateStr}-night`,
        date: dateStr,
        weekday,
        shiftType: "Night",
        shiftLabel: `Night ${nightHours}h`,
        hours: nightHours,
        assigned: nightAssigned,
        allowedStaff: nightAllowed,
      });
    } else {
      // Weekday 24h shift
      const hours = getShiftHours(dayOfWeek, "24h");
      const allowed = getAllowedStaff(date, "24h");
      const assigned = getDefaultAssignment(date, "24h", weekIndex);
      
      shifts.push({
        id: `${dateStr}-24h`,
        date: dateStr,
        weekday,
        shiftType: "24h",
        shiftLabel: "24h",
        hours,
        assigned,
        allowedStaff: allowed,
      });
    }
  }
  
  return shifts;
}

// Calculate staff hours summary
export function calculateStaffHours(shifts: RosterShift[]): StaffHoursSummary[] {
  const hoursMap = new Map<StaffMember, { hours: number; count: number }>();
  
  // Initialize all staff with 0
  STAFF_MEMBERS.forEach(staff => {
    hoursMap.set(staff, { hours: 0, count: 0 });
  });
  
  // Sum up hours for each staff member
  shifts.forEach(shift => {
    if (shift.assigned) {
      const current = hoursMap.get(shift.assigned)!;
      hoursMap.set(shift.assigned, {
        hours: current.hours + shift.hours,
        count: current.count + 1,
      });
    }
  });
  
  return STAFF_MEMBERS.map(name => ({
    name,
    totalHours: hoursMap.get(name)!.hours,
    shiftCount: hoursMap.get(name)!.count,
  }));
}

// Format date for display
export function formatDisplayDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd MMM yyyy");
}

// Get next Monday from today
export function getNextMonday(): Date {
  const today = new Date();
  return startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
}

// Check if a date is today
export function isToday(dateStr: string): boolean {
  return format(new Date(), "yyyy-MM-dd") === dateStr;
}

// Check if a date is in the past
export function isPast(dateStr: string): boolean {
  return parseISO(dateStr) < new Date();
}
