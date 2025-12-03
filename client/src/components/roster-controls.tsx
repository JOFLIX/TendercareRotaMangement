import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RosterControlsProps {
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  weeks: number;
  onWeeksChange: (weeks: number) => void;
  onGenerate: () => void;
  onExport: () => void;
  isGenerating?: boolean;
  isExporting?: boolean;
  hasRoster?: boolean;
}

export function RosterControls({
  startDate,
  onStartDateChange,
  weeks,
  onWeeksChange,
  onGenerate,
  onExport,
  isGenerating,
  isExporting,
  hasRoster,
}: RosterControlsProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
              data-testid="button-date-picker"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd MMM yyyy") : "Select start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                onStartDateChange(date);
                setCalendarOpen(false);
              }}
              disabled={(date) => {
                const day = date.getDay();
                return day !== 1;
              }}
              initialFocus
            />
            <div className="p-3 border-t text-xs text-muted-foreground text-center">
              Only Mondays can be selected as start date
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={weeks.toString()}
          onValueChange={(value) => onWeeksChange(parseInt(value, 10))}
        >
          <SelectTrigger className="w-[100px]" data-testid="select-weeks">
            <SelectValue placeholder="Weeks" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 8, 12].map((w) => (
              <SelectItem key={w} value={w.toString()}>
                {w} week{w !== 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onGenerate}
          disabled={!startDate || isGenerating}
          data-testid="button-generate-roster"
        >
          {isGenerating ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Generate Roster
        </Button>

        <Button
          variant="outline"
          onClick={onExport}
          disabled={!hasRoster || isExporting}
          data-testid="button-export-excel"
        >
          {isExporting ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          Export Excel
        </Button>
      </div>
    </div>
  );
}
