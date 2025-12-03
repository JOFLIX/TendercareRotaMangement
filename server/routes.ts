import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateRosterShifts } from "./roster-generator";
import { generateExcelRoster } from "./excel-export";
import { 
  generateRosterRequestSchema, 
  updateShiftRequestSchema,
  createSwapRequestSchema,
  respondSwapRequestSchema,
  STAFF_MEMBERS,
  type StaffMember
} from "@shared/schema";
import { randomUUID } from "crypto";
import { format, addDays } from "date-fns";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get current active roster
  app.get("/api/roster", async (req, res) => {
    try {
      const roster = await storage.getActiveRoster();
      res.json(roster);
    } catch (error) {
      console.error("Error fetching roster:", error);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });

  // Get all rosters (for history)
  app.get("/api/rosters", async (req, res) => {
    try {
      const rosters = await storage.getAllRosters();
      res.json(rosters);
    } catch (error) {
      console.error("Error fetching rosters:", error);
      res.status(500).json({ error: "Failed to fetch rosters" });
    }
  });

  // Get roster by ID
  app.get("/api/roster/:id", async (req, res) => {
    try {
      const roster = await storage.getRosterById(req.params.id);
      if (!roster) {
        return res.status(404).json({ error: "Roster not found" });
      }
      res.json(roster);
    } catch (error) {
      console.error("Error fetching roster:", error);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });

  // Generate new roster
  app.post("/api/roster/generate", async (req, res) => {
    try {
      const parseResult = generateRosterRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors 
        });
      }

      const { startDate, weeks, name } = parseResult.data;
      const shifts = generateRosterShifts(startDate, weeks);
      
      // Calculate end date
      const startDateObj = new Date(startDate);
      const endDateObj = addDays(startDateObj, weeks * 7 - 1);
      const endDate = format(endDateObj, "yyyy-MM-dd");
      
      // Generate roster name if not provided
      const rosterName = name || `Roster ${format(startDateObj, "MMM d")} - ${format(endDateObj, "MMM d, yyyy")}`;
      
      const roster = await storage.saveRoster({
        id: randomUUID(),
        name: rosterName,
        startDate,
        endDate,
        weeks,
        shifts,
        version: 1,
        isActive: true,
      });

      res.json(roster);
    } catch (error) {
      console.error("Error generating roster:", error);
      res.status(500).json({ error: "Failed to generate roster" });
    }
  });

  // Set active roster
  app.post("/api/roster/:id/activate", async (req, res) => {
    try {
      await storage.setActiveRoster(req.params.id);
      const roster = await storage.getRosterById(req.params.id);
      res.json(roster);
    } catch (error) {
      console.error("Error activating roster:", error);
      res.status(500).json({ error: "Failed to activate roster" });
    }
  });

  // Delete roster
  app.delete("/api/roster/:id", async (req, res) => {
    try {
      await storage.deleteRoster(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting roster:", error);
      res.status(500).json({ error: "Failed to delete roster" });
    }
  });

  // Update shift assignment
  app.patch("/api/roster/shift", async (req, res) => {
    try {
      const parseResult = updateShiftRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors 
        });
      }

      const { shiftId, assigned } = parseResult.data;
      const updatedShift = await storage.updateShift(shiftId, assigned);
      
      if (!updatedShift) {
        return res.status(404).json({ error: "Shift not found" });
      }

      res.json(updatedShift);
    } catch (error) {
      console.error("Error updating shift:", error);
      if (error instanceof Error && error.message.includes("not allowed")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update shift" });
    }
  });

  // Export roster to Excel
  app.post("/api/roster/export", async (req, res) => {
    try {
      const roster = await storage.getActiveRoster();
      
      if (!roster) {
        return res.status(404).json({ error: "No roster to export" });
      }

      const buffer = await generateExcelRoster(roster);
      
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=roster_${roster.startDate}.xlsx`
      );
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting roster:", error);
      res.status(500).json({ error: "Failed to export roster" });
    }
  });

  // ============== Swap Request Routes ==============
  
  // Create swap request
  app.post("/api/swap-requests", async (req, res) => {
    try {
      const parseResult = createSwapRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors 
        });
      }

      const { shiftId, fromStaff, toStaff, reason } = parseResult.data;
      const swapRequest = await storage.createSwapRequest(shiftId, fromStaff, toStaff, reason);
      
      // Create notification for the target staff member
      await storage.createNotification(
        toStaff,
        "swap_request",
        "Shift Swap Request",
        `${fromStaff} has requested to swap their shift with you on ${swapRequest.shiftDate}`,
        shiftId,
        swapRequest.id
      );

      res.json(swapRequest);
    } catch (error) {
      console.error("Error creating swap request:", error);
      res.status(500).json({ error: "Failed to create swap request" });
    }
  });

  // Get swap requests
  app.get("/api/swap-requests", async (req, res) => {
    try {
      const status = req.query.status as "pending" | "approved" | "rejected" | undefined;
      const swapRequests = await storage.getSwapRequests(status);
      res.json(swapRequests);
    } catch (error) {
      console.error("Error fetching swap requests:", error);
      res.status(500).json({ error: "Failed to fetch swap requests" });
    }
  });

  // Respond to swap request
  app.post("/api/swap-requests/:id/respond", async (req, res) => {
    try {
      const parseResult = respondSwapRequestSchema.safeParse({
        requestId: req.params.id,
        ...req.body
      });
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors 
        });
      }

      const { requestId, status } = parseResult.data;
      const swapRequest = await storage.respondToSwapRequest(requestId, status);
      
      if (!swapRequest) {
        return res.status(404).json({ error: "Swap request not found" });
      }

      // Create notification for the requesting staff member
      await storage.createNotification(
        swapRequest.fromStaff,
        "swap_response",
        `Swap Request ${status === "approved" ? "Approved" : "Rejected"}`,
        `Your swap request for ${swapRequest.shiftDate} has been ${status}`,
        swapRequest.shiftId,
        swapRequest.id
      );

      res.json(swapRequest);
    } catch (error) {
      console.error("Error responding to swap request:", error);
      res.status(500).json({ error: "Failed to respond to swap request" });
    }
  });

  // ============== Notification Routes ==============

  // Get notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const staffMember = req.query.staff as StaffMember | undefined;
      const unreadOnly = req.query.unreadOnly === "true";
      
      const notifications = await storage.getNotifications(staffMember, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read for a staff member
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    try {
      const { staffMember } = req.body;
      if (!staffMember || !STAFF_MEMBERS.includes(staffMember)) {
        return res.status(400).json({ error: "Invalid staff member" });
      }
      
      await storage.markAllNotificationsRead(staffMember);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  return httpServer;
}
