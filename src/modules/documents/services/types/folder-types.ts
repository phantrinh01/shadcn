import { z } from "zod"

/**
 * A folder used to organize documents in a tree hierarchy.
 * Stored in the Firestore `folders` collection. Folders with
 * `parentId == null` are root folders; others nest under their parent.
 */
export const folderSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, "Tên thư mục không được để trống")
    .max(100, "Tên thư mục không được vượt quá 100 ký tự"),
  /** Parent folder id — `null` for root folders. */
  parentId: z.string().nullable().optional(),
  createdBy: z.string().optional(),
  createdDate: z.unknown().optional(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  deletedAt: z.unknown().nullable().optional(),
})

export type Folder = z.infer<typeof folderSchema>

export const folderFormSchema = z.object({
  name: z
    .string()
    .min(1, "Tên thư mục không được để trống")
    .max(100, "Tên thư mục không được vượt quá 100 ký tự"),
})

export type FolderFormData = z.infer<typeof folderFormSchema>

export interface FolderSelectOption {
  id: string
  name: string
  depth: number
}

/**
 * Flatten the folder hierarchy into a depth-ordered list suitable for a
 * `<Select>` (parents always appear before their children).
 */
export function flattenFoldersForSelect(
  folders: Folder[]
): FolderSelectOption[] {
  const childrenMap = new Map<string | null, Folder[]>()

  for (const folder of folders) {
    const key = folder.parentId ?? null
    const siblings = childrenMap.get(key) ?? []
    siblings.push(folder)
    childrenMap.set(key, siblings)
  }

  const sortByName = (list: Folder[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"))

  const result: FolderSelectOption[] = []

  const walk = (parentId: string | null, depth: number) => {
    const children = sortByName(childrenMap.get(parentId) ?? [])
    for (const folder of children) {
      result.push({ id: folder.id, name: folder.name, depth })
      walk(folder.id, depth + 1)
    }
  }

  walk(null, 0)
  return result
}
