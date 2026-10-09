"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { statuses } from "@/modules/tasks/services/task-options"
import type {
  Task,
  TaskAssignee,
  TaskInput,
  TaskStatus,
} from "@/modules/tasks/services/types/task-types"
import { AddTaskModal } from "./add-task-modal"
import type { TaskActionHandlers } from "./task-actions-menu"
import { TaskCard } from "./task-card"

interface BoardViewProps extends TaskActionHandlers {
  tasks: Task[]
  assignees?: TaskAssignee[]
  onAddTask?: (task: TaskInput) => void | Promise<void>
}

function DraggableTask({
  task,
  children,
}: {
  task: Task
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      {children}
    </div>
  )
}

function BoardColumn({
  status,
  tasks,
  children,
  onAddTask,
  assignees,
}: {
  status: (typeof statuses)[number]
  tasks: Task[]
  children: React.ReactNode
  onAddTask?: (task: TaskInput) => void | Promise<void>
  assignees?: TaskAssignee[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[300px] shrink-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3 transition-colors md:w-auto md:min-w-0 md:flex-1",
        isOver && "border-primary bg-muted/60"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <status.icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{status.label}</span>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <AddTaskModal
          onAddTask={onAddTask}
          assignees={assignees}
          defaultStatus={status.value}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer"
              aria-label={`Thêm task vào ${status.label}`}
            >
              <Plus className="size-4" />
            </Button>
          }
        />
      </div>
      <div className="flex min-h-24 flex-col gap-3">{children}</div>
    </div>
  )
}

export function BoardView({
  tasks,
  assignees,
  onAddTask,
  onUpdateTask,
  ...handlers
}: BoardViewProps) {
  // Optimistic: giữ status tạm theo task id cho tới khi lưu xong (hoặc lỗi → rollback).
  const [pending, setPending] = React.useState<Record<string, TaskStatus>>({})
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const displayTasks = React.useMemo(
    () =>
      tasks.map((task) =>
        pending[task.id] ? { ...task, status: pending[task.id] } : task
      ),
    [tasks, pending]
  )
  const activeTask = displayTasks.find((task) => task.id === activeId)

  function clearPending(taskId: string) {
    setPending((prev) => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)

    const taskId = String(event.active.id)
    const nextStatus = event.over?.id as TaskStatus | undefined
    const original = tasks.find((task) => task.id === taskId)

    if (!original || !nextStatus || original.status === nextStatus) return

    setPending((prev) => ({ ...prev, [taskId]: nextStatus }))
    try {
      await onUpdateTask?.({ ...original, status: nextStatus })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái task"
      )
    } finally {
      clearPending(taskId)
    }
  }

  return (
    <DndContext
      id="tasks-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {statuses.map((status) => {
            const columnTasks = displayTasks.filter(
              (task) => task.status === status.value
            )

            return (
              <BoardColumn
                key={status.value}
                status={status}
                tasks={columnTasks}
                onAddTask={onAddTask}
                assignees={assignees}
              >
                {columnTasks.map((task) => (
                  <DraggableTask key={task.id} task={task}>
                    <TaskCard
                      task={task}
                      assignees={assignees}
                      showStatus={false}
                      onUpdateTask={onUpdateTask}
                      {...handlers}
                    />
                  </DraggableTask>
                ))}
                {!columnTasks.length ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Kéo task vào đây
                  </p>
                ) : null}
              </BoardColumn>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            assignees={assignees}
            showStatus={false}
            className="rotate-2 shadow-lg"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
