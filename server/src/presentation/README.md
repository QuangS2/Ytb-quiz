# Presentation Layer

Tầng Giao Tiếp Ngoài. Định nghĩa cách hệ thống giao tiếp với thế giới bên ngoài (qua HTTP REST APIs).

## Nội dung chính:
- **Controllers**: Lớp xử lý yêu cầu HTTP đầu vào và định cấu hình API.
- **Request / Response**: Các định nghĩa đầu vào/đầu ra và validation schema (Zod).
- **Middlewares**: Các bộ lọc phân quyền, JWT checks và global exception handler.
- **app.ts**: Khởi tạo Express app và bắt đầu lắng nghe cổng.
