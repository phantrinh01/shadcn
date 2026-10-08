import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage"

import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore"

import { db, storage } from "@/lib/firebase/client"
import type { DocumentAttachment } from "./types/document-types"

const COLLECTION_PATH = "documents"
const ATTACHMENTS_SUBCOLLECTION = "attachments"

function getAttachmentsCollectionPath(documentId: string): string {
  return `${COLLECTION_PATH}/${documentId}/${ATTACHMENTS_SUBCOLLECTION}`
}

function getStorageBasePath(documentId: string): string {
  return `${COLLECTION_PATH}/${documentId}/attachments`
}

/**
 * Convert a raw file name into a storage-safe name:
 * strip diacritics (Vietnamese support), lowercase, replace runs of
 * non-alphanumeric characters with a single dash, keep the extension.
 *
 * e.g. "Báo Cáo Tổng Kết Q2.pdf" → "bao-cao-tong-ket-q2.pdf"
 */
export function toSafeFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  const base = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex)
  const ext = dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase()

  const safeBase =
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "file"

  return ext ? `${safeBase}.${ext}` : safeBase
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadProgress {
  fileName: string
  progress: number // 0–100
  state: "running" | "paused" | "success" | "error"
  error?: string
}

export interface UploadResult {
  attachment: DocumentAttachment
}

/**
 * Upload a single file to Storage under `documents/{docId}/attachments/{fileName}`,
 * then write the metadata to the corresponding Firestore subcollection.
 *
 * @param documentId       the parent document ID
 * @param file             the File object from the input
 * @param onProgress       optional callback called during upload (0-100)
 */
export async function uploadFileToDocument(
  documentId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const safeName = toSafeFileName(file.name)
  const storagePath = `${getStorageBasePath(documentId)}/${safeName}`
  const storageRef = ref(storage, storagePath)

  // Upload to Firebase Storage
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise<UploadResult>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        )
        onProgress?.(pct)
      },
      (error) => {
        reject(error)
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)

          // Write metadata to Firestore subcollection
          const attachmentId = encodeURIComponent(file.name)
          const attachmentRef = doc(
            db,
            getAttachmentsCollectionPath(documentId),
            attachmentId
          )

          const attachment: DocumentAttachment = {
            name: file.name,
            url: downloadUrl,
            size: file.size,
            contentType: file.type,
            uploadedAt: new Date().toISOString(),
          }

          await setDoc(attachmentRef, attachment)

          resolve({ attachment })
        } catch (writeError) {
          reject(writeError)
        }
      }
    )
  })
}

/**
 * Upload multiple files in parallel (up to 3 concurrent uploads to avoid
 * saturating bandwidth). Returns an array of results; failed files are
 * skipped — caller should inspect per-file errors.
 */
export async function uploadFilesToDocument(
  documentId: string,
  files: File[],
  onFileProgress?: (fileName: string, pct: number) => void
): Promise<UploadResult[]> {
  const CONCURRENCY = 3
  const results: UploadResult[] = []

  // Process in batches of CONCURRENCY
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY)

    const batchResults = await Promise.allSettled(
      batch.map((file) =>
        uploadFileToDocument(documentId, file, (pct) =>
          onFileProgress?.(file.name, pct)
        )
      )
    )

    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        results.push(result.value)
      } else {
        console.error(
          `[DocumentFileServices] Failed to upload ${batch[idx].name}:`,
          result.reason
        )
      }
    })
  }

  return results
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * List all attachments for a document from the Firestore subcollection.
 */
export async function listDocumentAttachments(
  documentId: string
): Promise<DocumentAttachment[]> {
  const snapshot = await getDocs(
    collection(db, getAttachmentsCollectionPath(documentId))
  )

  return snapshot.docs.map((d) => d.data() as DocumentAttachment)
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Delete a file from both Storage and the Firestore attachments subcollection.
 *
 * @param documentId  parent document ID
 * @param fileName    the original file name (used as the Storage path & Firestore doc ID)
 */
export async function deleteDocumentFile(
  documentId: string,
  fileName: string
): Promise<void> {
  const attachmentId = encodeURIComponent(fileName)

  // 1. Delete Storage file (uses the same safe name as upload)
  const safeName = toSafeFileName(fileName)
  const storagePath = `${getStorageBasePath(documentId)}/${safeName}`
  const storageRef = ref(storage, storagePath)
  try {
    await deleteObject(storageRef)
  } catch (err) {
    // If the file doesn't exist in Storage (e.g. already deleted) just log
    console.warn(
      `[DocumentFileServices] Could not delete Storage file ${storagePath}:`,
      err
    )
  }

  // 2. Delete Firestore metadata doc
  await deleteDoc(
    doc(db, getAttachmentsCollectionPath(documentId), attachmentId)
  )
}
