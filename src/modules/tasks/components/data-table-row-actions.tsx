"use client"

import type { Row } from "@tanstack/react-table"

import {
  taskSchema,
  type Attachment,
  type Task,
  type TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import { TaskActionsMenu } from "./task-actions-menu"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onUpdateTask?: (task: Task) => void | Promise<void>
  onDeleteTask?: (taskId: string) => void | Promise<void>
  onDuplicateTask?: (task: Task) => void | Promise<void>
  onAttachmentsChange?: (taskId: string, attachments: Attachment[]) => void
  assignees?: TaskAssignee[]
}

export function DataTableRowActions<TData>({
  row,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onAttachmentsChange,
  assignees = [],
}: DataTableRowActionsProps<TData>) {
  const parsed = taskSchema.safeParse(row.original)

  if (!parsed.success) {
    return null
  }

  return (
    <TaskActionsMenu
      task={parsed.data}
      onUpdateTask={onUpdateTask}
      onDeleteTask={onDeleteTask}
      onDuplicateTask={onDuplicateTask}
      onAttachmentsChange={onAttachmentsChange}
      assignees={assignees}
    />
  )
}
