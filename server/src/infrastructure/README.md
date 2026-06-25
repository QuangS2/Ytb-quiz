# Infrastructure Layer

Tầng Hạ Tầng. Chứa toàn bộ các cài đặt kỹ thuật, thư viện, framework, kết nối bên ngoài.

## Nội dung chính:
- **Persistence**: Các Mongoose schema và repositories cụ thể (Adapters) hiện thực hóa database ports.
- **AI Service**: Các adapter kết nối Google Gemini API.
- **Audio Service**: Adapter trích xuất luồng âm thanh YouTube.
- **Security**: Cấu hình Google OAuth, các bộ mã hóa và xác thực JWT.
