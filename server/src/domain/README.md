# Domain Layer

Tầng Nghiệp Vụ Cốt Lõi. Đây là tầng trung tâm của hệ thống, chứa các quy tắc nghiệp vụ bất biến.

## Quy tắc quan trọng:
- **KHÔNG** import bất kỳ thư viện bên ngoài nào (ngoại trừ các utility thuần của TypeScript/JavaScript).
- Không phụ thuộc vào Express, Mongoose, hay bất kỳ framework nào.
- Chứa các thực thể cốt lõi (`Entities`) và đối tượng giá trị (`Value Objects`).
