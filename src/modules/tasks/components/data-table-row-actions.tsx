"use client"

import * as React from "react"
import type { Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  taskSchema,
  type Task,
  type TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import {
  parseTaskForm,
  TaskFormFields,
  taskToFormValues,
  type TaskFormValues,
} from "./task-form-fields"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onUpdateTask?: (task: Task) => void | Promise<void>
  onDeleteTask?: (taskId: string) => void | Promise<void>
  onDuplicateTask?: (task: Task) => void | Promise<void>
  assignees?: TaskAssignee[]
}

export function DataTableRowActions<TData>({
  row,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  assignees = [],
}: DataTableRowActionsProps<TData>) {
  const parsed = taskSchema.safeParse(row.original)
  const [editOpen, setEditOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<TaskFormValues | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {}
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!parsed.success) {
    return null
  }

  const task = parsed.data

  function openEditDialog() {
    setDraft(taskToFormValues(task))
    setFieldErrors({})
    setError(null)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!draft) return

    const result = parseTaskForm(draft)
    if (!result.success) {
      setFieldErrors(result.errors)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await onUpdateTask?.({ ...task, ...result.data })
      setEditOpen(false)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to update task"
      )
    } finally {
      setIsSaving(false)
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
          <DropdownMenuItem className="cursor-pointer" onClick={openEditDialog}>
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
            onClick={() => onDeleteTask?.(task.id)}
          >
            Delete
            <DropdownMenuShortcut className="text-destructive">
              ⌘⌫
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details and save them to Firestore.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-5">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <TaskFormFields
                idPrefix={`edit-${task.id}`}
                values={draft}
                onChange={setDraft}
                assignees={assignees}
                errors={fieldErrors}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
