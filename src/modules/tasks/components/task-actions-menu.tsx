"use client"

import * as React from "react"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  Attachment,
  Task,
  TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import { TaskEditDialog } from "./task-edit-dialog"

export interface TaskActionHandlers {
  onUpdateTask?: (task: Task) => void | Promise<void>
  onDeleteTask?: (taskId: string) => void | Promise<void>
  onDuplicateTask?: (task: Task) => void | Promise<void>
  onAttachmentsChange?: (taskId: string, attachments: Attachment[]) => void
}

interface TaskActionsMenuProps extends TaskActionHandlers {
  task: Task
  assignees?: TaskAssignee[]
}

/** Menu "..." (edit / duplicate / delete) dùng chung cho Table, Grid và Board. */
export function TaskActionsMenu({
  task,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onAttachmentsChange,
  assignees = [],
}: TaskActionsMenuProps) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleConfirmDelete() {
    try {
      setIsDeleting(true)
      await onDeleteTask?.(task.id)
      setDeleteOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted cursor-pointer"
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setEditOpen(true)}
          >
            Edit Task
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onDuplicateTask?.(task)}
          >
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
            <DropdownMenuShortcut className="text-destructive">
              ⌘⌫
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              Task &quot;{task.title}&quot; will be permanently deleted. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                // Keep the dialog open until deletion finishes.
                event.preventDefault()
                void handleConfirmDelete()
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskEditDialog
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdateTask={onUpdateTask}
        onAttachmentsChange={onAttachmentsChange}
        assignees={assignees}
      />
    </>
  )
}
