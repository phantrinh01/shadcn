import {
  arrayUnion,
  doc,
  runTransaction,
  Timestamp,
  updateDoc,
} from "firebase/firestore"
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage"

import { auth, db, storage } from "@/lib/firebase/client"
import { TASKS_COLLECTION, waitForAuth } from "./task-services"
import {
  BLOCKED_EXTENSIONS,
  MAX_FILE_SIZE,
  type Attachment,
} from "./types/task-types"

// MIME type của file thực thi/script phổ biến. Đuôi file mới là chốt chặn
// chính; MIME chỉ bổ sung vì trình duyệt có thể để trống hoặc đoán sai.
const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-dosexec",
  "application/x-executable",
  "application/x-sh",
  "application/x-shellscript",
  "application/x-bat",
  "application/x-msdos-batch",
  "text/x-shellscript",
  "text/x-sh",
])

function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase()
}

/** Bỏ ký tự đường dẫn / ký tự lạ để tên an toàn khi làm Storage path. */
function sanitizeFileName(fileName: string): string {
  const safe = fileName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[._]+/, "")
    .slice(-100)
  return safe || "file"
}

/** Trả về thông báo lỗi tiếng Việt, hoặc `null` nếu file hợp lệ. */
export function validateFile(file: File): string | null {
  const extension = getExtension(file.name)
  if (
    BLOCKED_EXTENSIONS.includes(extension) ||
    BLOCKED_MIME_TYPES.has(file.type.toLowerCase())
  ) {
    return `Không cho phép tải lên file .${extension || "thực thi"} ("${file.name}").`
  }
  if (file.size === 0) {
    return `File "${file.name}" trống.`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" vượt quá dung lượng tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB.`
  }
  return null
}

/**
 * Upload file lên Storage rồi thêm metadata vào `tasks/{taskId}.attachments`.
 * Nếu ghi Firestore lỗi thì xoá file vừa upload để không bị mồ côi.
 */
export async function uploadAttachment(
  taskId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<Attachment> {
  const error = validateFile(file)
  if (error) throw new Error(error)

  await waitForAuth()
  const user = auth.currentUser
  if (!user) throw new Error("Chưa đăng nhập Firebase. Vui lòng đăng nhập lại.")

  const fileId = crypto.randomUUID()
  const storagePath = `tasks/${taskId}/${fileId}-${sanitizeFileName(file.name)}`
  const storageRef = ref(storage, storagePath)
  const contentType = file.type || "application/octet-stream"

  await new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType })
    uploadTask.on(
      "state_changed",
      (snapshot) =>
        onProgress?.(
          Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        ),
      reject,
      () => resolve()
    )
  })

  try {
    const downloadUrl = await getDownloadURL(storageRef)
    const uploadedAt = Timestamp.now()
    const attachment = {
      id: fileId,
      name: file.name,
      size: file.size,
      contentType,
      storagePath,
      downloadUrl,
      uploadedBy: user.uid,
    }

    await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
      attachments: arrayUnion({ ...attachment, uploadedAt }),
    })

    return { ...attachment, uploadedAt: uploadedAt.toDate().toISOString() }
  } catch (firestoreError) {
    await deleteObject(storageRef).catch(() => undefined)
    throw firestoreError
  }
}

/**
 * Gỡ metadata khỏi Firestore trước, rồi mới xoá file trong Storage — nếu
 * Firestore lỗi thì file vẫn còn nguyên và attachment vẫn trỏ tới được.
 */
export async function deleteAttachment(
  taskId: string,
  attachment: Attachment
): Promise<void> {
  await waitForAuth()
  const taskRef = doc(db, TASKS_COLLECTION, taskId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(taskRef)
    const current: Array<{ id: string }> = snapshot.data()?.attachments ?? []
    transaction.update(taskRef, {
      attachments: current.filter((item) => item.id !== attachment.id),
    })
  })

  try {
    await deleteObject(ref(storage, attachment.storagePath))
  } catch (storageError) {
    if ((storageError as { code?: string }).code !== "storage/object-not-found")
      console.error("[tasks] Failed to delete storage file", storageError)
  }
}
