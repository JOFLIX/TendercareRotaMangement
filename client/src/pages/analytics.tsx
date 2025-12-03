import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BarChart3, Users, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import type { Roster, StaffMember } from "@shared/schema";
import { STAFF_MEMBERS, STAFF_COLORS } from "@shared/schema";
import { calculateStaffHours } from "@/lib/roster-utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ["#60A5FA", "#F9A8D4", "#FB923C", "#9CA3AF"];

interface HoursDistributionData {
  name: string;
  hours: number;
  shifts: number;
  color: string;
}

interface CoverageGap {
  date: string;
  shiftType: string;
  weekday: string;
}

interface FairnessMetrics {
  standardDeviation: number;
  maxHours: number;
  minHours: number;
  avgHours: number;
  fairnessScore: number;
}

function StaffBadge({ staff }: { staff: StaffMember }) {
  const colors = STAFF_COLORS[staff];
  return (
    <Badge className={`${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
      {staff}
    </Badge>
  );
}

export default function AnalyticsPage() {
  const { data: roster, isLoading } = useQuery<Roster | null>({
    queryKey: ["/api/roster"],
  });

  const staffHours = useMemo(() => {
    if (!roster) return [];
    return calculateStaffHours(roster.shifts);
  }, [roster]);

  const hoursDistribution: HoursDistributionData[] = useMemo(() => {
    return staffHours.map((s, index) => ({
      name: s.name,
      hours: s.totalHours,
      shifts: s.shiftCount,
      color: COLORS[index % COLORS.length],
    }));
  }, [staffHours]);

  const coverageGaps: CoverageGap[] = useMemo(() => {
    if (!roster) return [];
    return roster.shifts
      .filter((shift) => !shift.assigned)
      .map((shift) => ({
        date: shift.date,
        shiftType: shift.shiftType,
        weekday: shift.weekday,
      }));
  }, [roster]);

  const fairnessMetrics: FairnessMetrics = useMemo(() => {
    if (staffHours.length === 0) {
      return { standardDeviation: 0, maxHours: 0, minHours: 0, avgHours: 0, fairnessScore: 100 };
    }

    const hours = staffHours.map((s) => s.totalHours);
    const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
    const squaredDiffs = hours.map((h) => Math.pow(h - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / hours.length;
    const stdDev = Math.sqrt(variance);

    const maxHours = Math.max(...hours);
    const minHours = Math.min(...hours);
    
    const maxPossibleDeviation = avg;
    const fairnessScore = maxPossibleDeviation > 0 
      ? Math.max(0, Math.min(100, 100 - (stdDev / maxPossibleDeviation) * 100))
      : 100;

    return {
      standardDeviation: Math.round(stdDev * 10) / 10,
      maxHours,
      minHours,
      avgHours: Math.round(avg * 10) / 10,
      fairnessScore: Math.round(fairnessScore),
    };
  }, [staffHours]);

  const weekdayDistribution = useMemo(() => {
    if (!roster) return [];
    
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const distribution = days.map((day) => {
      const dayShifts = roster.shifts.filter((s) => s.weekday === day);
      const assignedShifts = dayShifts.filter((s) => s.assigned);
      return {
        day,
        total: dayShifts.length,
        assigned: assignedShifts.length,
        coverage: dayShifts.length > 0 ? Math.round((assignedShifts.length / dayShifts.length) * 100) : 0,
      };
    });
    return distribution;
  }, [roster]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-home">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Hours distribution and fairness metrics
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !roster ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No roster data available. Generate a roster first to see analytics.
              </p>
              <Link href="/">
                <Button className="mt-4" data-testid="button-go-to-roster">
                  Go to Roster
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-2xl font-bold">
                        {staffHours.reduce((acc, s) => acc + s.totalHours, 0)}h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Staff</p>
                      <p className="text-2xl font-bold">
                        {staffHours.filter((s) => s.totalHours > 0).length}/{STAFF_MEMBERS.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unassigned Shifts</p>
                      <p className="text-2xl font-bold">{coverageGaps.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fairness Score</p>
                      <p className="text-2xl font-bold">{fairnessMetrics.fairnessScore}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hours Distribution by Staff</CardTitle>
                  <CardDescription>
                    Total hours assigned to each staff member
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hoursDistribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)"
                          }}
                          formatter={(value: number) => [`${value}h`, "Hours"]}
                        />
                        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                          {hoursDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shift Distribution</CardTitle>
                  <CardDescription>
                    Number of shifts per staff member
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={hoursDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="shifts"
                          nameKey="name"
                          label={({ name, shifts }) => `${name}: ${shifts}`}
                          labelLine={false}
                        >
                          {hoursDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)"
                          }}
                          formatter={(value: number) => [value, "Shifts"]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fairness Metrics</CardTitle>
                  <CardDescription>
                    How evenly hours are distributed across staff
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Fairness Score</span>
                      <span className="font-medium">{fairnessMetrics.fairnessScore}%</span>
                    </div>
                    <Progress value={fairnessMetrics.fairnessScore} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Higher score means more equal distribution
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Average Hours</p>
                      <p className="text-lg font-semibold">{fairnessMetrics.avgHours}h</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Std Deviation</p>
                      <p className="text-lg font-semibold">{fairnessMetrics.standardDeviation}h</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Min Hours</p>
                      <p className="text-lg font-semibold">{fairnessMetrics.minHours}h</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Max Hours</p>
                      <p className="text-lg font-semibold">{fairnessMetrics.maxHours}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Coverage Gaps</CardTitle>
                  <CardDescription>
                    Shifts that are not yet assigned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {coverageGaps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <span className="text-green-500 font-medium">All shifts are assigned</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {coverageGaps.slice(0, 10).map((gap, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-md bg-amber-50 dark:bg-amber-900/20"
                        >
                          <span className="text-sm">
                            {gap.weekday}, {gap.date}
                          </span>
                          <Badge variant="outline">{gap.shiftType}</Badge>
                        </div>
                      ))}
                      {coverageGaps.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center pt-2">
                          +{coverageGaps.length - 10} more unassigned shifts
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Coverage</CardTitle>
                <CardDescription>
                  Shift coverage by day of the week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)"
                        }}
                        formatter={(value: number, name: string) => [
                          name === "total" ? `${value} shifts` : `${value} assigned`,
                          name === "total" ? "Total" : "Assigned"
                        ]}
                      />
                      <Bar dataKey="total" fill="#E5E7EB" radius={[4, 4, 0, 0]} name="Total" />
                      <Bar dataKey="assigned" fill="#60A5FA" radius={[4, 4, 0, 0]} name="Assigned" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
