import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateRosterShifts } from "./roster-generator";
import { generateExcelRoster } from "./excel-export";
import { generateRosterRequestSchema, updateShiftRequestSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get current roster
  app.get("/api/roster", async (req, res) => {
    try {
      const roster = await storage.getRoster();
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

      const { startDate, weeks } = parseResult.data;
      const shifts = generateRosterShifts(startDate, weeks);
      
      const roster = await storage.saveRoster({
        id: randomUUID(),
        startDate,
        weeks,
        shifts,
      });

      res.json(roster);
    } catch (error) {
      console.error("Error generating roster:", error);
      res.status(500).json({ error: "Failed to generate roster" });
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
      const roster = await storage.getRoster();
      
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

  return httpServer;
}
