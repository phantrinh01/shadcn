"use client"

import { ListTodo } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

export function TaskViewSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function TaskEmptyState() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListTodo />
        </EmptyMedia>
        <EmptyTitle>Không có task nào</EmptyTitle>
        <EmptyDescription>
          Chưa có task nào khớp bộ lọc hiện tại. Thử đổi bộ lọc hoặc thêm task
          mới.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
