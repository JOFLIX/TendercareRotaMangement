# Healthcare Staff Roster Management System

## Overview

This is a healthcare scheduling application designed to manage staff rosters for medical facilities. The system automates shift assignment based on configurable rules, provides visual color-coding for staff members, tracks hours, and exports schedules to Excel format. The application focuses on clarity and efficiency for managing complex scheduling requirements including weekend restrictions, alternating assignments, and staff availability constraints.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**Routing**: Wouter for lightweight client-side routing with a single main roster page.

**UI Component Library**: Shadcn/ui components built on Radix UI primitives, configured with the "new-york" style variant. Components follow Material Design principles adapted for healthcare scheduling with emphasis on data density and clarity.

**Styling**: Tailwind CSS with custom theme configuration supporting light/dark modes. Uses CSS variables for theming with HSL color values. Design system emphasizes productivity with consistent spacing units (2, 4, 6, 8) and color-coding for staff assignments.

**State Management**: TanStack Query (React Query) for server state management with configured defaults for refetch behavior and stale time. Local state managed with React hooks for UI interactions and temporary shift modifications.

**Type Safety**: Full TypeScript implementation with shared schema definitions between client and server using Zod for runtime validation.

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful endpoints for roster operations:
- GET `/api/roster` - Retrieve current roster
- POST `/api/roster/generate` - Generate new roster with shift assignments
- PATCH `/api/roster/shifts/:id` - Update individual shift assignments
- GET `/api/roster/export` - Generate Excel file for download

**Business Logic**: 
- Roster generation algorithm implements complex scheduling rules including day-of-week restrictions, staff availability constraints, and alternating assignment patterns
- Rules engine enforces Saturday day shifts locked to specific staff, weekend/weekday differentiation, and rotation schedules
- Validation layer ensures staff assignments comply with allowed staff lists per shift

**Data Storage**: In-memory storage implementation (MemStorage class) for development/demonstration. Storage interface (IStorage) abstracts persistence layer to enable future database integration without code changes.

**Build System**: ESBuild for server-side bundling with selective dependency bundling to optimize cold start performance. Vite handles client-side bundling with code splitting and optimization.

### Core Data Model

**Schema Definition**: Shared Zod schemas in `/shared/schema.ts` provide single source of truth for:
- Staff members (Ashley, Peninah, Joflix, Locum) with associated color mappings
- Shift types (Day, Night, 24h) with hour calculations
- Roster structure containing shift collections with date ranges
- Staff hours summaries for reporting

**Staff Assignment Rules**:
- Saturday Day: Restricted to Joflix only
- Saturday Night: Ashley, Peninah, or Locum (alternating pattern with Locum after week 3)
- Sunday: Ashley, Peninah, or Locum only (no Joflix)
- Weekdays: All staff available
- Alternating patterns based on week index for fair distribution

**Color Coding System**: Each staff member has consistent color representation across UI:
- Joflix: Orange (bg-orange-400/500)
- Peninah: Pink (bg-pink-300/400)
- Ashley: Blue (bg-blue-400/500)
- Locum: Gray (bg-gray-400/500)

### Development Workflow

**Hot Module Replacement**: Vite middleware integrated with Express server for instant feedback during development.

**Development Mode**: TSX execution with middleware mode Vite server. Production builds use ESBuild for server and Vite for client with output to `/dist`.

**Type Checking**: Incremental TypeScript compilation with build info caching. Path aliases configured for clean imports (@/, @shared/, @assets/).

**Error Handling**: Replit-specific plugins for runtime error overlays and development banners in development environment.

## External Dependencies

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessibility-compliant components (dialogs, popovers, selects, etc.)
- **Shadcn/ui**: Pre-styled component patterns built on Radix primitives
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Carousel functionality for potential future features

### Data Management
- **TanStack Query v5**: Server state management with caching and synchronization
- **React Hook Form**: Form state management with Zod resolver integration
- **Zod**: Schema validation and TypeScript type inference
- **Drizzle ORM**: SQL query builder configured for PostgreSQL (schema ready, database integration pending)

### Date/Time Handling
- **date-fns v3**: Date manipulation and formatting utilities for shift scheduling logic

### Excel Export
- **ExcelJS**: Excel workbook generation with styling, formatting, and data validation for roster exports

### Styling
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **Class Variance Authority**: Component variant management
- **clsx/tailwind-merge**: Conditional className composition

### Database (Configured, Not Yet Connected)
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **Drizzle Kit**: Database migration and schema push tooling
- **PostgreSQL**: Target database (connection configured via DATABASE_URL environment variable)

### Session Management (Installed, Not Yet Implemented)
- **express-session**: Session middleware
- **connect-pg-simple**: PostgreSQL session store

### Build Tools
- **Vite**: Frontend build tool and dev server
- **ESBuild**: Backend bundler for production
- **TypeScript**: Type system and compiler
- **TSX**: TypeScript execution for development

### Development Tools (Replit-specific)
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Code navigation assistance
- **@replit/vite-plugin-dev-banner**: Development environment indicators