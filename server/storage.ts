import type { Roster, RosterShift, StaffMember } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getRoster(): Promise<Roster | null>;
  saveRoster(roster: Roster): Promise<Roster>;
  updateShift(shiftId: string, assigned: StaffMember | null): Promise<RosterShift | null>;
}

export class MemStorage implements IStorage {
  private roster: Roster | null = null;

  async getRoster(): Promise<Roster | null> {
    return this.roster;
  }

  async saveRoster(roster: Roster): Promise<Roster> {
    this.roster = { ...roster, id: roster.id || randomUUID() };
    return this.roster;
  }

  async updateShift(shiftId: string, assigned: StaffMember | null): Promise<RosterShift | null> {
    if (!this.roster) return null;
    
    const shiftIndex = this.roster.shifts.findIndex((s) => s.id === shiftId);
    if (shiftIndex === -1) return null;
    
    const shift = this.roster.shifts[shiftIndex];
    
    // Validate that the assigned staff is allowed for this shift
    if (assigned !== null && !shift.allowedStaff.includes(assigned)) {
      throw new Error(`Staff member ${assigned} is not allowed for this shift`);
    }
    
    const updatedShift = { ...shift, assigned };
    this.roster.shifts[shiftIndex] = updatedShift;
    
    return updatedShift;
  }
}

export const storage = new MemStorage();
