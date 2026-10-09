"use client"

import { CalendarDays, Columns3, LayoutGrid, Table2 } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const TASK_VIEWS = ["table", "board", "grid", "calendar"] as const
export type TaskView = (typeof TASK_VIEWS)[number]

export function parseTaskView(value: string | null): TaskView {
  return TASK_VIEWS.includes(value as TaskView) ? (value as TaskView) : "table"
}

const options: { value: TaskView; label: string; icon: typeof Table2 }[] = [
  { value: "table", label: "Table", icon: Table2 },
  { value: "board", label: "Board", icon: Columns3 },
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
]

interface ViewSwitcherProps {
  value: TaskView
  onChange: (view: TaskView) => void
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      // Radix trả về "" khi bấm lại item đang chọn → bỏ qua.
      onValueChange={(next) => next && onChange(next as TaskView)}
      aria-label="Chế độ hiển thị"
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <ToggleGroupItem
          key={optionValue}
          value={optionValue}
          aria-label={label}
          className="cursor-pointer px-2.5"
        >
          <Icon className="size-4" />
          <span className="hidden lg:block">{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
