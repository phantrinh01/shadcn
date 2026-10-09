"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { format, isToday } from "date-fns"

import { cn } from "@/lib/utils"

export const dayKeyOf = (day: Date) => format(day, "yyyy-MM-dd")

export function CalendarDayCell({
  day,
  inMonth,
  onOpen,
  children,
}: {
  day: Date
  inMonth: boolean
  onOpen: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKeyOf(day) })

  return (
    <div
      ref={setNodeRef}
      onClick={onOpen}
      className={cn(
        "min-h-28 cursor-pointer space-y-1 border-b border-r p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
        !inMonth && "bg-muted/30",
        isOver && "bg-primary/10 ring-2 ring-inset ring-primary",
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        aria-label={`Xem task ngày ${format(day, "dd/MM/yyyy")}`}
        className={cn(
          "inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-xs hover:bg-muted",
          !inMonth && "text-muted-foreground",
          isToday(day) &&
            "bg-primary font-semibold text-primary-foreground hover:bg-primary",
        )}
      >
        {format(day, "d")}
      </button>
      {children}
    </div>
  )
}
