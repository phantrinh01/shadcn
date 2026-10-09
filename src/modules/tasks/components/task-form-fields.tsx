"use client"

import { format } from "date-fns"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { priorities, statuses } from "@/modules/tasks/services/task-options"
import {
  TASK_TITLE_MAX_LENGTH,
  taskInputSchema,
  type Task,
  type TaskAssignee,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
} from "@/modules/tasks/services/types/task-types"

const UNASSIGNED = "__unassigned__"

/** Form state — everything is a string so inputs stay controlled. */
export interface TaskFormValues {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
  due_date: string // yyyy-MM-dd
  tags: string // comma separated
}

export const emptyTaskForm: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assignee: UNASSIGNED,
  due_date: "",
  tags: "",
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assignee: task.assignee || UNASSIGNED,
    due_date: task.due_date
      ? format(new Date(task.due_date), "yyyy-MM-dd")
      : "",
    tags: (task.tags ?? []).join(", "),
  }
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  )
}

/** Validate + convert form values to a `TaskInput`. Returns field errors on failure. */
export function parseTaskForm(
  values: TaskFormValues
):
  | { success: true; data: TaskInput }
  | { success: false; errors: Record<string, string> } {
  const result = taskInputSchema.safeParse({
    title: values.title,
    description: values.description.trim(),
    status: values.status,
    priority: values.priority,
    assignee: values.assignee === UNASSIGNED ? null : values.assignee,
    due_date: values.due_date
      ? new Date(`${values.due_date}T00:00:00`).toISOString()
      : null,
    tags: parseTags(values.tags),
  })

  if (result.success) return { success: true, data: result.data }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "root")
    errors[key] ??= issue.message
  }
  return { success: false, errors }
}

interface TaskFormFieldsProps {
  idPrefix: string
  values: TaskFormValues
  onChange: (values: TaskFormValues) => void
  assignees: TaskAssignee[]
  errors?: Record<string, string>
}

export function TaskFormFields({
  idPrefix,
  values,
  onChange,
  assignees,
  errors = {},
}: TaskFormFieldsProps) {
  const set = <K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K]
  ) => onChange({ ...values, [key]: value })

  // Keep an assignee that is no longer in the user list selectable.
  const hasUnknownAssignee =
    values.assignee !== UNASSIGNED &&
    !assignees.some((member) => member.uid === values.assignee)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Title *</Label>
        <Input
          id={`${idPrefix}-title`}
          placeholder="Enter task title..."
          maxLength={TASK_TITLE_MAX_LENGTH}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          placeholder="Detailed requirements..."
          rows={3}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={values.status}
            onValueChange={(value) => set("status", value as TaskStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  <div className="flex items-center">
                    <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {status.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={values.priority}
            onValueChange={(value) => set("priority", value as TaskPriority)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Assignee</Label>
          <Select
            value={values.assignee}
            onValueChange={(value) => set("assignee", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {assignees.map((member) => (
                <SelectItem key={member.uid} value={member.uid}>
                  {member.name}
                </SelectItem>
              ))}
              {hasUnknownAssignee && (
                <SelectItem value={values.assignee}>
                  {values.assignee}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-due-date`}>Due date</Label>
          <Input
            id={`${idPrefix}-due-date`}
            type="date"
            value={values.due_date}
            onChange={(e) => set("due_date", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-tags`}>Tags</Label>
        <Input
          id={`${idPrefix}-tags`}
          placeholder="bug, frontend, urgent"
          value={values.tags}
          onChange={(e) => set("tags", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Phân tách các tag bằng dấu phẩy.
        </p>
      </div>
    </div>
  )
}
