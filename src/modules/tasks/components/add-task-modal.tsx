"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type {
  TaskAssignee,
  TaskInput,
  TaskStatus,
} from "@/modules/tasks/services/types/task-types"
import {
  emptyTaskForm,
  parseTaskForm,
  TaskFormFields,
  type TaskFormValues,
} from "./task-form-fields"

interface AddTaskModalProps {
  onAddTask?: (task: TaskInput) => void | Promise<void>
  assignees?: TaskAssignee[]
  trigger?: React.ReactNode
  defaultStatus?: TaskStatus
}

export function AddTaskModal({
  onAddTask,
  assignees = [],
  trigger,
  defaultStatus = "todo",
}: AddTaskModalProps) {
  const initialValues: TaskFormValues = { ...emptyTaskForm, status: defaultStatus }
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<TaskFormValues>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setValues(initialValues)
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = parseTaskForm(values)
    if (!result.success) {
      setErrors(result.errors)
      return
    }

    try {
      setIsSubmitting(true)
      await onAddTask?.(result.data)
      reset()
      setOpen(false)
    } catch (error) {
      setErrors({
        root: error instanceof Error ? error.message : "Failed to create task",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task to track work and progress. Fill in the details
            below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.root ? (
            <p className="text-sm text-destructive">{errors.root}</p>
          ) : null}

          <TaskFormFields
            idPrefix="add-task"
            values={values}
            onChange={setValues}
            assignees={assignees}
            errors={errors}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
