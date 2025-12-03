import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { RosterComparison } from "@/components/roster-comparison";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, ArrowLeft, GitCompare } from "lucide-react";
import { format } from "date-fns";
import type { RosterSummary } from "@shared/schema";

export default function ComparisonPage() {
  const [leftRosterId, setLeftRosterId] = useState<string>("");
  const [rightRosterId, setRightRosterId] = useState<string>("");

  const { data: rosters, isLoading } = useQuery<RosterSummary[]>({
    queryKey: ["/api/rosters"],
  });

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
                <GitCompare className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Compare Rosters</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  View differences between roster versions
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Rosters to Compare</CardTitle>
            <CardDescription>
              Choose two roster versions to see the differences in staff assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Original Roster</label>
                <Select
                  value={leftRosterId}
                  onValueChange={setLeftRosterId}
                  disabled={isLoading || !rosters?.length}
                >
                  <SelectTrigger data-testid="select-left-roster">
                    <SelectValue placeholder="Select a roster" />
                  </SelectTrigger>
                  <SelectContent>
                    {rosters?.map((roster) => (
                      <SelectItem key={roster.id} value={roster.id}>
                        {roster.name} ({format(new Date(roster.createdAt), "MMM d, HH:mm")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Compare With</label>
                <Select
                  value={rightRosterId}
                  onValueChange={setRightRosterId}
                  disabled={isLoading || !rosters?.length}
                >
                  <SelectTrigger data-testid="select-right-roster">
                    <SelectValue placeholder="Select a roster" />
                  </SelectTrigger>
                  <SelectContent>
                    {rosters?.map((roster) => (
                      <SelectItem key={roster.id} value={roster.id}>
                        {roster.name} ({format(new Date(roster.createdAt), "MMM d, HH:mm")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(!rosters || rosters.length < 2) && !isLoading && (
              <p className="text-sm text-muted-foreground mt-4">
                You need at least two saved rosters to compare. Generate more rosters from the main page.
              </p>
            )}
          </CardContent>
        </Card>

        {leftRosterId && rightRosterId && leftRosterId !== rightRosterId && (
          <RosterComparison leftRosterId={leftRosterId} rightRosterId={rightRosterId} />
        )}

        {leftRosterId && rightRosterId && leftRosterId === rightRosterId && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Please select two different rosters to compare
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
