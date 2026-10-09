"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  Task,
  TaskAssignee,
  TaskInput,
} from "@/modules/tasks/services/types/task-types"
import { CalendarDayCell, dayKeyOf } from "./calendar-day-cell"
import { CalendarDaySheet } from "./calendar-day-sheet"
import { TaskChip } from "./calendar-task-chip"
import { TaskEditDialog } from "./task-edit-dialog"
import type { TaskActionHandlers } from "./task-actions-menu"

const MAX_VISIBLE_CHIPS = 2
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

interface CalendarViewProps extends TaskActionHandlers {
  tasks: Task[]
  assignees?: TaskAssignee[]
  onAddTask?: (task: TaskInput) => void | Promise<void>
}


/** Giữ nguyên giờ của `iso`, chỉ đổi sang ngày `day`. */
function moveToDay(iso: string, day: Date) {
  const moved = new Date(iso)
  moved.setFullYear(day.getFullYear(), day.getMonth(), day.getDate())
  return moved.toISOString()
}

export function CalendarView({
  tasks,
  assignees,
  onAddTask,
  onUpdateTask,
}: CalendarViewProps) {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()))
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null)
  // Optimistic: due_date tạm theo task id cho tới khi lưu xong (hoặc lỗi → rollback).
  const [pending, setPending] = React.useState<Record<string, string>>({})
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const displayTasks = React.useMemo(
    () =>
      tasks.map((task) =>
        pending[task.id] ? { ...task, due_date: pending[task.id] } : task,
      ),
    [tasks, pending],
  )

  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  )

  const { scheduled, unscheduled } = React.useMemo(() => {
    const withDate: Task[] = []
    const withoutDate: Task[] = []
    for (const task of displayTasks) {
      ;(task.due_date ? withDate : withoutDate).push(task)
    }
    return { scheduled: withDate, unscheduled: withoutDate }
  }, [displayTasks])

  const editingTask = tasks.find((task) => task.id === editingId)
  const activeTask = displayTasks.find((task) => task.id === activeId)
  const selectedDayTasks = selectedDay
    ? scheduled.filter((task) =>
        isSameDay(new Date(task.due_date as string), selectedDay),
      )
    : []

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)

    const taskId = String(event.active.id)
    const original = tasks.find((task) => task.id === taskId)
    if (!original?.due_date || !event.over) return

    const targetDay = parseISO(String(event.over.id))
    if (isSameDay(new Date(original.due_date), targetDay)) return

    const nextDueDate = moveToDay(original.due_date, targetDay)
    setPending((prev) => ({ ...prev, [taskId]: nextDueDate }))
    try {
      await onUpdateTask?.({ ...original, due_date: nextDueDate })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể đổi hạn của task",
      )
    } finally {
      setPending((prev) => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    }
  }

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

      <DndContext
        id="tasks-calendar"
        sensors={sensors}
        onDragStart={(event) => setActiveId(String(event.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
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
                  isSameDay(new Date(task.due_date as string), day),
                )
                const visible = dayTasks.slice(0, MAX_VISIBLE_CHIPS)
                const hidden = dayTasks.slice(MAX_VISIBLE_CHIPS)

                return (
                  <CalendarDayCell
                    key={dayKeyOf(day)}
                    day={day}
                    inMonth={isSameMonth(day, month)}
                    onOpen={() => setSelectedDay(day)}
                  >
                    {visible.map((task) => (
                      <TaskChip
                        key={task.id}
                        task={task}
                        draggable
                        onClick={() => setEditingId(task.id)}
                      />
                    ))}
                    {hidden.length ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedDay(day)
                        }}
                        className="w-full cursor-pointer rounded px-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                      >
                        +{hidden.length} nữa
                      </button>
                    ) : null}
                  </CalendarDayCell>
                )
              })}
            </div>
          </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <TaskChip task={activeTask} onClick={() => undefined} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <CalendarDaySheet
        day={selectedDay}
        tasks={selectedDayTasks}
        assignees={assignees}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        onSelectTask={(taskId) => {
          setSelectedDay(null)
          setEditingId(taskId)
        }}
        onAddTask={onAddTask}
      />

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
