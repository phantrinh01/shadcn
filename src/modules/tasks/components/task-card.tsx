"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  Task,
  TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import {
  AssigneeAvatar,
  DueDate,
  isTaskOverdue,
  OverdueBadge,
  PriorityBadge,
  StatusLabel,
  TagBadges,
} from "./task-badges"
import { TaskActionsMenu, type TaskActionHandlers } from "./task-actions-menu"

interface TaskCardProps extends TaskActionHandlers {
  task: Task
  assignees?: TaskAssignee[]
  /** Board đã hiển thị status theo cột nên có thể ẩn đi. */
  showStatus?: boolean
  className?: string
}

export function TaskCard({
  task,
  assignees = [],
  showStatus = true,
  className,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
}: TaskCardProps) {
  const assignee = assignees.find((member) => member.uid === task.assignee)

  return (
    <Card
      className={cn(
        "gap-3 py-4",
        isTaskOverdue(task) &&
          "border-red-500/70 bg-red-50/40 dark:bg-red-950/20",
        className
      )}
    >
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
          {/* Chặn pointerdown để mở menu/dialog không kích hoạt kéo thả của Board. */}
          <div
            className="-mr-2 -mt-1.5 shrink-0"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <TaskActionsMenu
              task={task}
              assignees={assignees}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onDuplicateTask={onDuplicateTask}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {showStatus ? <StatusLabel status={task.status} /> : null}
          <OverdueBadge task={task} />
        </div>

        <TagBadges tags={task.tags} />

        <div className="flex items-center justify-between gap-2">
          <AssigneeAvatar assignee={assignee} />
          <DueDate task={task} />
        </div>
      </CardContent>
    </Card>
  )
}
