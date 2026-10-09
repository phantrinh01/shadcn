# Tasks – Features

## Đính kèm file (Task attachments)

Đính kèm tài liệu, ảnh, PDF vào từng task bằng Firebase Storage + Firestore.

### Quy tắc

- Tối đa **50MB/file** (`MAX_FILE_SIZE`).
- Chặn `.exe`, `.sh`, `.bat` (`BLOCKED_EXTENSIONS`): kiểm tra đuôi file (không phân biệt hoa/thường) và MIME type; chặn file trống.
- Validate ở client (`validateFile`) và trong `storage.rules` (rules ép dung lượng + chặn đuôi file theo tên, chỉ là bổ sung).

### Dữ liệu

- Firestore: mảng `attachments` trong `tasks/{taskId}`.
  `{ id, name, size, contentType, storagePath, downloadUrl, uploadedBy, uploadedAt }`
- `uploadedAt` lưu bằng `Timestamp.now()` (không dùng `serverTimestamp()` vì không được đặt trong mảng); service chuyển thành ISO string.
- Storage path: `tasks/{taskId}/{fileId}-{safeName}` (tên file được sanitize).

### Code

| File | Vai trò |
| ---- | ------- |
| `src/modules/tasks/services/types/task-types.ts` | `attachmentSchema`, `MAX_FILE_SIZE`, `BLOCKED_EXTENSIONS`, `attachments` trong `taskSchema` |
| `src/modules/tasks/services/task-attachment-services.ts` | `validateFile()`, `uploadAttachment()`, `deleteAttachment()` |
| `src/modules/tasks/services/task-services.ts` | Map `attachments` từ Firestore; export `TASKS_COLLECTION`, `waitForAuth` |
| `src/modules/tasks/components/task-attachments.tsx` | `TaskAttachments` (task đã có: dropzone, progress, tải xuống, xoá) và `PendingAttachments` (hàng đợi ở form tạo task) |
| `src/modules/tasks/components/add-task-modal.tsx` | Chọn file khi tạo task; upload sau khi task được tạo |
| `src/modules/tasks/components/task-edit-dialog.tsx` | Quản lý file của task trong Edit Task (Table, Grid, Board, Calendar) |
| `src/app/(private)/tasks/page.tsx` | `handleAddTask(input, files)` và `handleAttachmentsChange` cập nhật state cục bộ |
| `storage.rules` | Chỉ cho `tasks/{taskId}/{fileName}`: cần đăng nhập, `< 50MB`, chặn `.exe/.sh/.bat` |

### Hành vi quan trọng

- Không dùng `onSnapshot`; CRUD cập nhật bằng state cục bộ/callback.
- Upload lỗi ở Firestore → xoá file vừa upload khỏi Storage (không để file mồ côi).
- Xoá: gỡ metadata Firestore trước (transaction), sau đó mới xoá file Storage; Firestore lỗi thì file giữ nguyên.
- Tạo task kèm file: task vẫn được tạo nếu một file upload lỗi; toast báo file nào lỗi để thêm lại trong Edit Task.
- Toast lỗi upload hiển thị kèm mã lỗi Firebase (vd. `storage/unauthorized`) để chẩn đoán.

### Trạng thái kiểm tra

- ✅ `npx tsc --noEmit` sạch.
- ✅ `npm run build` thành công.
- ✅ Bucket `shadcn-434b6.firebasestorage.app` tồn tại (trả 403 với request chưa đăng nhập).
- ⚠️ Upload thật chưa xác nhận thành công: trên bản chạy thực tế toast báo "Không thể tải lên…". Nguyên nhân chưa xác định, cần mã lỗi trong toast/Console.
- ⏳ Chưa xác nhận: `storage.rules` mới đã được deploy (`npx firebase-tools deploy --only storage --project shadcn-434b6`, hoặc dán vào Firebase Console → Storage → Rules).
- ⏳ Chưa kiểm tra trong dev: file hợp lệ ✔, file 51MB ✘, `.exe`/`.sh`/`.bat` ✘, xoá ✔.
- `npm run lint` hỏng sẵn do lỗi cấu hình ESLint (circular JSON), không liên quan tính năng.
