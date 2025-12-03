# Design Guidelines: Healthcare Roster Management System

## Design Approach
**System**: Material Design with productivity-focused customization
**Rationale**: This is a utility-driven scheduling tool requiring clarity, efficiency, and data-dense displays. Material Design provides robust patterns for tables, forms, and data visualization while maintaining modern aesthetics.

## Core Design Principles
1. **Clarity First**: Information hierarchy optimized for quick scanning of shifts and assignments
2. **Color as Data**: Maintain the established color-coding system as functional, not decorative
3. **Minimal Friction**: Editing assignments should be immediate and intuitive
4. **Dense Information**: Display maximum roster data without overwhelming users

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, and 8 for consistent rhythm (p-4, gap-6, m-8, etc.)

**Grid Structure**:
- Main roster table: Full-width container with max-w-7xl
- Dashboard cards: 2-4 column grid on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Single column stack on mobile

**Page Layout**:
- Fixed header with controls (date picker, generate button, export)
- Scrollable main roster table
- Sticky column headers for context during scroll
- Summary dashboard below roster

## Typography

**Font Family**: 
- Primary: Inter (Google Fonts) - clean, readable for data-heavy interfaces
- Monospace: JetBrains Mono (for hours/numbers)

**Hierarchy**:
- Page title: text-2xl font-semibold
- Section headers: text-lg font-medium
- Table headers: text-sm font-semibold uppercase tracking-wide
- Body/data: text-base
- Supporting text: text-sm text-gray-600

## Component Library

### Navigation/Header
- Horizontal layout with logo/title on left
- Action controls clustered on right (date picker, "Generate Roster", "Export to Excel" buttons)
- Subtle border-bottom for separation

### Roster Table
**Structure**:
- Headers: Date | Weekday | Shift | Assigned | Hours
- Sticky header row
- Alternating subtle row backgrounds for readability
- Row height: comfortable spacing (py-3) for touch targets

**Cells**:
- Date: Medium weight, left-aligned
- Weekday: Badge-style pill with subtle background
- Shift: Text with shift length inline (e.g., "Day 12h", "Night 16h", "24h")
- Assigned: Dropdown with staff color background (orange/pink/blue/grey) - high contrast white text
- Hours: Right-aligned, monospace font

**Interactive States**:
- Assigned cell hover: Slight brightness increase on background
- Dropdown active: Material elevation with shadow
- Invalid selection: Red border pulse with brief error message

### Staff Hours Dashboard
**Layout**: 4-column card grid above or below roster
**Each Card Contains**:
- Staff name (large, bold)
- Total hours (extra-large, monospace)
- Visual indicator: Progress bar or circular progress
- Color accent matching staff color (left border or top stripe)
- Warning state if hours exceed threshold (red text/border)

### Date Range Selector
- Date input for start date (Material Design date picker)
- Week count selector (4 weeks default)
- "Generate" primary button
- Compact horizontal layout

### Export Button
- Secondary button style (outlined)
- Icon: Download/Excel icon from Material Icons
- Position: Top-right of page or below roster

## Staff Color System
Maintain functional color coding:
- **Joflix**: Orange background (#FB923C), white text
- **Peninah**: Pink background (#F9A8D4), dark text (#831843)
- **Ashley**: Blue background (#60A5FA), white text
- **Locum**: Grey background (#9CA3AF), white text

Apply to assigned cells with sufficient contrast for readability.

## Responsive Behavior
**Desktop (lg)**: Full table with all columns visible
**Tablet (md)**: Maintain table, possibly reduce padding
**Mobile**: 
- Stack date/weekday/shift in one row
- Assigned/hours in second row
- Cards stack to single column

## Icons
**Library**: Material Icons (CDN)
- Calendar: date picker
- Download: export button
- Person: staff indicators
- Clock: hours/time references
- Edit: inline edit affordances

## Accessibility
- High contrast between staff colors and text
- Focus indicators on all interactive elements
- ARIA labels for dropdowns and buttons
- Keyboard navigation through table cells
- Screen reader announcements for hours totals

## Key Interactions
1. **Inline Editing**: Click assigned cell → dropdown appears → select staff → color updates immediately
2. **Validation Feedback**: Invalid selections show brief error tooltip, prevent save
3. **Hours Recalculation**: Update in real-time as assignments change
4. **Export**: Single click generates Excel with formatting preserved

## Visual Hierarchy
1. Staff hours totals (most prominent - decision-making data)
2. Current week rows (subtle highlight if within current week)
3. Assigned column (color draws attention)
4. Supporting columns (date, shift details)
5. Actions/controls (accessible but not distracting)

This design balances the data-density requirements of roster management with modern, clean aesthetics that reduce cognitive load during schedule planning.