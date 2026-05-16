"use client"

import * as React from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Calendar({
  selected,
  onSelect,
  className,
}: {
  selected?: Date
  onSelect: (date: Date) => void
  className?: string
}) {
  const [viewDate, setViewDate] = React.useState(selected ?? new Date())

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  return (
    <div className={cn("w-[280px] p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(viewDate, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {dayNames.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-sm">
        {days.map((day, i) => {
          const isSelected = selected ? isSameDay(day, selected) : false
          const isCurrentMonth = isSameMonth(day, viewDate)
          return (
            <button
              key={i}
              type="button"
              disabled={!isCurrentMonth}
              onClick={() => onSelect(day)}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                !isCurrentMonth && "pointer-events-none opacity-0",
                isSelected && "bg-primary text-white",
                !isSelected && isToday(day) && "border border-primary text-primary",
                !isSelected && !isToday(day) && isCurrentMonth && "hover:bg-muted",
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar }
