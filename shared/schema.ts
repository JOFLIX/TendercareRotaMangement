import { z } from "zod";
import { pgTable, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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

// ============== Database Tables ==============

// Rosters table - stores saved roster versions
export const rosters = pgTable("rosters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  weeks: integer("weeks").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  version: integer("version").default(1).notNull(),
});

// Shifts table - stores individual shifts for each roster
export const shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  rosterId: text("roster_id").notNull().references(() => rosters.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  weekday: text("weekday").notNull(),
  shiftType: text("shift_type").notNull(),
  shiftLabel: text("shift_label").notNull(),
  hours: integer("hours").notNull(),
  assigned: text("assigned"),
  allowedStaff: jsonb("allowed_staff").notNull().$type<StaffMember[]>(),
});

// Swap requests table
export const swapRequests = pgTable("swap_requests", {
  id: text("id").primaryKey(),
  shiftId: text("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  fromStaff: text("from_staff").notNull(),
  toStaff: text("to_staff").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  staffMember: text("staff_member").notNull(),
  type: text("type").notNull(), // shift_assigned, shift_changed, swap_request, swap_response
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  relatedShiftId: text("related_shift_id"),
  relatedSwapId: text("related_swap_id"),
});

// Insert schemas
export const insertRosterSchema = createInsertSchema(rosters).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export const insertShiftSchema = createInsertSchema(shifts);
export const insertSwapRequestSchema = createInsertSchema(swapRequests).omit({ 
  createdAt: true, 
  respondedAt: true 
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  createdAt: true 
});

// Select types
export type DbRoster = typeof rosters.$inferSelect;
export type DbShift = typeof shifts.$inferSelect;
export type DbSwapRequest = typeof swapRequests.$inferSelect;
export type DbNotification = typeof notifications.$inferSelect;

// Insert types
export type InsertRoster = z.infer<typeof insertRosterSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertSwapRequest = z.infer<typeof insertSwapRequestSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// ============== Application Types (for API/Frontend) ==============

// Roster shift entry (used in API responses)
export const rosterShiftSchema = z.object({
  id: z.string(),
  date: z.string(),
  weekday: z.string(),
  shiftType: z.enum(SHIFT_TYPES),
  shiftLabel: z.string(),
  hours: z.number(),
  assigned: z.enum(STAFF_MEMBERS).nullable(),
  allowedStaff: z.array(z.enum(STAFF_MEMBERS)),
});

export type RosterShift = z.infer<typeof rosterShiftSchema>;

// Roster (collection of shifts) - used in API responses
export const rosterSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  weeks: z.number(),
  shifts: z.array(rosterShiftSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional(),
});

export type Roster = z.infer<typeof rosterSchema>;

// Roster summary for list views
export const rosterSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  weeks: z.number(),
  createdAt: z.string(),
  isActive: z.boolean(),
  version: z.number(),
  shiftCount: z.number(),
});

export type RosterSummary = z.infer<typeof rosterSummarySchema>;

// Staff hours summary
export const staffHoursSummarySchema = z.object({
  name: z.enum(STAFF_MEMBERS),
  totalHours: z.number(),
  shiftCount: z.number(),
});

export type StaffHoursSummary = z.infer<typeof staffHoursSummarySchema>;

// Swap request with shift details
export const swapRequestWithDetailsSchema = z.object({
  id: z.string(),
  shiftId: z.string(),
  shiftDate: z.string(),
  shiftType: z.string(),
  fromStaff: z.enum(STAFF_MEMBERS),
  toStaff: z.enum(STAFF_MEMBERS),
  status: z.enum(["pending", "approved", "rejected"]),
  reason: z.string().nullable(),
  createdAt: z.string(),
  respondedAt: z.string().nullable(),
});

export type SwapRequestWithDetails = z.infer<typeof swapRequestWithDetailsSchema>;

// Notification
export const notificationSchema = z.object({
  id: z.string(),
  staffMember: z.enum(STAFF_MEMBERS),
  type: z.enum(["shift_assigned", "shift_changed", "swap_request", "swap_response"]),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
  relatedShiftId: z.string().nullable(),
  relatedSwapId: z.string().nullable(),
});

export type Notification = z.infer<typeof notificationSchema>;

// ============== Request Schemas ==============

export const generateRosterRequestSchema = z.object({
  startDate: z.string(),
  weeks: z.number().min(1).max(12).default(4),
  name: z.string().optional(),
});

export type GenerateRosterRequest = z.infer<typeof generateRosterRequestSchema>;

export const updateShiftRequestSchema = z.object({
  shiftId: z.string(),
  assigned: z.enum(STAFF_MEMBERS).nullable(),
});

export type UpdateShiftRequest = z.infer<typeof updateShiftRequestSchema>;

export const exportRosterRequestSchema = z.object({
  rosterId: z.string(),
});

export type ExportRosterRequest = z.infer<typeof exportRosterRequestSchema>;

export const createSwapRequestSchema = z.object({
  shiftId: z.string(),
  fromStaff: z.enum(STAFF_MEMBERS),
  toStaff: z.enum(STAFF_MEMBERS),
  reason: z.string().optional(),
});

export type CreateSwapRequest = z.infer<typeof createSwapRequestSchema>;

export const respondSwapRequestSchema = z.object({
  requestId: z.string(),
  status: z.enum(["approved", "rejected"]),
});

export type RespondSwapRequest = z.infer<typeof respondSwapRequestSchema>;
