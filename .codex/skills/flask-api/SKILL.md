# Flask API Skill

## Purpose
Sử dụng khi phát triển backend REST API bằng Flask.

## Stack
- Python
- Flask
- Microsoft SQL Server

## Architecture
Ưu tiên:
- app factory
- routes
- services
- models
- utils

Không tạo kiến trúc phức tạp nếu project chưa cần.

## Route Rules
- Route xử lý HTTP request/response.
- Không nhồi business logic lớn vào route.
- Business logic nên đặt trong service phù hợp.
- API trả JSON nhất quán.
- Sử dụng HTTP status phù hợp.

## Validation
- Validate dữ liệu đầu vào.
- Không tin dữ liệu từ frontend.
- Trả validation error rõ ràng.
- Không trả stack trace cho client.

## Security
- Không hard-code password hoặc secret.
- Config nhạy cảm dùng environment variables.
- Backend phải enforce permission.
- Không dựa vào việc frontend ẩn button để bảo vệ API.
- Không tự ý triển khai JWT nếu task chưa yêu cầu.

## Database
- Không nối chuỗi SQL trực tiếp từ input.
- Dùng parameterized query hoặc ORM phù hợp.
- Không tự ý thay đổi schema.

## Permission
ADMIN và STAFF phải tuân thủ `skill/SKILL.md`.

## Completion
- Test endpoint vừa tạo.
- Kiểm tra status code.
- Kiểm tra validation.
- Kiểm tra permission nếu có.
- Không làm hỏng endpoint hiện tại.