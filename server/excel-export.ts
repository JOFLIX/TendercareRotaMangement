import ExcelJS from "exceljs";
import type { Roster, RosterShift, StaffMember } from "@shared/schema";

// Staff colors matching the frontend
const staffColors: Record<StaffMember, { argb: string; fontColor: string }> = {
  Joflix: { argb: "FFFB923C", fontColor: "FFFFFFFF" },   // Orange
  Peninah: { argb: "FFF9A8D4", fontColor: "FF831843" },  // Pink
  Ashley: { argb: "FF60A5FA", fontColor: "FFFFFFFF" },   // Blue
  Locum: { argb: "FF9CA3AF", fontColor: "FFFFFFFF" },    // Gray
};

export async function generateExcelRoster(roster: Roster): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Staff Roster Manager";
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet("Roster", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  // Define columns
  worksheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Weekday", key: "weekday", width: 10 },
    { header: "Shift", key: "shift", width: 12 },
    { header: "Assigned", key: "assigned", width: 15 },
    { header: "Hours", key: "hours", width: 8 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Add data rows
  roster.shifts.forEach((shift, index) => {
    const row = worksheet.addRow({
      date: shift.date,
      weekday: shift.weekday,
      shift: shift.shiftLabel,
      assigned: shift.assigned || "Unassigned",
      hours: shift.hours,
    });

    // Apply staff color to assigned cell
    if (shift.assigned) {
      const color = staffColors[shift.assigned];
      const assignedCell = row.getCell("assigned");
      assignedCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color.argb },
      };
      assignedCell.font = { color: { argb: color.fontColor }, bold: true };
    }

    // Weekend row styling
    if (shift.weekday === "Sat" || shift.weekday === "Sun") {
      const weekdayCell = row.getCell("weekday");
      weekdayCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: shift.weekday === "Sat" ? "FFE0E7FF" : "FFEDE9FE" },
      };
    }

    // Hours cell alignment
    row.getCell("hours").alignment = { horizontal: "right" };
    row.getCell("hours").numFmt = "0";

    // Alternate row colors
    if (index % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber !== 4) { // Skip assigned cell (already colored)
          if (!cell.fill || (cell.fill as ExcelJS.FillPattern).pattern === undefined) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF9FAFB" },
            };
          }
        }
      });
    }

    row.alignment = { vertical: "middle" };
    row.height = 22;
  });

  // Add data validation for assigned column
  const assignedColumn = worksheet.getColumn("assigned");
  const staffList = '"Ashley,Peninah,Joflix,Locum"';
  
  // Add borders to all cells
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  // Add summary section
  const summaryStartRow = roster.shifts.length + 4;
  
  worksheet.getCell(`A${summaryStartRow}`).value = "Staff Hours Summary";
  worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 12 };
  
  // Calculate hours per staff
  const hoursPerStaff = new Map<StaffMember, number>();
  (["Ashley", "Peninah", "Joflix", "Locum"] as StaffMember[]).forEach((s) => hoursPerStaff.set(s, 0));
  
  roster.shifts.forEach((shift) => {
    if (shift.assigned) {
      const current = hoursPerStaff.get(shift.assigned) || 0;
      hoursPerStaff.set(shift.assigned, current + shift.hours);
    }
  });

  let summaryRow = summaryStartRow + 1;
  hoursPerStaff.forEach((hours, staff) => {
    const row = worksheet.getRow(summaryRow);
    row.getCell(1).value = staff;
    row.getCell(2).value = `${hours} hours`;
    
    const staffCell = row.getCell(1);
    const color = staffColors[staff];
    staffCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: color.argb },
    };
    staffCell.font = { color: { argb: color.fontColor }, bold: true };
    
    summaryRow++;
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
