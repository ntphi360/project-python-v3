# MSSQL Data Skill

## Purpose
Sử dụng cho Microsoft SQL Server, Pandas, import/export và xử lý dữ liệu.

## Database
- Database: Microsoft SQL Server.
- Không hard-code connection string.
- Không lưu password database trong source code.
- Sử dụng environment variables cho connection config.

## Query Rules
- Không tạo SQL bằng string concatenation từ user input.
- Không sử dụng f-string để nhúng input vào SQL.
- Sử dụng parameterized query hoặc SQLAlchemy.
- Chỉ select các field cần thiết khi phù hợp.

## Schema
Các nhóm dữ liệu chính:
- Department
- User
- Procedure
- Case
- Case History
- Notification

Không tự ý thêm hoặc xóa bảng nếu task không yêu cầu.

## Migration
- Thay đổi schema phải có migration/script rõ ràng.
- Không chỉnh production schema bằng code ad-hoc.
- Không xóa dữ liệu nếu chưa được yêu cầu.

## Pandas
Pandas chủ yếu dùng cho:
- Đọc CSV.
- Đọc Excel.
- Kiểm tra dữ liệu import.
- Chuyển đổi dữ liệu phù hợp trước khi lưu.
- Hỗ trợ thống kê dữ liệu khi task yêu cầu.

Không sử dụng Pandas cho logic CRUD thông thường nếu không cần.

## Import
Flow ưu tiên:

File
→ đọc dữ liệu
→ validate
→ preview
→ xác nhận
→ lưu database

Không tự ý sửa dữ liệu nguồn.

## Export
- Hỗ trợ CSV / Excel.
- Export theo filter hiện tại nếu task yêu cầu.
- Không tạo dữ liệu giả.
- PDF chỉ triển khai khi task yêu cầu.

## Data Integrity
- Kiểm tra foreign key.
- Kiểm tra required field.
- Kiểm tra duplicate khi nghiệp vụ yêu cầu.
- Không ghi dữ liệu không hợp lệ vào database.