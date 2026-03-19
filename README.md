# Study Note Dashboard V3.7.2

Bản này là gói sửa lỗi đầy đủ từ source gốc, giữ nguyên storage key để tránh mất dữ liệu cũ.

## Đã sửa

- bổ sung đủ icon 16/32/48/128 để manifest nạp được
- giữ nguyên `key` của extension để không đổi ID khi reload cùng thư mục
- tăng độ tương thích `chrome.storage.local` bằng callback wrapper
- gia cố popup/options/background để không văng lỗi khi `StudyStore` chưa sẵn sàng
- giữ lại toàn bộ file gốc, gồm cả `app.js` và `permtest.txt`, để bộ source không bị thiếu file

## Cách cập nhật

1. Giải nén thư mục này.
2. Chép đè vào đúng thư mục extension cũ.
3. Vào `chrome://extensions`.
4. Bấm `Reload`.
5. Không bấm `Remove` nếu bạn muốn giữ dữ liệu đang có.
