# Validation v4

## Popup fixes
- Tách `popup.css` riêng để popup không còn phụ thuộc vào media query của `styles.css`.
- Khóa cứng chiều rộng popup ở `420px` bằng cả CSS riêng lẫn inline style trong `popup.html`.
- Loại bỏ nguyên nhân co cụm chiều ngang khi viewport popup nhỏ.
- Bọc toàn bộ `popup.js` bằng `try/catch` và hiện lỗi ngay trong popup nếu script hỏng.

## Root cause
Bản trước vẫn còn media query `@media (max-width: 440px)` cho popup. Khi popup khởi tạo với viewport hẹp, CSS đó hạ `min-width` về `0`, làm popup co lại thành một cột rất nhỏ.
