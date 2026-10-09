"use client"

import { format, isPast } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { priorities, statuses } from "@/modules/tasks/services/task-options"
import type {
  Task,
  TaskAssignee,
  TaskPriority,
  TaskStatus,
} from "@/modules/tasks/services/types/task-types"

export const priorityColors: Record<TaskPriority, string> = {
  high: "border-red-700 text-red-700 dark:text-red-400",
  medium: "border-orange-500 text-orange-700 dark:text-orange-400",
  low: "border-gray-500 text-gray-700 dark:text-gray-400",
}

/** Màu nền cho chip trên calendar, theo priority. */
export const priorityChipColors: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-300",
  medium:
    "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300",
  low: "bg-muted text-muted-foreground hover:bg-muted/70",
}

export function isTaskOverdue(task: Pick<Task, "due_date" | "status">) {
  return (
    !!task.due_date &&
    task.status !== "done" &&
    isPast(new Date(task.due_date))
  )
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const option = priorities.find((item) => item.value === priority)
  if (!option) return null

  return (
    <Badge variant="outline" className={cn("pl-2", priorityColors[priority])}>
      <span className="text-sm">{option.label}</span>
    </Badge>
  )
}

export function StatusLabel({
  status,
  className,
}: {
  status: TaskStatus
  className?: string
}) {
  const option = statuses.find((item) => item.value === status)
  if (!option) return null

  return (
    <div className={cn("flex items-center", className)}>
      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{option.label}</span>
    </div>
  )
}

export function DueDate({ task }: { task: Task }) {
  if (!task.due_date) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <span
      className={cn(
        "whitespace-nowrap text-sm",
        isTaskOverdue(task) && "font-medium text-red-600 dark:text-red-400"
      )}
    >
      {format(new Date(task.due_date), "dd/MM/yyyy")}
    </span>
  )
}

export function TagBadges({
  tags = [],
  className,
}: {
  tags?: string[]
  className?: string
}) {
  if (!tags.length) return null

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.slice(0, 3).map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
      {tags.length > 3 && <Badge variant="outline">+{tags.length - 3}</Badge>}
    </div>
  )
}

export function AssigneeAvatar({
  assignee,
  className,
}: {
  assignee?: TaskAssignee
  className?: string
}) {
  if (!assignee) {
    return (
      <span className="text-xs text-muted-foreground">Unassigned</span>
    )
  }

  const initials = assignee.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Avatar className="size-6">
        {assignee.photoURL ? (
          <AvatarImage src={assignee.photoURL} alt={assignee.name} />
        ) : null}
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="max-w-[120px] truncate text-xs">{assignee.name}</span>
    </div>
  )
}
