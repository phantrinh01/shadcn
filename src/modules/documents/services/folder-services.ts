import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
} from "firebase/firestore"

import { db } from "@/lib/firebase/client"
import type { Document } from "./types/document-types"
import type { Folder } from "./types/folder-types"

const FOLDERS_COLLECTION = "folders"
const DOCUMENTS_COLLECTION = "documents"

/**
 * Read all non-deleted folders from Firestore.
 * Soft-deleted folders (`deletedAt != null`) are filtered out.
 */
export async function getFolders(): Promise<Folder[]> {
  const snapshot = await getDocs(collection(db, FOLDERS_COLLECTION))

  const result = snapshot.docs
    .map((folderRef) => {
      const data = folderRef.data() as Folder
      return {
        ...data,
        id: folderRef.id,
      }
    })
    .filter((folderItem) => !folderItem.deletedAt)

  return JSON.parse(JSON.stringify(result))
}

/**
 * Create a new folder. `parentId` is `null` for root folders.
 */
export async function createFolder(folderItem: {
  name: string
  parentId: string | null
  createdBy?: string
}): Promise<Folder> {
  const now = new Date().toISOString()

  const payload = {
    name: folderItem.name.trim(),
    parentId: folderItem.parentId ?? null,
    createdBy: folderItem.createdBy ?? "Unknown",
    createdDate: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  const folderRef = await addDoc(collection(db, FOLDERS_COLLECTION), payload)

  return { ...payload, id: folderRef.id }
}

/**
 * Update a folder (rename).
 */
export async function updateFolder(folderItem: Folder): Promise<Folder> {
  const payload: Folder = {
    ...folderItem,
    name: folderItem.name.trim(),
    updatedAt: new Date().toISOString(),
  }

  await updateDoc(doc(db, FOLDERS_COLLECTION, folderItem.id), payload)

  return payload
}

/**
 * Soft delete a folder — only allowed when the folder is empty:
 * no active sub-folders and no documents assigned to it.
 * Throws a descriptive error otherwise.
 */
export async function deleteFolder(folderId: string): Promise<void> {
  // 1. Reject when the folder still has active sub-folders
  const subFoldersSnapshot = await getDocs(
    query(collection(db, FOLDERS_COLLECTION), where("parentId", "==", folderId))
  )
  const hasSubFolders = subFoldersSnapshot.docs.some(
    (folderRef) => !folderRef.data().deletedAt
  )
  if (hasSubFolders) {
    throw new Error(
      "Thư mục còn chứa thư mục con. Hãy xóa hoặc di chuyển các thư mục con trước."
    )
  }

  // 2. Reject when the folder still has documents
  const documentsSnapshot = await getDocs(
    query(
      collection(db, DOCUMENTS_COLLECTION),
      where("folderId", "==", folderId)
    )
  )
  const hasDocuments = documentsSnapshot.docs.some(
    (documentRef) => !(documentRef.data() as Document).deletedAt
  )
  if (hasDocuments) {
    throw new Error(
      "Thư mục còn chứa tài liệu. Hãy xóa hoặc di chuyển các tài liệu trước."
    )
  }

  // 3. Soft delete
  const folderRef = doc(db, FOLDERS_COLLECTION, folderId)
  await updateDoc(folderRef, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
