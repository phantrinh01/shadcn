import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Minus,
  PlayCircle,
} from "lucide-react"

import type { TaskPriority, TaskStatus } from "./types/task-types"

export const statuses: {
  value: TaskStatus
  label: string
  icon: typeof Circle
}[] = [
  { value: "todo", label: "To Do", icon: Circle },
  { value: "in_progress", label: "In Progress", icon: PlayCircle },
  { value: "done", label: "Done", icon: CheckCircle2 },
]

export const priorities: {
  value: TaskPriority
  label: string
  icon: typeof Minus
}[] = [
  { value: "low", label: "Low", icon: ChevronDown },
  { value: "medium", label: "Medium", icon: Minus },
  { value: "high", label: "High", icon: ChevronUp },
]
