import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
} from "firebase/firestore"

import { onAuthStateChanged } from "firebase/auth"

import { auth, db } from "@/lib/firebase/client"
import { isTaskOverdue } from "./task-dates"
import { taskMockData } from "./task-mock-data"
import { taskSchema, type Task, type TaskInput } from "./types/task-types"

export const TASKS_COLLECTION = "tasks"

// firestore.rules yêu cầu request.auth != null cho `tasks`, nên phải đợi
// Firebase Auth khôi phục session trước khi gọi Firestore.
let authReady: Promise<void> | null = null

export function waitForAuth(): Promise<void> {
  authReady ??= new Promise<void>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      if (user) resolve()
      else {
        authReady = null
        reject(new Error("Chưa đăng nhập Firebase. Vui lòng đăng nhập lại."))
      }
    })
  })
  return authReady
}

// =====================================================
// Mapping: Firestore document <-> Task (UI model)
// Timestamps are stored as Firestore `Timestamp` and exposed as ISO strings.
// =====================================================

function toIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === "string") return value
  return undefined
}

function fromFirestore(id: string, data: DocumentData): Task | null {
  const parsed = taskSchema.safeParse({
    id,
    title: data.title,
    priority: data.priority,
    status: data.status,
    assignee: data.assignee ?? null,
    due_date: toIso(data.due_date) ?? null,
    description: data.description ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    attachments: Array.isArray(data.attachments)
      ? data.attachments.map((item: DocumentData) => ({
          ...item,
          uploadedAt: toIso(item.uploadedAt) ?? "",
        }))
      : [],
    created_at: toIso(data.created_at),
    updated_at: toIso(data.updated_at),
  })

  if (!parsed.success) {
    console.warn(`[tasks] Skip invalid task document "${id}"`, parsed.error)
    return null
  }

  return parsed.data
}

function toFirestoreFields(input: TaskInput) {
  return {
    title: input.title.trim(),
    priority: input.priority,
    status: input.status,
    assignee: input.assignee || null,
    due_date: input.due_date
      ? Timestamp.fromDate(new Date(input.due_date))
      : null,
    description: input.description ?? "",
    tags: input.tags ?? [],
  }
}

// =====================================================
// Queries
// =====================================================

export async function getTasks(): Promise<Task[]> {
  await waitForAuth()
  const snapshot = await getDocs(collection(db, TASKS_COLLECTION))

  return snapshot.docs
    .map((document) => fromFirestore(document.id, document.data()))
    .filter((task): task is Task => task !== null)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
}

/**
 * Seed mock tasks. When `assigneeIds` is given, tasks are distributed
 * round-robin across those user ids so `assignee` points to real users.
 */
export async function seedTasksWithClient(
  assigneeIds: string[] = []
): Promise<Task[]> {
  await waitForAuth()
  const batch = writeBatch(db)

  taskMockData.forEach((task, index) => {
    const { id, created_at, updated_at, ...input } = task
    const assignee = assigneeIds.length
      ? assigneeIds[index % assigneeIds.length]
      : null

    batch.set(
      doc(db, TASKS_COLLECTION, id),
      {
        ...toFirestoreFields({ ...input, assignee }),
        created_at: created_at
          ? Timestamp.fromDate(new Date(created_at))
          : serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true }
    )
  })

  await batch.commit()
  return getTasks()
}

// =====================================================
// Mutations
// =====================================================

export async function createTask(input: TaskInput): Promise<Task> {
  await waitForAuth()
  const ref = doc(collection(db, TASKS_COLLECTION))

  await setDoc(ref, {
    ...toFirestoreFields(input),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })

  const now = new Date().toISOString()
  return {
    ...input,
    id: ref.id,
    attachments: [],
    created_at: now,
    updated_at: now,
  }
}

export async function updateTask(task: Task): Promise<Task> {
  await waitForAuth()
  const { id, created_at: _createdAt, updated_at: _updatedAt, ...input } = task

  await updateDoc(doc(db, TASKS_COLLECTION, id), {
    ...toFirestoreFields(input),
    updated_at: serverTimestamp(),
  })

  return { ...task, updated_at: new Date().toISOString() }
}

export async function deleteTask(taskId: string): Promise<void> {
  await waitForAuth()
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId))
}

export function getTaskStats(tasks: Task[]) {
  return {
    total: tasks.length,
    done: tasks.filter((task) => task.status === "done").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    todo: tasks.filter((task) => task.status === "todo").length,
    overdue: tasks.filter((task) => isTaskOverdue(task)).length,
  }
}
