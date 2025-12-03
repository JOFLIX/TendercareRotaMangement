import { eq, desc } from "drizzle-orm";
import { createDb } from "./db";
import { 
  rosters, 
  shifts, 
  swapRequests, 
  notifications,
  type Roster, 
  type RosterShift, 
  type StaffMember,
  type RosterSummary,
  type SwapRequestWithDetails,
  type Notification,
  type DbShift,
  STAFF_MEMBERS
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Roster operations
  getActiveRoster(): Promise<Roster | null>;
  getRosterById(id: string): Promise<Roster | null>;
  getAllRosters(): Promise<RosterSummary[]>;
  saveRoster(roster: Omit<Roster, "id"> & { id?: string }): Promise<Roster>;
  updateShift(shiftId: string, assigned: StaffMember | null): Promise<RosterShift | null>;
  setActiveRoster(rosterId: string): Promise<void>;
  deleteRoster(rosterId: string): Promise<void>;
  
  // Swap request operations
  createSwapRequest(shiftId: string, fromStaff: StaffMember, toStaff: StaffMember, reason?: string): Promise<SwapRequestWithDetails>;
  getSwapRequests(status?: "pending" | "approved" | "rejected"): Promise<SwapRequestWithDetails[]>;
  respondToSwapRequest(requestId: string, status: "approved" | "rejected"): Promise<SwapRequestWithDetails | null>;
  
  // Notification operations
  createNotification(staffMember: StaffMember, type: string, title: string, message: string, relatedShiftId?: string, relatedSwapId?: string): Promise<Notification>;
  getNotifications(staffMember?: StaffMember, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(staffMember: StaffMember): Promise<void>;
}

function dbShiftToRosterShift(dbShift: DbShift): RosterShift {
  return {
    id: dbShift.id,
    date: dbShift.date,
    weekday: dbShift.weekday,
    shiftType: dbShift.shiftType as RosterShift["shiftType"],
    shiftLabel: dbShift.shiftLabel,
    hours: dbShift.hours,
    assigned: dbShift.assigned as StaffMember | null,
    allowedStaff: dbShift.allowedStaff as StaffMember[],
  };
}

export class DatabaseStorage implements IStorage {
  private db = createDb();

  async getActiveRoster(): Promise<Roster | null> {
    const [activeRoster] = await this.db
      .select()
      .from(rosters)
      .where(eq(rosters.isActive, true))
      .limit(1);
    
    if (!activeRoster) return null;
    
    return this.getRosterById(activeRoster.id);
  }

  async getRosterById(id: string): Promise<Roster | null> {
    const [roster] = await this.db
      .select()
      .from(rosters)
      .where(eq(rosters.id, id))
      .limit(1);
    
    if (!roster) return null;
    
    const rosterShifts = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.rosterId, id));
    
    return {
      id: roster.id,
      name: roster.name,
      startDate: roster.startDate,
      endDate: roster.endDate,
      weeks: roster.weeks,
      shifts: rosterShifts.map(dbShiftToRosterShift),
      createdAt: roster.createdAt.toISOString(),
      updatedAt: roster.updatedAt.toISOString(),
      isActive: roster.isActive,
      version: roster.version,
    };
  }

  async getAllRosters(): Promise<RosterSummary[]> {
    const allRosters = await this.db
      .select()
      .from(rosters)
      .orderBy(desc(rosters.createdAt));
    
    const summaries: RosterSummary[] = [];
    
    for (const roster of allRosters) {
      const shiftCount = await this.db
        .select()
        .from(shifts)
        .where(eq(shifts.rosterId, roster.id));
      
      summaries.push({
        id: roster.id,
        name: roster.name,
        startDate: roster.startDate,
        endDate: roster.endDate,
        weeks: roster.weeks,
        createdAt: roster.createdAt.toISOString(),
        isActive: roster.isActive,
        version: roster.version,
        shiftCount: shiftCount.length,
      });
    }
    
    return summaries;
  }

  async saveRoster(roster: Omit<Roster, "id"> & { id?: string }): Promise<Roster> {
    const rosterId = roster.id || randomUUID();
    const now = new Date();
    
    // Deactivate all existing rosters
    await this.db.update(rosters).set({ isActive: false });
    
    // Insert the new roster
    await this.db.insert(rosters).values({
      id: rosterId,
      name: roster.name,
      startDate: roster.startDate,
      endDate: roster.endDate,
      weeks: roster.weeks,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      version: roster.version || 1,
    });
    
    // Insert all shifts
    if (roster.shifts.length > 0) {
      await this.db.insert(shifts).values(
        roster.shifts.map((shift) => ({
          id: shift.id,
          rosterId: rosterId,
          date: shift.date,
          weekday: shift.weekday,
          shiftType: shift.shiftType,
          shiftLabel: shift.shiftLabel,
          hours: shift.hours,
          assigned: shift.assigned,
          allowedStaff: shift.allowedStaff,
        }))
      );
    }
    
    return this.getRosterById(rosterId) as Promise<Roster>;
  }

  async updateShift(shiftId: string, assigned: StaffMember | null): Promise<RosterShift | null> {
    // Get the current shift
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    
    if (!shift) return null;
    
    // Validate that the assigned staff is allowed for this shift
    const allowedStaff = shift.allowedStaff as StaffMember[];
    if (assigned !== null && !allowedStaff.includes(assigned)) {
      throw new Error(`Staff member ${assigned} is not allowed for this shift`);
    }
    
    // Update the shift
    await this.db
      .update(shifts)
      .set({ assigned })
      .where(eq(shifts.id, shiftId));
    
    // Update the roster's updatedAt
    await this.db
      .update(rosters)
      .set({ updatedAt: new Date() })
      .where(eq(rosters.id, shift.rosterId));
    
    // Get updated shift
    const [updatedShift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    
    return dbShiftToRosterShift(updatedShift);
  }

  async setActiveRoster(rosterId: string): Promise<void> {
    // Deactivate all rosters
    await this.db.update(rosters).set({ isActive: false });
    
    // Activate the specified roster
    await this.db
      .update(rosters)
      .set({ isActive: true })
      .where(eq(rosters.id, rosterId));
  }

  async deleteRoster(rosterId: string): Promise<void> {
    // Shifts are deleted automatically via cascade
    await this.db.delete(rosters).where(eq(rosters.id, rosterId));
  }

  // Swap request operations
  async createSwapRequest(
    shiftId: string, 
    fromStaff: StaffMember, 
    toStaff: StaffMember, 
    reason?: string
  ): Promise<SwapRequestWithDetails> {
    const requestId = randomUUID();
    
    // Get shift details
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    
    if (!shift) {
      throw new Error("Shift not found");
    }
    
    await this.db.insert(swapRequests).values({
      id: requestId,
      shiftId,
      fromStaff,
      toStaff,
      status: "pending",
      reason: reason || null,
    });
    
    return {
      id: requestId,
      shiftId,
      shiftDate: shift.date,
      shiftType: shift.shiftType,
      fromStaff,
      toStaff,
      status: "pending",
      reason: reason || null,
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };
  }

  async getSwapRequests(status?: "pending" | "approved" | "rejected"): Promise<SwapRequestWithDetails[]> {
    let query = this.db
      .select()
      .from(swapRequests)
      .orderBy(desc(swapRequests.createdAt));
    
    const requests = status 
      ? await this.db.select().from(swapRequests).where(eq(swapRequests.status, status)).orderBy(desc(swapRequests.createdAt))
      : await this.db.select().from(swapRequests).orderBy(desc(swapRequests.createdAt));
    
    const result: SwapRequestWithDetails[] = [];
    
    for (const req of requests) {
      const [shift] = await this.db
        .select()
        .from(shifts)
        .where(eq(shifts.id, req.shiftId))
        .limit(1);
      
      if (shift) {
        result.push({
          id: req.id,
          shiftId: req.shiftId,
          shiftDate: shift.date,
          shiftType: shift.shiftType,
          fromStaff: req.fromStaff as StaffMember,
          toStaff: req.toStaff as StaffMember,
          status: req.status as "pending" | "approved" | "rejected",
          reason: req.reason,
          createdAt: req.createdAt.toISOString(),
          respondedAt: req.respondedAt?.toISOString() || null,
        });
      }
    }
    
    return result;
  }

  async respondToSwapRequest(requestId: string, status: "approved" | "rejected"): Promise<SwapRequestWithDetails | null> {
    const [request] = await this.db
      .select()
      .from(swapRequests)
      .where(eq(swapRequests.id, requestId))
      .limit(1);
    
    if (!request) return null;
    
    const now = new Date();
    
    await this.db
      .update(swapRequests)
      .set({ status, respondedAt: now })
      .where(eq(swapRequests.id, requestId));
    
    // If approved, update the shift assignment
    if (status === "approved") {
      await this.db
        .update(shifts)
        .set({ assigned: request.toStaff })
        .where(eq(shifts.id, request.shiftId));
    }
    
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(eq(shifts.id, request.shiftId))
      .limit(1);
    
    return {
      id: request.id,
      shiftId: request.shiftId,
      shiftDate: shift?.date || "",
      shiftType: shift?.shiftType || "",
      fromStaff: request.fromStaff as StaffMember,
      toStaff: request.toStaff as StaffMember,
      status,
      reason: request.reason,
      createdAt: request.createdAt.toISOString(),
      respondedAt: now.toISOString(),
    };
  }

  // Notification operations
  async createNotification(
    staffMember: StaffMember,
    type: string,
    title: string,
    message: string,
    relatedShiftId?: string,
    relatedSwapId?: string
  ): Promise<Notification> {
    const notificationId = randomUUID();
    
    await this.db.insert(notifications).values({
      id: notificationId,
      staffMember,
      type,
      title,
      message,
      read: false,
      relatedShiftId: relatedShiftId || null,
      relatedSwapId: relatedSwapId || null,
    });
    
    return {
      id: notificationId,
      staffMember,
      type: type as Notification["type"],
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      relatedShiftId: relatedShiftId || null,
      relatedSwapId: relatedSwapId || null,
    };
  }

  async getNotifications(staffMember?: StaffMember, unreadOnly?: boolean): Promise<Notification[]> {
    let result;
    
    if (staffMember && unreadOnly) {
      result = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.staffMember, staffMember))
        .orderBy(desc(notifications.createdAt));
      result = result.filter(n => !n.read);
    } else if (staffMember) {
      result = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.staffMember, staffMember))
        .orderBy(desc(notifications.createdAt));
    } else if (unreadOnly) {
      result = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.read, false))
        .orderBy(desc(notifications.createdAt));
    } else {
      result = await this.db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt));
    }
    
    return result.map(n => ({
      id: n.id,
      staffMember: n.staffMember as StaffMember,
      type: n.type as Notification["type"],
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      relatedShiftId: n.relatedShiftId,
      relatedSwapId: n.relatedSwapId,
    }));
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsRead(staffMember: StaffMember): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.staffMember, staffMember));
  }
}

