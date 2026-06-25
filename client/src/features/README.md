# Features Folder

Thư mục chứa các module tính năng độc lập của ứng dụng:
- **auth**: Quản lý đăng nhập Google, quản lý token, bảo vệ Route.
- **quiz**: Tạo quiz mới, làm quiz (Full Test & Instant Feedback), xem kết quả.
- **history**: Hiển thị bảng xếp hạng, lịch sử thi và biểu đồ thống kê.

## Cấu trúc chuẩn của một Feature:
- `components/`: Component dành riêng cho feature.
- `hooks/`: Custom Hooks quản lý state/API của feature.
- `services/`: Lệnh gọi API cụ thể cho feature.
- `types/`: Kiểu dữ liệu riêng của feature.
