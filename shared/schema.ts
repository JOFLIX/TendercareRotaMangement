import { z } from "zod";

// Staff members with their associated colors
export const STAFF_MEMBERS = ["Ashley", "Peninah", "Joflix", "Locum"] as const;
export type StaffMember = typeof STAFF_MEMBERS[number];

// Staff color mapping
export const STAFF_COLORS: Record<StaffMember, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Joflix: { bg: "bg-orange-400", text: "text-white", darkBg: "dark:bg-orange-500", darkText: "dark:text-white" },
  Peninah: { bg: "bg-pink-300", text: "text-pink-900", darkBg: "dark:bg-pink-400", darkText: "dark:text-pink-950" },
  Ashley: { bg: "bg-blue-400", text: "text-white", darkBg: "dark:bg-blue-500", darkText: "dark:text-white" },
  Locum: { bg: "bg-gray-400", text: "text-white", darkBg: "dark:bg-gray-500", darkText: "dark:text-white" },
};

// Shift types
export const SHIFT_TYPES = ["Day", "Night", "24h"] as const;
export type ShiftType = typeof SHIFT_TYPES[number];

// Day of week
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = typeof WEEKDAYS[number];

// Roster shift entry
export const rosterShiftSchema = z.object({
  id: z.string(),
  date: z.string(), // ISO date string
  weekday: z.string(),
  shiftType: z.enum(SHIFT_TYPES),
  shiftLabel: z.string(), // e.g., "Day 12h", "Night 16h", "24h"
  hours: z.number(),
  assigned: z.enum(STAFF_MEMBERS).nullable(),
  allowedStaff: z.array(z.enum(STAFF_MEMBERS)), // Staff allowed for this shift
});

export type RosterShift = z.infer<typeof rosterShiftSchema>;

// Roster (collection of shifts)
export const rosterSchema = z.object({
  id: z.string(),
  startDate: z.string(), // ISO date string
  weeks: z.number(),
  shifts: z.array(rosterShiftSchema),
});

export type Roster = z.infer<typeof rosterSchema>;

// Staff hours summary
export const staffHoursSummarySchema = z.object({
  name: z.enum(STAFF_MEMBERS),
  totalHours: z.number(),
  shiftCount: z.number(),
});

export type StaffHoursSummary = z.infer<typeof staffHoursSummarySchema>;

// Request schemas
export const generateRosterRequestSchema = z.object({
  startDate: z.string(),
  weeks: z.number().min(1).max(12).default(4),
});

export type GenerateRosterRequest = z.infer<typeof generateRosterRequestSchema>;

export const updateShiftRequestSchema = z.object({
  shiftId: z.string(),
  assigned: z.enum(STAFF_MEMBERS).nullable(),
});

export type UpdateShiftRequest = z.infer<typeof updateShiftRequestSchema>;

// Export roster request
export const exportRosterRequestSchema = z.object({
  rosterId: z.string(),
});

export type ExportRosterRequest = z.infer<typeof exportRosterRequestSchema>;
