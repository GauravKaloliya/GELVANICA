"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  disabled?: (date: Date) => boolean;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): Date[] {
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function Calendar({ selected, onSelect, className, disabled }: CalendarProps) {
  const [viewDate, setViewDate] = React.useState(selected || new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getDaysInMonth(year, month);
  const firstDayOfWeek = days[0].getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className={cn("p-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-foreground">
          {MONTHS[month]} {year}
        </p>
        <button
          onClick={nextMonth}
          className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isTodayDate = isToday(day);
          const isDisabled = disabled?.(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect?.(day)}
              disabled={isDisabled}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                "hover:bg-surface",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                "disabled:pointer-events-none disabled:opacity-50",
                isSelected && "accent-bg font-medium hover:bg-surface",
                isTodayDate && !isSelected && "border border-border",
                !isSelected && !isTodayDate && "text-muted"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