class InMemoryStorage implements IStorage {
  private rosters: Roster[] = [];
  private swapRequests: SwapRequestWithDetails[] = [];
  private notifications: Notification[] = [];

  async getActiveRoster(): Promise<Roster | null> {
    return this.rosters.find((r) => r.isActive) ?? null;
  }

  async getRosterById(id: string): Promise<Roster | null> {
    return this.rosters.find((r) => r.id === id) ?? null;
  }

  async getAllRosters(): Promise<RosterSummary[]> {
    return this.rosters
      .slice()
      .sort((a, b) => (a.createdAt && b.createdAt ? (a.createdAt < b.createdAt ? 1 : -1) : 0))
      .map((r) => ({
        id: r.id,
        name: r.name,
        startDate: r.startDate,
        endDate: r.endDate,
        weeks: r.weeks,
        createdAt: r.createdAt ?? new Date().toISOString(),
        isActive: !!r.isActive,
        version: r.version ?? 1,
        shiftCount: r.shifts.length,
      }));
  }

  async saveRoster(roster: Omit<Roster, "id"> & { id?: string }): Promise<Roster> {
    const id = roster.id || randomUUID();
    const now = new Date().toISOString();

    // Deactivate all existing rosters
    this.rosters = this.rosters.map((r) => ({ ...r, isActive: false }));

    const newRoster: Roster = {
      ...roster,
      id,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      version: roster.version ?? 1,
    };

    // Remove any previous roster with same id, then add new
    this.rosters = this.rosters.filter((r) => r.id !== id);
    this.rosters.push(newRoster);

    return newRoster;
  }

