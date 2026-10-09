"use client"

import { useDraggable } from "@dnd-kit/core"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Task } from "@/modules/tasks/services/types/task-types"
import { isTaskOverdue, priorityChipColors } from "./task-badges"

interface TaskChipProps {
  task: Task
  onClick: () => void
  /** Bật kéo thả (cần nằm trong DndContext). */
  draggable?: boolean
}

function ChipButton({
  task,
  onClick,
  className,
  ...rest
}: Omit<TaskChipProps, "draggable"> &
  Omit<React.ComponentProps<"button">, "onClick">) {
  const overdue = isTaskOverdue(task)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      title={overdue ? `${task.title} (quá hạn)` : task.title}
      className={cn(
        "flex w-full cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs transition-colors",
        priorityChipColors[task.priority],
        task.status === "done" && "line-through opacity-60",
        // Quá hạn = viền đậm + icon, không chỉ đổi màu nền (đỏ của priority high).
        overdue && "border-2 border-dashed border-red-600 dark:border-red-400",
        className,
      )}
      {...rest}
    >
      {overdue ? (
        <AlertTriangle className="size-3 shrink-0 text-red-600 dark:text-red-400" />
      ) : null}
      <span className="truncate">{task.title}</span>
    </button>
  )
}

function DraggableChip({ task, onClick }: Omit<TaskChipProps, "draggable">) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  })

  return (
    <ChipButton
      ref={setNodeRef}
      task={task}
      onClick={onClick}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    />
  )
}

export function TaskChip({ task, onClick, draggable }: TaskChipProps) {
  return draggable ? (
    <DraggableChip task={task} onClick={onClick} />
  ) : (
    <ChipButton task={task} onClick={onClick} />
  )
}
