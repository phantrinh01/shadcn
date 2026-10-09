"use client"

import * as React from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type {
  Task,
  TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import { isTaskOverdue, priorityChipColors } from "./task-badges"
import { TaskEditDialog } from "./task-edit-dialog"
import type { TaskActionHandlers } from "./task-actions-menu"

const MAX_VISIBLE_CHIPS = 2
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

interface CalendarViewProps extends TaskActionHandlers {
  tasks: Task[]
  assignees?: TaskAssignee[]
}

function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={task.title}
      className={cn(
        "w-full cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-xs transition-colors",
        priorityChipColors[task.priority],
        task.status === "done" && "line-through opacity-60",
        isTaskOverdue(task) && "ring-1 ring-red-500"
      )}
    >
      {task.title}
    </button>
  )
}

export function CalendarView({
  tasks,
  assignees,
  onUpdateTask,
}: CalendarViewProps) {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()))
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month]
  )

  const { scheduled, unscheduled } = React.useMemo(() => {
    const withDate: Task[] = []
    const withoutDate: Task[] = []
    for (const task of tasks) {
      ;(task.due_date ? withDate : withoutDate).push(task)
    }
    return { scheduled: withDate, unscheduled: withoutDate }
  }, [tasks])

  const editingTask = tasks.find((task) => task.id === editingId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">
          {format(month, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            aria-label="Tháng trước"
            onClick={() => setMonth((current) => subMonths(current, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            aria-label="Tháng sau"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px] overflow-hidden rounded-md border">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
              >
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayTasks = scheduled.filter((task) =>
                isSameDay(new Date(task.due_date as string), day)
              )
              const visible = dayTasks.slice(0, MAX_VISIBLE_CHIPS)
              const hidden = dayTasks.slice(MAX_VISIBLE_CHIPS)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-28 space-y-1 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                    !isSameMonth(day, month) && "bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs",
                      !isSameMonth(day, month) && "text-muted-foreground",
                      isToday(day) && "bg-primary font-semibold text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {visible.map((task) => (
                    <TaskChip
                      key={task.id}
                      task={task}
                      onClick={() => setEditingId(task.id)}
                    />
                  ))}
                  {hidden.length ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full cursor-pointer rounded px-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                        >
                          +{hidden.length} nữa
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 space-y-1 p-2">
                        <p className="px-1 pb-1 text-xs font-medium">
                          {format(day, "dd/MM/yyyy")}
                        </p>
                        {dayTasks.map((task) => (
                          <TaskChip
                            key={task.id}
                            task={task}
                            onClick={() => setEditingId(task.id)}
                          />
                        ))}
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Chưa có hạn ({unscheduled.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unscheduled.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unscheduled.map((task) => (
                <TaskChip
                  key={task.id}
                  task={task}
                  onClick={() => setEditingId(task.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tất cả task đều đã có hạn.
            </p>
          )}
        </CardContent>
      </Card>

      {editingTask ? (
        <TaskEditDialog
          key={editingTask.id}
          task={editingTask}
          open
          onOpenChange={(open) => !open && setEditingId(null)}
          onUpdateTask={onUpdateTask}
          assignees={assignees}
        />
      ) : null}
    </div>
  )
}
