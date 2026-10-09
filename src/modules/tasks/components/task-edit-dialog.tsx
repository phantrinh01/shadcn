"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type {
  Task,
  TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import {
  parseTaskForm,
  TaskFormFields,
  taskToFormValues,
  type TaskFormValues,
} from "./task-form-fields"

interface TaskEditDialogProps {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateTask?: (task: Task) => void | Promise<void>
  assignees?: TaskAssignee[]
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  assignees = [],
}: TaskEditDialogProps) {
  const [draft, setDraft] = React.useState<TaskFormValues>(() =>
    taskToFormValues(task)
  )
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {}
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Mỗi lần mở dialog thì nạp lại dữ liệu mới nhất của task.
  React.useEffect(() => {
    if (open) {
      setDraft(taskToFormValues(task))
      setFieldErrors({})
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSave() {
    const result = parseTaskForm(draft)
    if (!result.success) {
      setFieldErrors(result.errors)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await onUpdateTask?.({ ...task, ...result.data })
      onOpenChange(false)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to update task"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the task details and save them to Firestore.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <TaskFormFields
            idPrefix={`edit-${task.id}`}
            values={draft}
            onChange={setDraft}
            assignees={assignees}
            errors={fieldErrors}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
