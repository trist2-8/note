# Study Note Dashboard V3 Stable

Bản ổn định để dùng lâu dài, có khóa ID extension để giảm rủi ro mất dữ liệu khi cập nhật.

## Điểm mới quan trọng
- Giữ **ID extension cố định** bằng `manifest.key`
- Backup tự động khi nâng version
- Migration dữ liệu từ các bản cũ nếu còn cùng storage cũ
- Backup thủ công / khôi phục / import / export JSON
- Giữ nguyên dashboard V3 theo giao diện đã chốt

## Cách cài đặt an toàn
1. Giải nén thư mục này
2. Mở `chrome://extensions` hoặc `edge://extensions`
3. Bật **Developer mode**
4. Chọn **Load unpacked**
5. Chọn thư mục `study-note-extension-v3-keyed-stable`

## Cách cập nhật mà giữ dữ liệu
- Từ bản này trở đi, hãy **chép đè file mới vào cùng thư mục extension**
- Sau đó bấm **Reload** trong trang extensions
- Không nên bấm **Remove** nếu bạn muốn giữ dữ liệu trong `chrome.storage.local`

## Ghi chú
- Nếu dữ liệu cũ thuộc một extension có ID khác hẳn, Chrome không tự truy cập chéo sang storage cũ được.
- Trong trường hợp đó, hãy dùng file backup/export JSON để nhập lại dữ liệu.
