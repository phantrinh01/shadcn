"use client"

import type {
  Task,
  TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import type { TaskActionHandlers } from "./task-actions-menu"
import { TaskCard } from "./task-card"
import { TaskEmptyState } from "./task-view-states"

interface GridViewProps extends TaskActionHandlers {
  tasks: Task[]
  assignees?: TaskAssignee[]
}

export function GridView({ tasks, assignees, ...handlers }: GridViewProps) {
  if (!tasks.length) return <TaskEmptyState />

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          assignees={assignees}
          {...handlers}
        />
      ))}
    </div>
  )
}