  async updateShift(shiftId: string, assigned: StaffMember | null): Promise<RosterShift | null> {
    for (const roster of this.rosters) {
      const shiftIndex = roster.shifts.findIndex((s) => s.id === shiftId);
      if (shiftIndex !== -1) {
        const shift = roster.shifts[shiftIndex];
        if (assigned !== null && !shift.allowedStaff.includes(assigned)) {
          throw new Error(`Staff member ${assigned} is not allowed for this shift`);
        }

        const updatedShift: RosterShift = { ...shift, assigned };
        roster.shifts[shiftIndex] = updatedShift;
        roster.updatedAt = new Date().toISOString();
        return updatedShift;
      }
    }
    return null;
  }

  async setActiveRoster(rosterId: string): Promise<void> {
    this.rosters = this.rosters.map((r) => ({
      ...r,
      isActive: r.id === rosterId,
    }));
  }

  async deleteRoster(rosterId: string): Promise<void> {
    this.rosters = this.rosters.filter((r) => r.id !== rosterId);
  }

  async createSwapRequest(
    shiftId: string,
    fromStaff: StaffMember,
    toStaff: StaffMember,
    reason?: string
  ): Promise<SwapRequestWithDetails> {
    // Find shift
    let foundShift: RosterShift | undefined;
    for (const roster of this.rosters) {
      const shift = roster.shifts.find((s) => s.id === shiftId);
      if (shift) {
        foundShift = shift;
        break;
      }
    }
    if (!foundShift) {
      throw new Error("Shift not found");
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const req: SwapRequestWithDetails = {
      id,
      shiftId,
      shiftDate: foundShift.date,
      shiftType: foundShift.shiftType,
      fromStaff,
      toStaff,
      status: "pending",
      reason: reason ?? null,
      createdAt: now,
      respondedAt: null,
    };
    this.swapRequests.push(req);
    return req;
  }

  async getSwapRequests(status?: "pending" | "approved" | "rejected"): Promise<SwapRequestWithDetails[]> {
    let result = this.swapRequests.slice();
    if (status) {
      result = result.filter((r) => r.status === status);
    }
    return result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async respondToSwapRequest(requestId: string, status: "approved" | "rejected"): Promise<SwapRequestWithDetails | null> {
    const idx = this.swapRequests.findIndex((r) => r.id === requestId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const req = this.swapRequests[idx];
    const updated: SwapRequestWithDetails = { ...req, status, respondedAt: now };
    this.swapRequests[idx] = updated;

    if (status === "approved") {
      // Update shift assignment
      for (const roster of this.rosters) {
        const shift = roster.shifts.find((s) => s.id === req.shiftId);
        if (shift) {
          shift.assigned = req.toStaff;
          roster.updatedAt = now;
          break;
        }
      }
    }

    return updated;
  }

  async createNotification(
    staffMember: StaffMember,
    type: string,
    title: string,
    message: string,
    relatedShiftId?: string,
    relatedSwapId?: string
  ): Promise<Notification> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const notification: Notification = {
      id,
      staffMember,
      type: type as Notification["type"],
      title,
      message,
      read: false,
      createdAt: now,
      relatedShiftId: relatedShiftId ?? null,
      relatedSwapId: relatedSwapId ?? null,
    };
    this.notifications.push(notification);
    return notification;
  }

  async getNotifications(staffMember?: StaffMember, unreadOnly?: boolean): Promise<Notification[]> {
    let result = this.notifications.slice();

    if (staffMember) {
      result = result.filter((n) => n.staffMember === staffMember);
    }
    if (unreadOnly) {
      result = result.filter((n) => !n.read);
    }

    return result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    this.notifications = this.notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
  }

  async markAllNotificationsRead(staffMember: StaffMember): Promise<void> {
    this.notifications = this.notifications.map((n) =>
      n.staffMember === staffMember ? { ...n, read: true } : n
    );
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new InMemoryStorage();
