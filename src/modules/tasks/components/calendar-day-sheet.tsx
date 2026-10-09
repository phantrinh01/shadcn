"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type {
  Task,
  TaskAssignee,
  TaskInput,
} from "@/modules/tasks/services/types/task-types"
import { AddTaskModal } from "./add-task-modal"
import { TaskChip } from "./calendar-task-chip"

interface CalendarDaySheetProps {
  day: Date | null
  tasks: Task[]
  assignees?: TaskAssignee[]
  onOpenChange: (open: boolean) => void
  onSelectTask: (taskId: string) => void
  onAddTask?: (task: TaskInput) => void | Promise<void>
}

/** Panel liệt kê task của một ngày + nút thêm task với hạn là ngày đó. */
export function CalendarDaySheet({
  day,
  tasks,
  assignees,
  onOpenChange,
  onSelectTask,
  onAddTask,
}: CalendarDaySheetProps) {
  const dayKey = day ? format(day, "yyyy-MM-dd") : ""

  return (
    <Sheet open={!!day} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {day ? format(day, "EEEE, dd/MM/yyyy", { locale: vi }) : null}
          </SheetTitle>
          <SheetDescription>
            {tasks.length} task có hạn trong ngày
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4">
          {tasks.length ? (
            tasks.map((task) => (
              <TaskChip
                key={task.id}
                task={task}
                onClick={() => onSelectTask(task.id)}
              />
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Chưa có task nào trong ngày này.
            </p>
          )}
        </div>

        <div className="p-4 pt-0">
          <AddTaskModal
            key={dayKey}
            onAddTask={onAddTask}
            assignees={assignees}
            defaultDueDate={dayKey}
            trigger={
              <Button type="button" className="w-full cursor-pointer">
                <Plus className="size-4" />
                Thêm task ngày này
              </Button>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
